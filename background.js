// Background script for GeloLabs: Browser Copilot
// Handles extension lifecycle and Google Meet monitoring

// Extension state management
let extensionState = {
  blockingEnabled: true,
  timeSaved: 0,
  lastUpdate: Date.now()
};

// Load saved state on startup
chrome.storage.sync.get(['blockingState', 'timeSaved'], (result) => {
  extensionState.blockingEnabled = result.blockingState !== 'inactive';
  extensionState.timeSaved = result.timeSaved || 0;
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.blockingState) {
    extensionState.blockingEnabled = changes.blockingState.newValue !== 'inactive';
  }
  if (changes.timeSaved) {
    extensionState.timeSaved = changes.timeSaved.newValue || 0;
  }
});

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default state
    chrome.storage.sync.set({
      blockingState: 'active',
      timeSaved: 0
    });
    
    // Create context menu for Meet notes activation
    chrome.contextMenus.create({
      id: 'activateMeetNotes',
      title: 'Activate Meeting Notes',
      contexts: ['page'],
      documentUrlPatterns: ['*://meet.google.com/*']
    });
    
    // Create context menu for notes
    chrome.contextMenus.create({
      id: 'toggleTeleprompter',
      title: 'Open GeloNotes',
      contexts: ['page']
    });
    
    // Create context menu for clipboard manager
    chrome.contextMenus.create({
      id: 'toggleClipboardManager',
      title: 'Open GeloClipboard',
      contexts: ['page']
    });
    
    // Create context menu for clipboard manager (selection)
    chrome.contextMenus.create({
      id: 'saveToClipboard',
      title: 'Save to GeloClipboard',
      contexts: ['selection']
    });
    
    // Create context menu for YouTube AI Assistant
    chrome.contextMenus.create({
      id: 'openYouTubeAI',
      title: 'Open YouTube Video AI',
      contexts: ['page'],
      documentUrlPatterns: ['*://www.youtube.com/*', '*://youtube.com/*']
    });
  }
});

// Completely non-invasive approach - no script injection at all
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('meet.google.com')) {
    // Don't inject any script - just log that we detected Google Meet
    console.log('Google Meet detected - using non-invasive approach (no script injection)');
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'activateMeetNotes' && tab.url && tab.url.includes('meet.google.com')) {
    // Instead of injecting script, just notify the user
    console.log('User requested Meet notes activation - using popup interface only');
  }
  
  if (info.menuItemId === 'toggleTeleprompter') {
    // Inject GeloNotes script dynamically
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['teleprompter-overlay.js']
    }, () => {
      chrome.tabs.sendMessage(tab.id, { action: 'toggleTeleprompter' });
    });
  }
  
  if (info.menuItemId === 'toggleClipboardManager') {
    // Inject GeloClipboard script dynamically
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['clipboard-overlay.js']
    }, () => {
      chrome.tabs.sendMessage(tab.id, { action: 'toggleClipboardManager' });
    });
  }
  
  if (info.menuItemId === 'saveToClipboard') {
    // Save selected text to clipboard manager
    const selectedText = info.selectionText;
    if (selectedText) {
      saveToClipboardManager(selectedText, 'context');
    }
  }
  
  if (info.menuItemId === 'openYouTubeAI') {
    // Trigger YouTube AI Assistant
    chrome.tabs.sendMessage(tab.id, { action: 'openYouTubeAI' });
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateTimeSaved') {
    extensionState.timeSaved = request.timeSaved;
    chrome.storage.sync.set({ timeSaved: request.timeSaved });
    sendResponse({ success: true });
  }
  
  if (request.action === 'getState') {
    sendResponse({
      blockingEnabled: extensionState.blockingEnabled,
      timeSaved: extensionState.timeSaved
    });
  }
  
  if (request.action === 'getTimeSaved') {
    sendResponse({ timeSaved: extensionState.timeSaved });
  }
  
  if (request.action === 'activateMeetNotes') {
    // Just acknowledge the request - no script injection
    console.log('Meet notes activation requested - using popup interface only');
    sendResponse({ success: true });
  }
  
  if (request.action === 'getCurrentTabId') {
    // Send back the current tab ID for tab affinity
    sendResponse({ tabId: sender.tab ? sender.tab.id : null });
  }
  
  if (request.action === 'copilot:busy') {
    // Forward copilot busy message to gelolabs.com tabs
    forwardMessageToGeloLabsTabs('copilot:busy', { reason: request.reason, tabId: sender.tab ? sender.tab.id : null });
    sendResponse({ success: true });
  }
  
  if (request.action === 'copilot:idle') {
    // Forward copilot idle message to gelolabs.com tabs
    forwardMessageToGeloLabsTabs('copilot:idle', { tabId: sender.tab ? sender.tab.id : null });
    sendResponse({ success: true });
  }
  
  if (request.action === 'toggleTeleprompter') {
    // Forward teleprompter toggle to active tab with dynamic injection
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        // Inject GeloNotes script dynamically
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['teleprompter-overlay.js']
        }, () => {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleTeleprompter' }, (response) => {
            sendResponse(response || { success: false });
          });
        });
      } else {
        sendResponse({ success: false, error: 'No active tab' });
      }
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'toggleClipboardManager') {
    // Forward clipboard manager toggle to active tab with dynamic injection
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        // Inject GeloClipboard script dynamically
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['clipboard-overlay.js']
        }, () => {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleClipboardManager' }, (response) => {
            sendResponse(response || { success: false });
          });
        });
      } else {
        sendResponse({ success: false, error: 'No active tab' });
      }
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'openTeleprompterWithContent') {
    // Forward to active tab to open teleprompter with specific content
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'openTeleprompterWithContent',
          content: request.content
        }, (response) => {
          sendResponse(response || { success: true });
        });
      } else {
        sendResponse({ success: false, error: 'No active tab' });
      }
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'addToClipboard') {
    // Save text to clipboard manager
    if (request.text) {
      saveToClipboardManager(request.text, request.source || 'external', request.noteId).then(() => {
        // Notify clipboard manager to refresh UI
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { 
              action: 'addToClipboard',
              text: request.text,
              source: request.source || 'external',
              noteId: request.noteId
            }).catch(() => {
              // Ignore errors if clipboard manager is not open
            });
          }
        });
        sendResponse({ success: true });
      });
    } else {
      sendResponse({ success: false, error: 'No text provided' });
    }
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab.url && tab.url.includes('youtube.com')) {
    // Open popup for YouTube
    chrome.action.setPopup({ popup: 'popup.html' });
  } else if (tab.url && tab.url.includes('meet.google.com')) {
    // For Google Meet, just open popup - no script injection
    console.log('Extension clicked on Google Meet - opening popup interface');
  }
});

