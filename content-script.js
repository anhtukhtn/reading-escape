// ============================================================================
// READING ESCAPE MODE - Content Script
// ============================================================================

// Configuration constants
const CSS_CLASSES = {
  active: 'reading-escape-mode-active',
  wrapper: 'reading-escape-wrapper',
  content: 'reading-escape-content',
  wide: 'reading-escape-wide'
};

// Default selector arrays
const DEFAULT_CONTENT_SELECTORS = [
  '.article-content', 'article', '[role="main"]', 'main', '.content',
  '.post-content', '.entry-content', '.story-body', '.text-content',
  '#content', '.article-body', '.post-body', '.main-content',
  '.article-wrapper', '.content-wrapper', '#hnmain',
  '.page-content', '.page-content.spacer-md', '.page-content__content'
];

const DEFAULT_COMMENT_SELECTORS = [
  '.comments', '.comment-section', '.comments-section', '#comments',
  '.disqus-thread', '.fb-comments', '.comment-list', '.comments-area',
  '.comment-wrapper', '.discussion', '.comment-container', '#bigbox',
  '.comments__wrapper', '.comments__container'
];

const DEFAULT_EXCLUDE_SELECTORS = [
  // Advertisement elements
  '.advertisement', '.ads', '.ad', '.sponsored', '.promo', '.banner-ad', '.ad-banner',
  '.google-ads', '.adsense', '.ad-container', '.ad-wrapper', '.ad-space', '.ad-block',
  '[class*="ad-"]', '[class*="ads"]', '[id*="ad-"]', '[id*="ads"]',
  '[class*="sponsored"]', '[id*="sponsored"]', '[class*="promo"]', '[id*="promo"]',
  '[data-ad]', '[data-ads]', '[data-google-ad]', 'ins.adsbygoogle',
  '.adnxs', '.doubleclick', '.googlesyndication', '.amazon-ads'
];

// Default settings (will be overridden by user preferences)
const DEFAULT_SETTINGS = {
  readingModes: [
    { name: 'Narrow', width: 700, enabled: true },
  ],
  preserveComments: true,
  minContentLength: 100,
  grayoutBackground: true,
  grayoutAmount: 0.2,
  contentSelectors: DEFAULT_CONTENT_SELECTORS,
  commentSelectors: DEFAULT_COMMENT_SELECTORS,
  excludeSelectors: DEFAULT_EXCLUDE_SELECTORS
};

let currentSettings = { ...DEFAULT_SETTINGS };

// ============================================================================
// SELECTOR ACCESS HELPERS WITH CACHING
// ============================================================================

// Cached selector access for performance
const SelectorCache = {
  contentSelectors: null,
  commentSelectors: null,
  excludeSelectors: null,
  
  invalidate() {
    this.contentSelectors = null;
    this.commentSelectors = null;
    this.excludeSelectors = null;
  }
};

// Optimized selector access with caching
const getContentSelectors = () => {
  if (!SelectorCache.contentSelectors) {
    SelectorCache.contentSelectors = currentSettings.contentSelectors || DEFAULT_CONTENT_SELECTORS;
  }
  return SelectorCache.contentSelectors;
};

const getCommentSelectors = () => {
  if (!SelectorCache.commentSelectors) {
    SelectorCache.commentSelectors = currentSettings.commentSelectors || DEFAULT_COMMENT_SELECTORS;
  }
  return SelectorCache.commentSelectors;
};

const getExcludeSelectors = () => {
  if (!SelectorCache.excludeSelectors) {
    SelectorCache.excludeSelectors = currentSettings.excludeSelectors || DEFAULT_EXCLUDE_SELECTORS;
  }
  return SelectorCache.excludeSelectors;
};

// ============================================================================
// BACKGROUND GRAYOUT MANAGEMENT
// ============================================================================

