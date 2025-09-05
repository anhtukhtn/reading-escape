// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-reading-mode') {
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab) {
        // Send message to content script
        chrome.tabs.sendMessage(tab.id, { action: 'toggle-reading-mode' }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Error sending message:', chrome.runtime.lastError.message);
          } else {
            console.log('Reading mode cycled to:', response?.state || 'off');
          }
        });
      }
    } catch (error) {
      console.error('Error handling command:', error);
    }
  }
});

// Extension lifecycle
chrome.runtime.onInstalled.addListener(() => {
  console.log('Reading Escape Mode extension installed');
});
