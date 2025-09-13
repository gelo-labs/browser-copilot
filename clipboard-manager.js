/**
 * GeloLabs Clipboard Manager
 * Handles clipboard storage, management, and UI interactions
 */

// ============ CONFIGURATION ============

const CONFIG = {
    DEFAULT_LIMIT: 1000,
    MIN_LIMIT: 100,
    MAX_LIMIT: 5000,
    PREVIEW_LENGTH: 100,
    AUTO_SAVE_DELAY: 1000,
    SEARCH_DEBOUNCE: 300,
    STORAGE_KEY: 'clipboardItems',
    SETTINGS_KEY: 'clipboardSettings'
};

// ============ STATE MANAGEMENT ============

let state = {
    items: [],
    settings: {
        limit: CONFIG.DEFAULT_LIMIT,
        useSync: false
    },
    isInitialized: false
};

// ============ STORAGE OPERATIONS ============

/**
 * Get storage API based on settings
 */
function getStorageAPI() {
    return state.settings.useSync ? chrome.storage.sync : chrome.storage.local;
}

/**
 * Load clipboard items from storage
 */
async function loadItems() {
    try {
        const storage = getStorageAPI();
        const result = await storage.get([CONFIG.STORAGE_KEY, CONFIG.SETTINGS_KEY]);
        
        // Load settings
        if (result[CONFIG.SETTINGS_KEY]) {
            state.settings = { ...state.settings, ...result[CONFIG.SETTINGS_KEY] };
        }
        
        // Load items
        state.items = result[CONFIG.STORAGE_KEY] || [];
        
        console.log(`📋 Loaded ${state.items.length} clipboard items`);
        return state.items;
    } catch (error) {
        console.error('❌ Failed to load clipboard items:', error);
        return [];
    }
}

/**
 * Save clipboard items to storage
 */
async function saveItems() {
    try {
        const storage = getStorageAPI();
        await storage.set({
            [CONFIG.STORAGE_KEY]: state.items,
            [CONFIG.SETTINGS_KEY]: state.settings
        });
        
        console.log(`💾 Saved ${state.items.length} clipboard items`);
    } catch (error) {
        console.error('❌ Failed to save clipboard items:', error);
        
        // If sync fails and we're using sync, fallback to local
        if (state.settings.useSync) {
            console.log('🔄 Falling back to local storage');
            state.settings.useSync = false;
            await chrome.storage.local.set({
                [CONFIG.STORAGE_KEY]: state.items,
                [CONFIG.SETTINGS_KEY]: state.settings
            });
        }
    }
}

/**
 * Add new clipboard item
 */