// Update time saved counter
function updateTimeSaved() {
  if (extensionState.blockingEnabled) {
    extensionState.timeSaved += 0.1; // Add 6 minutes (0.1 hours)
    chrome.storage.sync.set({ timeSaved: extensionState.timeSaved });
  }
}

// Update every 6 minutes (360000 ms)
setInterval(updateTimeSaved, 360000);

// Keyboard shortcuts are handled directly in content scripts for Alt+G+Number combinations

// Helper function to forward messages to gelolabs.com tabs
function forwardMessageToGeloLabsTabs(action, data) {
  chrome.tabs.query({ url: ['*://gelolabs.com/*', '*://www.gelolabs.com/*'] }, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: action,
        ...data
      }).catch(error => {
        // Ignore errors for tabs that don't have the content script loaded
        console.log('Could not send message to GeloLabs tab:', tab.id);
      });
    });
  });
}

// Helper function to save text to clipboard manager
async function saveToClipboardManager(text, source = 'context', noteId = null) {
  if (!text || !text.trim()) return;
  
  try {
    const STORAGE_KEY = 'clipboardItems';
    const SETTINGS_KEY = 'clipboardSettings';
    const DEFAULT_LIMIT = 1000;
    const PREVIEW_LENGTH = 100;
    
    // Get current data
    const result = await chrome.storage.local.get([STORAGE_KEY, SETTINGS_KEY]);
    const items = result[STORAGE_KEY] || [];
    const settings = result[SETTINGS_KEY] || { limit: DEFAULT_LIMIT };
    
    const cleanText = text.trim();
    
    // For notes, check if we already have an item with this noteId
    if (noteId && source === 'notes') {
      const existingIndex = items.findIndex(item => item.noteId === noteId);
      if (existingIndex !== -1) {
        // Update existing note item
        items[existingIndex] = {
          ...items[existingIndex],
          text: cleanText,
          preview: cleanText.length > PREVIEW_LENGTH 
            ? cleanText.substring(0, PREVIEW_LENGTH) + '...' 
            : cleanText,
          timestamp: Date.now(),
          source
        };
        
        await chrome.storage.local.set({ [STORAGE_KEY]: items });
        console.log(`🔄 Updated note item: "${cleanText.substring(0, 50)}..."`);
        return;
      }
    }
    
    // Check for text duplicates (for non-note items or new notes)
    const existingIndex = items.findIndex(item => item.text === cleanText);
    if (existingIndex !== -1) {
      // Move existing item to top
      const existingItem = items[existingIndex];
      items.splice(existingIndex, 1);
      items.unshift({
        ...existingItem,
        timestamp: Date.now(),
        source,
        noteId: noteId || existingItem.noteId
      });
    } else {
      // Add new item
      const newItem = {
        id: `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: cleanText,
        preview: cleanText.length > PREVIEW_LENGTH 
          ? cleanText.substring(0, PREVIEW_LENGTH) + '...' 
          : cleanText,
        timestamp: Date.now(),
        pinned: false,
        source,
        tag: null,
        noteId: noteId || null
      };
      
      items.unshift(newItem);
    }
    
    // Auto-trim if over limit (but keep pinned items)
    if (items.length > settings.limit) {
      const unpinnedItems = items.filter(item => !item.pinned);
      const pinnedItems = items.filter(item => item.pinned);
      const keepCount = settings.limit - pinnedItems.length;
      const keptUnpinned = unpinnedItems.slice(0, Math.max(0, keepCount));
      const finalItems = [...pinnedItems, ...keptUnpinned];
      
      await chrome.storage.local.set({ [STORAGE_KEY]: finalItems });
    } else {
      await chrome.storage.local.set({ [STORAGE_KEY]: items });
    }
    
    console.log(`📋 Saved to clipboard manager: "${cleanText.substring(0, 50)}..."`);
    
  } catch (error) {
    console.error('❌ Failed to save to clipboard manager:', error);
  }
} 