const BackgroundGrayout = {
  originalBackgroundColor: null,
  isApplied: false,

  init() {
    // Store the original background color
    this.originalBackgroundColor = window.getComputedStyle(document.body).backgroundColor;
    
    // Apply grayout if enabled
    if (currentSettings.grayoutBackground) {
      this.apply();
    }
  },

  apply() {
    if (this.isApplied) return;

    const currentBg = window.getComputedStyle(document.body).backgroundColor;
    const darkerBg = this.darkenColor(currentBg, currentSettings.grayoutAmount);
    
    if (darkerBg) {
      document.body.style.setProperty('background-color', darkerBg, 'important');
      this.isApplied = true;
    }
  },

  remove() {
    if (!this.isApplied) return;

    if (this.originalBackgroundColor) {
      document.body.style.setProperty('background-color', this.originalBackgroundColor, 'important');
    } else {
      document.body.style.removeProperty('background-color');
    }
    this.isApplied = false;
  },

  toggle(enabled) {
    if (enabled) {
      this.apply();
    } else {
      this.remove();
    }
  },

  darkenColor(color, amount) {
    // Handle different color formats
    if (!color || color === 'transparent' || color === 'inherit') {
      color = '#ffffff'; // Default to white if no background
    }

    // Convert to RGB
    let rgb = this.parseColor(color);
    if (!rgb) return null;

    // Darken by reducing each component
    rgb.r = Math.max(0, Math.floor(rgb.r * (1 - amount)));
    rgb.g = Math.max(0, Math.floor(rgb.g * (1 - amount)));
    rgb.b = Math.max(0, Math.floor(rgb.b * (1 - amount)));

    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  },

  parseColor(color) {
    // Handle rgb() format
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]),
        g: parseInt(rgbMatch[2]),
        b: parseInt(rgbMatch[3])
      };
    }

    // Handle rgba() format
    const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
    if (rgbaMatch) {
      return {
        r: parseInt(rgbaMatch[1]),
        g: parseInt(rgbaMatch[2]),
        b: parseInt(rgbaMatch[3])
      };
    }

    // Handle hex format
    const hexMatch = color.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (hexMatch) {
      return {
        r: parseInt(hexMatch[1], 16),
        g: parseInt(hexMatch[2], 16),
        b: parseInt(hexMatch[3], 16)
      };
    }

    // Handle 3-digit hex format
    const hex3Match = color.match(/^#([a-f\d])([a-f\d])([a-f\d])$/i);
    if (hex3Match) {
      return {
        r: parseInt(hex3Match[1] + hex3Match[1], 16),
        g: parseInt(hex3Match[2] + hex3Match[2], 16),
        b: parseInt(hex3Match[3] + hex3Match[3], 16)
      };
    }

    // Handle named colors (common ones)
    const namedColors = {
      'white': { r: 255, g: 255, b: 255 },
      'black': { r: 0, g: 0, b: 0 },
      'red': { r: 255, g: 0, b: 0 },
      'green': { r: 0, g: 128, b: 0 },
      'blue': { r: 0, g: 0, b: 255 },
      'yellow': { r: 255, g: 255, b: 0 },
      'cyan': { r: 0, g: 255, b: 255 },
      'magenta': { r: 255, g: 0, b: 255 },
      'gray': { r: 128, g: 128, b: 128 },
      'grey': { r: 128, g: 128, b: 128 }
    };

    const namedColor = namedColors[color.toLowerCase()];
    if (namedColor) {
      return namedColor;
    }

    // Default to white if we can't parse
    return { r: 255, g: 255, b: 255 };
  }
};

// ============================================================================
// SETTINGS MANAGEMENT
// ============================================================================