async function addItem(text, source = 'manual') {
    if (!text || !text.trim()) return;
    
    const cleanText = text.trim();
    
    // Check for duplicates (don't add if same text already exists)
    const existingIndex = state.items.findIndex(item => item.text === cleanText);
    if (existingIndex !== -1) {
        // Move existing item to top
        const existingItem = state.items[existingIndex];
        state.items.splice(existingIndex, 1);
        state.items.unshift({
            ...existingItem,
            timestamp: Date.now(),
            source
        });
    } else {
        // Add new item
        const newItem = {
            id: `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            text: cleanText,
            preview: cleanText.length > CONFIG.PREVIEW_LENGTH 
                ? cleanText.substring(0, CONFIG.PREVIEW_LENGTH) + '...' 
                : cleanText,
            timestamp: Date.now(),
            pinned: false,
            source,
            tag: null
        };
        
        state.items.unshift(newItem);
    }
    
    // Auto-trim if over limit (but keep pinned items)
    if (state.items.length > state.settings.limit) {
        const unpinnedItems = state.items.filter(item => !item.pinned);
        const pinnedItems = state.items.filter(item => item.pinned);
        
        // Keep only the most recent unpinned items
        const keepCount = state.settings.limit - pinnedItems.length;
        const keptUnpinned = unpinnedItems.slice(0, Math.max(0, keepCount));
        
        state.items = [...pinnedItems, ...keptUnpinned];
        console.log(`✂️ Auto-trimmed to ${state.items.length} items`);
    }
    
    await saveItems();
    updateUI();
    
    console.log(`➕ Added clipboard item: "${cleanText.substring(0, 50)}..."`);
}

/**
 * Remove clipboard item
 */
async function removeItem(itemId) {
    const index = state.items.findIndex(item => item.id === itemId);
    if (index !== -1) {
        const removedItem = state.items[index];
        state.items.splice(index, 1);
        await saveItems();
        updateUI();
        
        console.log(`🗑️ Removed clipboard item: "${removedItem.preview}"`);
    }
}

/**
 * Toggle pin status of item
 */
async function togglePin(itemId) {
    const item = state.items.find(item => item.id === itemId);
    if (item) {
        item.pinned = !item.pinned;
        
        // Re-sort: pinned items first, then by timestamp
        state.items.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return b.timestamp - a.timestamp;
        });
        
        await saveItems();
        updateUI();
        
        console.log(`📌 ${item.pinned ? 'Pinned' : 'Unpinned'} item: "${item.preview}"`);
    }
}

/**
 * Clear all items (with confirmation)
 */
async function clearAllItems() {
    if (state.items.length === 0) return;
    
    const confirmed = confirm(`Are you sure you want to clear all ${state.items.length} clipboard items? This cannot be undone.`);
    if (confirmed) {
        state.items = [];
        await saveItems();
        updateUI();
        console.log('🗑️ Cleared all clipboard items');
    }
}

// ============ CLIPBOARD OPERATIONS ============

/**
 * Capture current clipboard content
 */
async function captureClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
            await addItem(text, 'capture');
            showMessage('Captured from clipboard!', 'success');
        } else {
            showMessage('Clipboard is empty', 'warning');
        }
    } catch (error) {
        console.error('❌ Failed to read clipboard:', error);
        showMessage('Failed to read clipboard. Make sure you have copied some text first.', 'error');
    }
}

/**
 * Copy item to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showMessage('Copied to clipboard!', 'success');
        console.log(`📋 Copied to clipboard: "${text.substring(0, 50)}..."`);
    } catch (error) {
        console.error('❌ Failed to copy to clipboard:', error);
        showMessage('Failed to copy to clipboard', 'error');
    }
}

// ============ SEARCH & FILTERING REMOVED ============

// ============ UI OPERATIONS ============

/**
 * Show temporary message
 */
function showMessage(text, type = 'info') {
    // Create or update message element
    let messageEl = document.getElementById('clipboard-message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'clipboard-message';
        messageEl.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            z-index: 10000;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(messageEl);
    }
    
    // Style based on type
    const colors = {
        success: { bg: '#4caf50', text: '#fff' },
        error: { bg: '#f44336', text: '#fff' },
        warning: { bg: '#ff9800', text: '#fff' },
        info: { bg: '#2196f3', text: '#fff' }
    };
    
    const color = colors[type] || colors.info;
    messageEl.style.backgroundColor = color.bg;
    messageEl.style.color = color.text;
    messageEl.textContent = text;
    messageEl.style.opacity = '1';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        if (messageEl) {
            messageEl.style.opacity = '0';
            setTimeout(() => {
                if (messageEl && messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }
    }, 3000);
}

/**
 * Create clipboard item element
 */
function createItemElement(item) {
    const itemEl = document.createElement('div');
    itemEl.className = `clipboard-item${item.pinned ? ' pinned' : ''}`;
    itemEl.dataset.itemId = item.id;
    
    const timeAgo = getTimeAgo(item.timestamp);
    const sourceIcon = getSourceIcon(item.source);
    
    itemEl.innerHTML = `
        <div class="clipboard-item-header">
            <div class="clipboard-item-meta">
                <span class="source-icon">${sourceIcon}</span>
                <span class="timestamp">${timeAgo}</span>
                ${item.tag ? `<span class="clipboard-item-tag">${item.tag}</span>` : ''}
            </div>
            <div class="clipboard-item-controls">
                <button class="pin-button${item.pinned ? ' pinned' : ''}" title="${item.pinned ? 'Unpin' : 'Pin'}" data-action="pin">
                    ${item.pinned ? '📌' : '📍'}
                </button>
                <button class="delete-button" title="Delete" data-action="delete">🗑️</button>
            </div>
        </div>
        <div class="clipboard-item-preview">${escapeHtml(item.preview)}</div>
    `;
    
    // Add click handler for copying
    itemEl.addEventListener('click', (e) => {
        if (!e.target.closest('.clipboard-item-controls')) {
            copyToClipboard(item.text);
        }
    });
    
    // Add control handlers
    itemEl.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action === 'pin') {
            e.stopPropagation();
            togglePin(item.id);
        } else if (action === 'delete') {
            e.stopPropagation();
            removeItem(item.id);
        }
    });
    
    return itemEl;
}

/**
 * Render clipboard items
 */
function renderItems() {
    const listEl = document.getElementById('clipboard-list');
    if (!listEl) return;
    
    if (state.items.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <div class="empty-text">No clipboard items yet</div>
                <div class="empty-hint">Paste text above or use the capture button</div>
            </div>
        `;
        return;
    }
    
    // Clear and render items
    listEl.innerHTML = '';
    state.items.forEach(item => {
        listEl.appendChild(createItemElement(item));
    });
}

/**
 * Update UI elements
 */
function updateUI() {
    // Update stats
    const countEl = document.getElementById('clipboard-count');
    const limitEl = document.getElementById('clipboard-limit');
    
    if (countEl) countEl.textContent = state.items.length;
    if (limitEl) limitEl.textContent = state.settings.limit;
    
    // Re-render items
    renderItems();
}

// ============ UTILITY FUNCTIONS ============

/**
 * Get human-readable time ago
 */
function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
}

