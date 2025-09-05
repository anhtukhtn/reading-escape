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

// Default settings (will be overridden by user preferences)
const DEFAULT_SETTINGS = {
  readingModes: [
    { name: 'Narrow', width: 700, enabled: true },
  ],
  preserveComments: true,
  minContentLength: 100
};

let currentSettings = { ...DEFAULT_SETTINGS };

// ============================================================================
// SELECTOR CONFIGURATIONS
// ============================================================================

const CONTENT_SELECTORS = [
  '.article-content', 'article', '[role="main"]', 'main', '.content',
  '.post-content', '.entry-content', '.story-body', '.text-content',
  '#content', '.article-body', '.post-body', '.main-content',
  '.article-wrapper', '.content-wrapper', '#hnmain'
];

const COMMENT_SELECTORS = [
  '.comments', '.comment-section', '.comments-section', '#comments',
  '.disqus-thread', '.fb-comments', '.comment-list', '.comments-area',
  '.comment-wrapper', '.discussion', '.comment-container', '#bigbox'
];

const EXCLUDE_SELECTORS = [
  // Navigation
  'nav', 'header', 'footer', '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
  
  // Sidebars
  '.sidebar', '.aside', 'aside', '[class*="sidebar"]', '[id*="sidebar"]', 
  '[class*="aside"]', '[id*="aside"]',
  
  // Advertisements
  '.advertisement', '.ads', '.ad', '.sponsored', '.promo', '.banner-ad', '.ad-banner',
  '.google-ads', '.adsense', '[class*="ad-"]', '[class*="ads"]', '[id*="ad-"]', 
  '[id*="ads"]', '[class*="sponsored"]', '[id*="sponsored"]', '[class*="promo"]', 
  '[id*="promo"]', '[data-ad]', '[data-ads]', 'ins.adsbygoogle',
  
  // Social sharing
  '.social-share', '.share-buttons', '.social-buttons', '.share-bar', '.social-media',
  '.social-links', '[class*="share"]', '[id*="share"]', '[class*="social"]', 
  '[id*="social"]', '[class*="follow"]', '[id*="follow"]',
  
  // Newsletter
  '.newsletter', '.newsletter-signup', '.subscribe', '.subscription', '.email-signup',
  '[class*="newsletter"]', '[id*="newsletter"]', '[class*="subscribe"]', '[id*="subscribe"]',
  '[class*="signup"]', '[id*="signup"]',
  
  // Popups
  '.popup', '.modal', '.overlay', '.lightbox', '.dialog', '.tooltip',
  '[class*="popup"]', '[id*="popup"]', '[class*="modal"]', '[id*="modal"]',
  '[class*="overlay"]', '[id*="overlay"]', '[role="dialog"]',
  
  // Cookie banners
  '.cookie-banner', '.cookie-notice', '.consent-banner', '.gdpr-banner',
  '[class*="cookie"]', '[id*="cookie"]', '[class*="consent"]', '[id*="consent"]',
  '[class*="gdpr"]', '[id*="gdpr"]',
  
  // Related content
  '.related-posts', '.recommended', '.related-articles', '.more-stories',
  '.trending', '.popular', '[class*="related"]', '[id*="related"]',
  '[class*="recommended"]', '[id*="recommended"]', '[class*="trending"]', '[id*="trending"]',
  
  // Navigation elements
  '.breadcrumb', '.breadcrumbs', '.pagination', '.pager', '.nav-menu', '.menu',
  '[class*="nav"]', '[id*="nav"]', '[class*="menu"]', '[id*="menu"]',
  '[class*="breadcrumb"]', '[id*="breadcrumb"]',
  
  // Widgets
  '.widget', '.plugin', '.embed', '.iframe-wrapper', '.video-player', '.audio-player',
  '[class*="widget"]', '[id*="widget"]', '[class*="plugin"]', '[id*="plugin"]',
  
  // Fixed elements
  '.fixed', '.sticky', '[class*="fixed"]', '[id*="fixed"]', '[class*="sticky"]', '[id*="sticky"]',
  
  // Scripts
  'script', 'style', 'noscript', 'link[rel="stylesheet"]'
];

// ============================================================================
// SETTINGS MANAGEMENT
// ============================================================================

const SettingsManager = {
  async loadSettings() {
    try {
      const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
      currentSettings = { ...DEFAULT_SETTINGS, ...stored };
      this.applyCSSSettings();
    } catch (error) {
      console.warn('Failed to load settings, using defaults:', error);
      currentSettings = { ...DEFAULT_SETTINGS };
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

  updateSettings(newSettings) {
    currentSettings = { ...currentSettings, ...newSettings };
    this.applyCSSSettings();
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
    return EXCLUDE_SELECTORS.some(selector => {
      try {
        return element.matches(selector);
      } catch (e) {
        return false;
      }
    });
  },

  removeUnwantedElements(container) {
    EXCLUDE_SELECTORS.forEach(selector => {
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
    for (const selector of CONTENT_SELECTORS) {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) continue;

      const validElement = this._findBestValidElement(elements);
      if (validElement) return validElement;
    }
    return null;
  },

  findCommentSection() {
    if (!currentSettings.preserveComments) return null;
    
    for (const selector of COMMENT_SELECTORS) {
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
  } else if (request.action === 'settings-updated') {
    SettingsManager.updateSettings(request.settings);
    sendResponse({ success: true });
  }
});

// Initialize extension
(async () => {
  await SettingsManager.loadSettings();
  console.log('Reading Escape Mode extension loaded with settings:', currentSettings);
})();