const SettingsManager = {
  async loadSettings() {
    try {
      const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
      currentSettings = { ...DEFAULT_SETTINGS, ...stored };
      this.applyCSSSettings();
      this.applyBackgroundSettings();
    } catch (error) {
      console.warn('Failed to load settings, using defaults:', error);
      currentSettings = { ...DEFAULT_SETTINGS };
      this.applyBackgroundSettings();
    }
  },

  applyCSSSettings() {
    // Update CSS custom properties for all mode widths
    currentSettings.readingModes.forEach((mode, index) => {
      document.documentElement.style.setProperty(
        `--reading-escape-mode-${index}-width`, 
        `${mode.width}px`
      );
    });
    
    // Keep backward compatibility
    const enabledModes = currentSettings.readingModes.filter(m => m.enabled);
    if (enabledModes.length > 0) {
      document.documentElement.style.setProperty(
        '--reading-escape-narrow-width', 
        `${enabledModes[0].width}px`
      );
    }
    if (enabledModes.length > 1) {
      document.documentElement.style.setProperty(
        '--reading-escape-wide-width', 
        `${enabledModes[1].width}px`
      );
    }
  },

  applyBackgroundSettings() {
    BackgroundGrayout.toggle(currentSettings.grayoutBackground);
  },

  updateSettings(newSettings) {
    currentSettings = { ...currentSettings, ...newSettings };
    SelectorCache.invalidate(); // Clear selector cache when settings change
    this.applyCSSSettings();
    this.applyBackgroundSettings();
  }
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const ReadingState = {
  currentModeIndex: -1, // -1 means off, 0+ means active mode index
  originalContent: null,
  wrapper: null,

  isActive() {
    return this.currentModeIndex >= 0;
  },

  getCurrentMode() {
    if (!this.isActive()) return null;
    const enabledModes = this.getEnabledModes();
    return enabledModes[this.currentModeIndex] || null;
  },

  getEnabledModes() {
    return currentSettings.readingModes.filter(mode => mode.enabled);
  },

  setOff() {
    this.currentModeIndex = -1;
    this.originalContent = null;
    this.wrapper = null;
  },

  setMode(modeIndex, wrapper, originalContent) {
    this.currentModeIndex = modeIndex;
    this.wrapper = wrapper;
    if (originalContent) {
      this.originalContent = originalContent;
    }
  },

  getNextModeIndex() {
    const enabledModes = this.getEnabledModes();
    if (enabledModes.length === 0) return -1;
    
    if (!this.isActive()) return 0; // Start with first mode
    
    const nextIndex = this.currentModeIndex + 1;
    return nextIndex >= enabledModes.length ? -1 : nextIndex; // Cycle back to off
  }
};

// ============================================================================
// CONTENT FILTERING
// ============================================================================

const ContentFilter = {
  // Cache for performance
  _excludeRegexCache: new Map(),
  _textLengthCache: new WeakMap(),

  shouldExclude(element) {
    return getExcludeSelectors().some(selector => {
      try {
        return element.matches(selector);
      } catch (e) {
        return false;
      }
    });
  },

  removeUnwantedElements(container) {
    // Batch DOM operations for better performance
    const elementsToRemove = [];
    
    getExcludeSelectors().forEach(selector => {
      try {
        const unwantedElements = container.querySelectorAll(selector);
        elementsToRemove.push(...unwantedElements);
      } catch (e) {
        console.warn(`Invalid selector: ${selector}`);
      }
    });
    
    // Remove all elements in one batch
    elementsToRemove.forEach(element => element.remove());
  },

  // Optimized text length calculation without full cloning
  getTextLengthFast(element) {
    // Use cache if available
    if (this._textLengthCache.has(element)) {
      return this._textLengthCache.get(element);
    }

    let textLength = 0;
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip excluded elements efficiently
          let parent = node.parentElement;
          while (parent && parent !== element) {
            if (this.shouldExclude(parent)) {
              return NodeFilter.FILTER_REJECT;
            }
            parent = parent.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      textLength += node.textContent.trim().length;
    }

    // Cache the result
    this._textLengthCache.set(element, textLength);
    return textLength;
  },

  hasValidContent(element) {
    return this.getTextLengthFast(element) > currentSettings.minContentLength;
  },

  getValidTextLength(element) {
    return this.getTextLengthFast(element);
  },

  // Optimized content preparation with minimal cloning and style preservation
  prepareCleanContent(element) {
    const clone = element.cloneNode(true);
    
    // Preserve important computed styles from the original element
    this.preserveOriginalStyles(element, clone);
    
    // Remove unwanted elements after style preservation
    this.removeUnwantedElements(clone);
    
    return clone;
  },

  // Preserve essential styles from original content
  preserveOriginalStyles(original, clone) {
    try {
      // Get computed styles from the original element
      const originalStyles = window.getComputedStyle(original);
      
      // Preserve font properties
      const fontProperties = [
        'font-family', 'font-size', 'font-weight', 'font-style',
        'line-height', 'color', 'text-align'
      ];
      
      fontProperties.forEach(prop => {
        const value = originalStyles.getPropertyValue(prop);
        if (value && value !== 'initial' && value !== 'inherit') {
          clone.style.setProperty(prop, value);
        }
      });
      
      // Recursively preserve styles for child elements
      const originalChildren = original.children;
      const cloneChildren = clone.children;
      
      for (let i = 0; i < Math.min(originalChildren.length, cloneChildren.length); i++) {
        this.preserveChildStyles(originalChildren[i], cloneChildren[i]);
      }
    } catch (error) {
      console.warn('Could not preserve original styles:', error);
    }
  },

  // Preserve styles for child elements (limited depth to avoid performance issues)
  preserveChildStyles(originalChild, cloneChild, depth = 0) {
    if (depth > 3) return; // Limit recursion depth for performance
    
    try {
      const originalStyles = window.getComputedStyle(originalChild);
      
      // Preserve essential font and color properties
      const essentialProperties = ['font-family', 'font-size', 'color', 'font-weight'];
      
      essentialProperties.forEach(prop => {
        const value = originalStyles.getPropertyValue(prop);
        if (value && value !== 'initial' && value !== 'inherit') {
          cloneChild.style.setProperty(prop, value);
        }
      });
      
      // Continue for important child elements
      const importantTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'span', 'div'];
      if (importantTags.includes(originalChild.tagName.toLowerCase())) {
        const originalGrandChildren = originalChild.children;
        const cloneGrandChildren = cloneChild.children;
        
        for (let i = 0; i < Math.min(originalGrandChildren.length, cloneGrandChildren.length); i++) {
          this.preserveChildStyles(originalGrandChildren[i], cloneGrandChildren[i], depth + 1);
        }
      }
    } catch (error) {
      // Silently ignore errors for individual elements
    }
  }
};

