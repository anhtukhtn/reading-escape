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
// SELECTOR ACCESS HELPERS
// ============================================================================

// Dynamic selector access - uses current settings
const getContentSelectors = () => currentSettings.contentSelectors || DEFAULT_CONTENT_SELECTORS;
const getCommentSelectors = () => currentSettings.commentSelectors || DEFAULT_COMMENT_SELECTORS;
const getExcludeSelectors = () => currentSettings.excludeSelectors || DEFAULT_EXCLUDE_SELECTORS;

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
    getExcludeSelectors().forEach(selector => {
      try {
        const unwantedElements = container.querySelectorAll(selector);
        unwantedElements.forEach(element => element.remove());
      } catch (e) {
        console.warn(`Invalid selector: ${selector}`);
      }
    });
  },

  hasValidContent(element) {
    const clone = element.cloneNode(true);
    this.removeUnwantedElements(clone);
    const textContent = clone.textContent.trim();
    return textContent.length > currentSettings.minContentLength;
  },

  getValidTextLength(element) {
    const clone = element.cloneNode(true);
    this.removeUnwantedElements(clone);
    return clone.textContent.trim().length;
  }
};

// ============================================================================
// CONTENT DISCOVERY
// ============================================================================

const ContentDiscovery = {
  findMainContent() {
    for (const selector of getContentSelectors()) {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) continue;

      const validElement = this._findBestValidElement(elements);
      if (validElement) return validElement;
    }
    return null;
  },

  findCommentSection() {
    if (!currentSettings.preserveComments) return null;
    
    for (const selector of getCommentSelectors()) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        return elements[0].parentElement.parentElement;
      }
    }
    return null;
  },

  _findBestValidElement(elements) {
    let bestElement = null;
    let maxValidTextLength = 0;

    elements.forEach(element => {
      if (ContentFilter.shouldExclude(element)) return;
      if (!ContentFilter.hasValidContent(element)) return;

      const validTextLength = ContentFilter.getValidTextLength(element);
      if (validTextLength > maxValidTextLength) {
        maxValidTextLength = validTextLength;
        bestElement = element;
      }
    });

    return bestElement;
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
    const clone = element.cloneNode(true);
    ContentFilter.removeUnwantedElements(clone);
    return clone;
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
// MESSAGE HANDLING
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle-reading-mode') {
    ReadingMode.cycle();
    const currentMode = ReadingState.getCurrentMode();
    sendResponse({
      active: ReadingState.isActive(),
      modeIndex: ReadingState.currentModeIndex,
      modeName: currentMode?.name || 'Off',
      modeWidth: currentMode?.width || null
    });
  } else if (request.action === 'toggle-grayout-background') {
    currentSettings.grayoutBackground = !currentSettings.grayoutBackground;
    BackgroundGrayout.toggle(currentSettings.grayoutBackground);
    
    // Save the updated setting
    chrome.storage.sync.set({ grayoutBackground: currentSettings.grayoutBackground });
    
    sendResponse({ 
      enabled: currentSettings.grayoutBackground,
      success: true 
    });
  } else if (request.action === 'settings-updated') {
    SettingsManager.updateSettings(request.settings);
    sendResponse({ success: true });
  }
});

// Initialize extension
(async () => {
  await SettingsManager.loadSettings();
  BackgroundGrayout.init();
  console.log('Reading Escape Mode extension loaded with settings:', currentSettings);
})();