/**
 * Get source icon
 */
function getSourceIcon(source) {
    const icons = {
        manual: '✏️',
        capture: '📋',
        context: '🖱️',
        paste: '📝'
    };
    return icons[source] || '📄';
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============ EXPORT/IMPORT REMOVED ============

// ============ INITIALIZATION ============

/**
 * Initialize clipboard manager
 */
async function initializeClipboardManager() {
    if (state.isInitialized) return;
    
    console.log('🚀 Initializing Clipboard Manager');
    
    try {
        // Load data
        await loadItems();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initial UI update
        updateUI();
        
        state.isInitialized = true;
        console.log('✅ Clipboard Manager initialized');
        
    } catch (error) {
        console.error('❌ Failed to initialize clipboard manager:', error);
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Capture button
    const captureBtn = document.getElementById('capture-clipboard');
    if (captureBtn) {
        captureBtn.addEventListener('click', captureClipboard);
    }
    
    // Clear all button
    const clearBtn = document.getElementById('clear-all-clips');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllItems);
    }
    
    // Paste input
    const pasteInput = document.getElementById('clipboard-input');
    if (pasteInput) {
        pasteInput.addEventListener('paste', async (e) => {
            // Small delay to let paste complete
            setTimeout(async () => {
                const text = pasteInput.value;
                if (text.trim()) {
                    await addItem(text, 'paste');
                    pasteInput.value = '';
                }
            }, 10);
        });
        
        pasteInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const text = pasteInput.value;
                if (text.trim()) {
                    await addItem(text, 'manual');
                    pasteInput.value = '';
                }
            }
        });
    }
}

// ============ PUBLIC API ============

// Export functions for use in popup.js
window.ClipboardManager = {
    initialize: initializeClipboardManager,
    addItem,
    removeItem,
    togglePin,
    clearAllItems,
    captureClipboard,
    copyToClipboard,
    getItems: () => state.items,
    getSettings: () => state.settings
};

// Auto-initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeClipboardManager);
} else {
    initializeClipboardManager();
}