// ============================================================================
// CONTENT DISCOVERY
// ============================================================================

const ContentDiscovery = {
  // Cache for discovered content
  _contentCache: new Map(),
  _lastCacheTime: 0,
  _cacheTimeout: 5000, // 5 second cache

  _isCacheValid() {
    return Date.now() - this._lastCacheTime < this._cacheTimeout;
  },

  _getCachedContent(key) {
    if (this._isCacheValid() && this._contentCache.has(key)) {
      return this._contentCache.get(key);
    }
    return null;
  },

  _setCachedContent(key, value) {
    if (!this._isCacheValid()) {
      this._contentCache.clear();
      this._lastCacheTime = Date.now();
    }
    this._contentCache.set(key, value);
  },

  findMainContent() {
    const cached = this._getCachedContent('mainContent');
    if (cached !== null) return cached;

    // Use optimized selector strategy - try most specific first
    const selectors = getContentSelectors();
    const prioritySelectors = ['article', '[role="main"]', 'main']; // Most likely to contain main content
    const orderedSelectors = [
      ...prioritySelectors.filter(s => selectors.includes(s)),
      ...selectors.filter(s => !prioritySelectors.includes(s))
    ];

    for (const selector of orderedSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) continue;

        const validElement = this._findBestValidElement(elements);
        if (validElement) {
          this._setCachedContent('mainContent', validElement);
          return validElement;
        }
      } catch (e) {
        console.warn(`Invalid selector: ${selector}`, e);
        continue;
      }
    }

    this._setCachedContent('mainContent', null);
    return null;
  },

  findCommentSection() {
    if (!currentSettings.preserveComments) return null;
    
    const cached = this._getCachedContent('commentSection');
    if (cached !== null) return cached;
    
    for (const selector of getCommentSelectors()) {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          const result = elements[0].parentElement?.parentElement || elements[0];
          this._setCachedContent('commentSection', result);
          return result;
        }
      } catch (e) {
        console.warn(`Invalid comment selector: ${selector}`, e);
        continue;
      }
    }

    this._setCachedContent('commentSection', null);
    return null;
  },

  _findBestValidElement(elements) {
    let bestElement = null;
    let maxValidTextLength = 0;

    // Convert to array and sort by likely relevance (larger elements first)
    const elementsArray = Array.from(elements).sort((a, b) => {
      return (b.offsetHeight || 0) - (a.offsetHeight || 0);
    });

    for (const element of elementsArray) {
      if (ContentFilter.shouldExclude(element)) continue;
      
      // Quick check for basic content validity before expensive calculations
      if (element.textContent.trim().length < currentSettings.minContentLength) continue;

      const validTextLength = ContentFilter.getValidTextLength(element);
      if (validTextLength > maxValidTextLength) {
        maxValidTextLength = validTextLength;
        bestElement = element;
        
        // Early termination if we find a very large content block
        if (validTextLength > 5000) {
          break;
        }
      }
    }

    return bestElement;
  },

  // Clear cache when needed
  clearCache() {
    this._contentCache.clear();
    this._lastCacheTime = 0;
  }
};

