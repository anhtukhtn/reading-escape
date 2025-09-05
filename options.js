// ============================================================================
// READING ESCAPE MODE - Options Page for Multiple Modes
// ============================================================================

const DEFAULT_SETTINGS = {
  readingModes: [
    { name: 'Wide', width: 700, enabled: true }
  ],
  preserveComments: true,
  minContentLength: 100,
  grayoutBackground: true,
  grayoutAmount: 0.2
};

const OptionsManager = {
  elements: {},
  currentModes: [],

  init() {
    this.cacheElements();
    this.loadSettings();
    this.bindEvents();
  },

  cacheElements() {
    this.elements = {
      modesContainer: document.getElementById('modesContainer'),
      addModeButton: document.getElementById('addModeButton'),
      preserveComments: document.getElementById('preserveComments'),
      minContentLength: document.getElementById('minContentLength'),
      grayoutBackground: document.getElementById('grayoutBackground'),
      grayoutAmount: document.getElementById('grayoutAmount'),
      grayoutPercentage: document.getElementById('grayoutPercentage'),
      grayoutPreview: document.getElementById('grayoutPreview'),
      grayoutSettings: document.getElementById('grayoutSettings'),
      saveButton: document.getElementById('saveButton'),
      statusMessage: document.getElementById('statusMessage')
    };
  },

  bindEvents() {
    this.elements.saveButton.addEventListener('click', () => this.saveSettings());
    this.elements.addModeButton.addEventListener('click', () => this.addNewMode());
    
    // Grayout background events
    this.elements.grayoutBackground.addEventListener('change', () => {
      this.updateGrayoutUI();
    });
    
    this.elements.grayoutAmount.addEventListener('input', () => {
      this.updateGrayoutPreview();
    });
  },

  async loadSettings() {
    try {
      const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
      this.currentModes = stored.readingModes || DEFAULT_SETTINGS.readingModes;
      
      this.elements.preserveComments.value = stored.preserveComments.toString();
      this.elements.minContentLength.value = stored.minContentLength;
      this.elements.grayoutBackground.checked = stored.grayoutBackground;
      this.elements.grayoutAmount.value = Math.round((stored.grayoutAmount || 0.2) * 100);
      
      this.renderModes();
      this.updatePreview();
      this.updateGrayoutUI();
      this.updateGrayoutPreview();
    } catch (error) {
      this.showStatus('Error loading settings', 'error');
    }
  },

  renderModes() {
    this.elements.modesContainer.innerHTML = '';
    
    this.currentModes.forEach((mode, index) => {
      const modeElement = this.createModeElement(mode, index);
      this.elements.modesContainer.appendChild(modeElement);
    });
  },

  createModeElement(mode, index) {
    const modeDiv = document.createElement('div');
    modeDiv.className = 'mode-item';
    modeDiv.dataset.index = index;
    
    modeDiv.innerHTML = `
      <span class="mode-drag-handle">⋮⋮</span>
      <input type="checkbox" class="mode-enabled" ${mode.enabled ? 'checked' : ''}>
      <input type="text" class="mode-name" value="${mode.name}" placeholder="Mode name">
      <input type="number" class="mode-width" value="${mode.width}" min="200" max="1600" placeholder="Width">
      <span>px</span>
      <button type="button" class="mode-remove">Remove</button>
    `;

    // Bind events for this mode
    this.bindModeEvents(modeDiv, index);
    
    return modeDiv;
  },

  bindModeEvents(modeElement, index) {
    const enabledCheckbox = modeElement.querySelector('.mode-enabled');
    const nameInput = modeElement.querySelector('.mode-name');
    const widthInput = modeElement.querySelector('.mode-width');
    const removeButton = modeElement.querySelector('.mode-remove');

    enabledCheckbox.addEventListener('change', () => {
      this.currentModes[index].enabled = enabledCheckbox.checked;
      this.updatePreview();
    });

    nameInput.addEventListener('input', () => {
      this.currentModes[index].name = nameInput.value;
      this.updatePreview();
    });

    widthInput.addEventListener('input', () => {
      const width = parseInt(widthInput.value);
      if (!isNaN(width) && width >= 200 && width <= 1600) {
        this.currentModes[index].width = width;
        this.updatePreview();
      }
    });

    removeButton.addEventListener('click', () => {
      this.removeMode(index);
    });
  },

  addNewMode() {
    const newMode = {
      name: `Mode ${this.currentModes.length + 1}`,
      width: 600,
      enabled: true
    };
    
    this.currentModes.push(newMode);
    this.renderModes();
    this.updatePreview();
  },

  removeMode(index) {
    if (this.currentModes.length <= 1) {
      this.showStatus('You must have at least one reading mode', 'error');
      return;
    }
    
    this.currentModes.splice(index, 1);
    this.renderModes();
    this.updatePreview();
  },

  updatePreview() {
    // Remove existing preview
    const existingPreview = document.querySelector('.mode-preview');
    if (existingPreview) {
      existingPreview.remove();
    }

    // Create new preview
    const preview = document.createElement('div');
    preview.className = 'mode-preview';
    
    const enabledModes = this.currentModes.filter(mode => mode.enabled);
    
    if (enabledModes.length === 0) {
      preview.innerHTML = '<strong>Warning:</strong> No modes are enabled. Enable at least one mode.';
    } else {
      const modeList = enabledModes.map((mode, index) => 
        `${index + 1}. ${mode.name} (${mode.width}px)`
      ).join(' → ');
      
      preview.innerHTML = `<strong>Cycling order:</strong> Off → ${modeList} → Off`;
    }
    
    this.elements.modesContainer.parentNode.appendChild(preview);
  },

  updateGrayoutUI() {
    const isEnabled = this.elements.grayoutBackground.checked;
    this.elements.grayoutSettings.style.opacity = isEnabled ? '1' : '0.5';
    this.elements.grayoutAmount.disabled = !isEnabled;
  },

  updateGrayoutPreview() {
    const amount = parseInt(this.elements.grayoutAmount.value);
    this.elements.grayoutPercentage.textContent = `${amount}%`;
    
    // Calculate darkened white color for preview
    const factor = 1 - (amount / 100);
    const grayValue = Math.round(255 * factor);
    const previewColor = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
    
    this.elements.grayoutPreview.style.backgroundColor = previewColor;
    this.elements.grayoutPreview.style.color = grayValue < 128 ? 'white' : 'black';
  },

  validateSettings() {
    const enabledModes = this.currentModes.filter(mode => mode.enabled);
    
    if (enabledModes.length === 0) {
      this.showStatus('You must enable at least one reading mode', 'error');
      return false;
    }

    // Check for duplicate names
    const names = enabledModes.map(mode => mode.name.trim().toLowerCase());
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      this.showStatus('Mode names must be unique', 'error');
      return false;
    }

    // Check for valid widths
    for (const mode of this.currentModes) {
      if (mode.width < 200 || mode.width > 1600) {
        this.showStatus('Mode widths must be between 200-1600px', 'error');
        return false;
      }
    }

    return true;
  },

  async saveSettings() {
    if (!this.validateSettings()) return;

    const settings = {
      readingModes: this.currentModes,
      preserveComments: this.elements.preserveComments.value === 'true',
      minContentLength: parseInt(this.elements.minContentLength.value),
      grayoutBackground: this.elements.grayoutBackground.checked,
      grayoutAmount: parseInt(this.elements.grayoutAmount.value) / 100
    };

    try {
      this.elements.saveButton.disabled = true;
      this.elements.saveButton.textContent = 'Saving...';
      
      await chrome.storage.sync.set(settings);
      
      this.showStatus('Settings saved successfully!', 'success');
      
      // Notify content scripts of settings change
      this.notifyContentScripts(settings);
      
    } catch (error) {
      this.showStatus('Error saving settings', 'error');
    } finally {
      this.elements.saveButton.disabled = false;
      this.elements.saveButton.textContent = 'Save Settings';
    }
  },

  showStatus(message, type) {
    this.elements.statusMessage.textContent = message;
    this.elements.statusMessage.className = `status-message ${type}`;
    this.elements.statusMessage.style.display = 'block';
    
    setTimeout(() => {
      this.elements.statusMessage.style.display = 'none';
    }, 3000);
  },

  async notifyContentScripts(settings) {
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'settings-updated',
            settings: settings
          });
        } catch (error) {
          // Ignore errors for tabs that can't receive messages
        }
      }
    } catch (error) {
      console.warn('Could not notify content scripts:', error);
    }
  }
};

// Initialize options page
document.addEventListener('DOMContentLoaded', () => {
  OptionsManager.init();
});