// ============================================================================
// UI MANAGEMENT
// ============================================================================

const UI = {
  createWrapper() {
    const wrapper = document.createElement('div');
    wrapper.className = CSS_CLASSES.wrapper;

    const contentContainer = document.createElement('div');
    contentContainer.className = CSS_CLASSES.content;

    wrapper.appendChild(contentContainer);
    return { wrapper, contentContainer };
  },

  prepareCleanContent(element) {
    return ContentFilter.prepareCleanContent(element);
  },

  replaceBodyContent(wrapper) {
    document.body.innerHTML = '';
    document.body.appendChild(wrapper);
    document.body.classList.add(CSS_CLASSES.active);
  },

  restoreOriginalContent(originalContent) {
    document.body.classList.remove(CSS_CLASSES.active);
    document.body.innerHTML = originalContent;
  },

  applyModeWidth(wrapper, modeIndex) {
    const contentContainer = wrapper?.querySelector(`.${CSS_CLASSES.content}`);
    if (!contentContainer) return;

    // Clear all previous mode classes
    contentContainer.className = CSS_CLASSES.content;
    
    // Apply current mode width
    const enabledModes = ReadingState.getEnabledModes();
    const mode = enabledModes[modeIndex];
    if (mode) {
      contentContainer.style.width = `${mode.width}px`;
      contentContainer.style.maxWidth = `${mode.width}px`;
      
      // Add mode-specific class for potential CSS targeting
      contentContainer.classList.add(`reading-mode-${modeIndex}`);
      
      // Keep backward compatibility for wide mode
      if (modeIndex === 1) {
        contentContainer.classList.add(CSS_CLASSES.wide);
      }
    }
  }
};

// ============================================================================
// READING MODE OPERATIONS
// ============================================================================

const ReadingMode = {
  enable(modeIndex = 0) {
    if (ReadingState.isActive()) return;

    const enabledModes = ReadingState.getEnabledModes();
    if (enabledModes.length === 0 || modeIndex >= enabledModes.length) return;

    const originalContent = document.body.innerHTML;
    const mainContent = ContentDiscovery.findMainContent();
    if (!mainContent) return;

    const { wrapper, contentContainer } = UI.createWrapper();

    // Add main content
    const cleanMainContent = UI.prepareCleanContent(mainContent);
    contentContainer.appendChild(cleanMainContent);

    // Add comments if available
    const commentSection = ContentDiscovery.findCommentSection();
    if (commentSection) {
      const cleanComments = UI.prepareCleanContent(commentSection);
      contentContainer.appendChild(cleanComments);
    }

    UI.replaceBodyContent(wrapper);
    UI.applyModeWidth(wrapper, modeIndex);
    
    ReadingState.setMode(modeIndex, wrapper, originalContent);
  },

  disable() {
    if (!ReadingState.isActive() || !ReadingState.originalContent) return;

    UI.restoreOriginalContent(ReadingState.originalContent);
    ReadingState.setOff();
  },

  switchToMode(modeIndex) {
    if (!ReadingState.isActive()) {
      this.enable(modeIndex);
      return;
    }

    const enabledModes = ReadingState.getEnabledModes();
    if (modeIndex >= enabledModes.length) return;

    UI.applyModeWidth(ReadingState.wrapper, modeIndex);
    ReadingState.setMode(modeIndex, ReadingState.wrapper);
  },

  cycle() {
    const nextModeIndex = ReadingState.getNextModeIndex();
    
    if (nextModeIndex === -1) {
      this.disable();
    } else {
      if (ReadingState.isActive()) {
        this.switchToMode(nextModeIndex);
      } else {
        this.enable(nextModeIndex);
      }
    }
  }
};


// ============================================================================
// LAZY INITIALIZATION
// ============================================================================

let isInitialized = false;

async function ensureInitialized() {
  if (isInitialized) return;
  
  try {
    await SettingsManager.loadSettings();
    BackgroundGrayout.init();
    isInitialized = true;
    console.log('Reading Escape Mode extension initialized with settings:', currentSettings);
  } catch (error) {
    console.error('Failed to initialize Reading Escape Mode:', error);
  }
}

// ============================================================================
// OPTIMIZED MESSAGE HANDLING
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Initialize only when needed
  if (request.action === 'toggle-reading-mode') {
    ensureInitialized().then(() => {
      ReadingMode.cycle();
      const currentMode = ReadingState.getCurrentMode();
      sendResponse({
        active: ReadingState.isActive(),
        modeIndex: ReadingState.currentModeIndex,
        modeName: currentMode?.name || 'Off',
        modeWidth: currentMode?.width || null
      });
    }).catch(error => {
      console.error('Error toggling reading mode:', error);
      sendResponse({ error: error.message });
    });
    return true; // Will respond asynchronously
  } 
  
  else if (request.action === 'toggle-grayout-background') {
    ensureInitialized().then(() => {
      currentSettings.grayoutBackground = !currentSettings.grayoutBackground;
      BackgroundGrayout.toggle(currentSettings.grayoutBackground);
      
      // Save the updated setting
      chrome.storage.sync.set({ grayoutBackground: currentSettings.grayoutBackground });
      
      sendResponse({ 
        enabled: currentSettings.grayoutBackground,
        success: true 
      });
    }).catch(error => {
      console.error('Error toggling grayout background:', error);
      sendResponse({ error: error.message });
    });
    return true; // Will respond asynchronously
  } 
  
  else if (request.action === 'settings-updated') {
    ensureInitialized().then(() => {
      // Clear caches when settings update
      SelectorCache.invalidate();
      ContentDiscovery.clearCache();
      ContentFilter._textLengthCache = new WeakMap();
      
      SettingsManager.updateSettings(request.settings);
      sendResponse({ success: true });
    }).catch(error => {
      console.error('Error updating settings:', error);
      sendResponse({ error: error.message });
    });
    return true; // Will respond asynchronously
  }
});

// Initialize extension lazily - only background grayout if enabled
(async () => {
  try {
    // Quick initial load for background grayout only
    const storedGrayoutSetting = await chrome.storage.sync.get(['grayoutBackground']);
    if (storedGrayoutSetting.grayoutBackground !== false) { // Default to true
      await ensureInitialized();
    }
  } catch (error) {
    console.warn('Failed to initialize background grayout:', error);
  }
})();