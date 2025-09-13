/**
 * GeloLabs Clipboard Manager Overlay
 * Floating clipboard manager window similar to teleprompter
 */

// ============ CONFIGURATION ============

const CONFIG = {
    DEFAULT_POSITION: { x: 100, y: 100 },
    DEFAULT_SIZE: { width: 245, height: 350 },
    STORAGE_KEY: 'clipboardItems',
    SETTINGS_KEY: 'clipboardSettings',
    POSITION_KEY: 'clipboardPosition',
    SIZE_KEY: 'clipboardSize',
    DEFAULT_LIMIT: 1000,
    PREVIEW_LENGTH: 100
};

// ============ STATE MANAGEMENT ============

let state = {
    isVisible: false,
    position: { ...CONFIG.DEFAULT_POSITION },
    size: { ...CONFIG.DEFAULT_SIZE },
    items: [],
    settings: {
        limit: CONFIG.DEFAULT_LIMIT,
        useSync: false
    },
    shadowRoot: null,
    container: null,
    isInitialized: false,
    isPasteReady: false
};

// ============ WINDOW CREATION ============

/**
 * Create the floating clipboard manager window
 */
function createClipboardWindow() {
    // Create container
    const container = document.createElement('div');
    container.id = 'gelolabs-clipboard-manager';
    container.style.cssText = `
        position: fixed;
        top: ${state.position.y}px;
        left: ${state.position.x}px;
        width: ${state.size.width}px;
        height: ${state.size.height}px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        pointer-events: auto;
    `;
    
    // Create shadow DOM for style isolation
    const shadowRoot = container.attachShadow({ mode: 'closed' });
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        .clipboard-window {
            width: 100%;
            height: 100%;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            font-family: inherit;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            overflow: hidden;
            position: relative;
        }
        
        .clipboard-window.paste-ready {
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.3), 0 8px 32px rgba(0, 0, 0, 0.3);
            border-color: rgba(255, 255, 255, 0.4);
        }
        
        .clipboard-header {
            background: #333;
            padding: 8px 12px;
            border-bottom: 1px solid #444;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            user-select: none;
            min-height: 32px;
        }
        
        .clipboard-title {
            color: #fff;
            font-size: 13px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        
        .clipboard-controls {
            display: flex;
            gap: 4px;
            opacity: 0;
            transition: opacity 0.2s ease;
        }
        
        .clipboard-header:hover .clipboard-controls {
            opacity: 1;
        }
        
        .control-button {
            background: none;
            border: none;
            color: #ccc;
            padding: 4px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        }
        
        .control-button:hover {
            background: #444;
            color: #fff;
        }
        
        .clipboard-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        
        .clipboard-list-container {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
        }
        
        .clipboard-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #666;
        }
        
        .empty-icon {
            font-size: 32px;
            margin-bottom: 12px;
        }
        
        .empty-text {
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .empty-hint {
            font-size: 12px;
            color: #555;
        }
        
        .clipboard-item {
            background: #333;
            border: 1px solid #444;
            border-radius: 6px;
            padding: 10px;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
        }
        
        .clipboard-item:hover {
            background: #3a3a3a;
            border-color: #555;
        }
        
        .clipboard-item.pinned {
            border-left: 3px solid #ffd700;
        }
        
        .clipboard-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }
        
        .clipboard-item-meta {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 10px;
            color: #888;
        }
        
        .clipboard-item-controls {
            display: flex;
            gap: 2px;
            opacity: 0;
            transition: opacity 0.2s;
        }
        
        .clipboard-item:hover .clipboard-item-controls {
            opacity: 1;
        }
        
        .item-button {
            background: none;
            border: none;
            color: #888;
            cursor: pointer;
            padding: 2px 4px;
            border-radius: 2px;
            font-size: 10px;
            transition: all 0.2s;
        }
        
        .item-button:hover {
            background: rgba(255, 255, 255, 0.1);
        }
        
        .pin-button:hover {
            color: #ffd700;
        }
        
        .pin-button.pinned {
            color: #ffd700;
        }
        
        .edit-button:hover {
            color: #0066cc;
        }
        
        .delete-button:hover {
            color: #ff4444;
        }
        
        .clipboard-item-preview {
            font-size: 12px;
            line-height: 1.4;
            color: #ccc;
            max-height: 60px;
            overflow: hidden;
            white-space: pre-wrap;
            word-break: break-word;
        }
        
        .clipboard-item-tag {
            background: #0066cc;
            color: #fff;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9px;
        }
        
        /* Scrollbar styling */
        .clipboard-list-container::-webkit-scrollbar {
            width: 6px;
        }
        
        .clipboard-list-container::-webkit-scrollbar-track {
            background: #2a2a2a;
        }
        
        .clipboard-list-container::-webkit-scrollbar-thumb {
            background: #444;
            border-radius: 3px;
        }
        
        .clipboard-list-container::-webkit-scrollbar-thumb:hover {
            background: #555;
        }
        
        /* Focus outline removal */
        .clipboard-window:focus {
            outline: none;
        }
    `;
    
    shadowRoot.appendChild(style);
    
    // Create window structure
    const window = createWindowStructure();
    shadowRoot.appendChild(window);
    
    // Store references
    state.shadowRoot = shadowRoot;
    state.container = container;
    
    return container;
}

/**
 * Create the window structure
 */
function createWindowStructure() {
    const window = document.createElement('div');
    window.className = 'clipboard-window';
    window.tabIndex = -1;
    
    // Header
    const header = document.createElement('div');
    header.className = 'clipboard-header';
    header.innerHTML = `
        <div class="clipboard-title">
            📋 Clipboard Manager
        </div>
        <div class="clipboard-controls">
            <button class="control-button paste-button" title="Paste from clipboard">📋</button>
            <button class="control-button clear-all-button" title="Clear all">🗑️</button>
            <button class="control-button close-button" title="Close">✕</button>
        </div>
    `;
    
    // Content area
    const content = document.createElement('div');
    content.className = 'clipboard-content';
    
    // List container
    const listContainer = document.createElement('div');
    listContainer.className = 'clipboard-list-container';
    
    const list = document.createElement('div');
    list.className = 'clipboard-list';
    list.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">📋</div>
            <div class="empty-text">No clipboard items yet</div>
            <div class="empty-hint">Press Ctrl+V to paste content</div>
        </div>
    `;
    
    listContainer.appendChild(list);
    content.appendChild(listContainer);
    
    window.appendChild(header);
    window.appendChild(content);
    
    return window;
}

// ============ EVENT HANDLERS ============

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    if (!state.shadowRoot) return;
    
    // Drag functionality
    setupDragFunctionality();
    
    // Window focus for paste readiness
    setupFocusHandling();
    
    // Paste handling
    setupPasteHandling();
    
    // Button handlers
    setupButtonHandlers();
    
    // Keyboard shortcuts
    setupKeyboardShortcuts();
}

/**
 * Setup drag functionality
 */
function setupDragFunctionality() {
    const header = state.shadowRoot.querySelector('.clipboard-header');
    if (!header) return;
    
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.clipboard-controls')) return;
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        const container = state.container;
        startLeft = parseInt(container.style.left) || state.position.x;
        startTop = parseInt(container.style.top) || state.position.y;
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        document.body.style.cursor = 'move';
        e.preventDefault();
    });
    
    function onMouseMove(e) {
        if (!isDragging) return;
        
        let newLeft = startLeft + (e.clientX - startX);
        let newTop = startTop + (e.clientY - startY);
        
        // Boundary constraints
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        newLeft = Math.max(-300, newLeft);
        newLeft = Math.min(windowWidth - 50, newLeft);
        newTop = Math.max(0, newTop);
        newTop = Math.min(windowHeight - 50, newTop);
        
        // Update position
        const container = state.container;
        container.style.left = newLeft + 'px';
        container.style.top = newTop + 'px';
        
        state.position.x = newLeft;
        state.position.y = newTop;
    }
    
    function onMouseUp() {
        if (!isDragging) return;
        
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        
        // Save position
        savePosition();
    }
}

/**
 * Setup focus handling for paste readiness
 */
function setupFocusHandling() {
    const window = state.shadowRoot.querySelector('.clipboard-window');
    if (!window) return;
    
    // Focus window when shown
    window.addEventListener('click', () => {
        window.focus();
        setPasteReady(true);
    });
    
    // Lose focus when clicking outside
    document.addEventListener('click', (e) => {
        if (!state.container.contains(e.target)) {
            setPasteReady(false);
        }
    });
    
    // Focus/blur events
    window.addEventListener('focus', () => setPasteReady(true));
    window.addEventListener('blur', () => setPasteReady(false));
}

/**
 * Setup paste handling
 */
function setupPasteHandling() {
    const window = state.shadowRoot.querySelector('.clipboard-window');
    if (!window) return;
    
    window.addEventListener('keydown', async (e) => {
        if (e.ctrlKey && e.key === 'v' && state.isPasteReady) {
            e.preventDefault();
            
            try {
                const text = await navigator.clipboard.readText();
                if (text && text.trim()) {
            await addItem(text, 'paste');
                }
            } catch (error) {
                console.error('❌ Failed to paste:', error);
                showMessage('Failed to paste. Try copying text first.', 'error');
            }
        }
    });
}

/**
 * Setup button handlers
 */
function setupButtonHandlers() {
    const shadowRoot = state.shadowRoot;
    
    // Close button
    const closeBtn = shadowRoot.querySelector('.close-button');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideClipboardManager);
    }
    
    // Paste button
    const pasteBtn = shadowRoot.querySelector('.paste-button');
    if (pasteBtn) {
        pasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text && text.trim()) {
                    await addItem(text, 'paste');
                }
            } catch (error) {
                console.error('❌ Failed to paste:', error);
                showMessage('Failed to paste. Try copying text first.', 'error');
            }
        });
    }
    
    // Clear all button
    const clearBtn = shadowRoot.querySelector('.clear-all-button');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllItems);
    }
}

/**
 * Setup keyboard shortcuts - handled by teleprompter overlay
 */
function setupKeyboardShortcuts() {
    // Keyboard shortcuts are handled by teleprompter-overlay.js
    // This avoids conflicts between the two scripts
}

// ============ UTILITY FUNCTIONS ============

/**
 * Set paste ready state
 */
function setPasteReady(ready) {
    state.isPasteReady = ready;
    const window = state.shadowRoot?.querySelector('.clipboard-window');
    if (window) {
        if (ready) {
            window.classList.add('paste-ready');
            window.focus();
        } else {
            window.classList.remove('paste-ready');
        }
    }
}

/**
 * Show temporary message
 */
function showMessage(text, type = 'info') {
    // Create message element
    let messageEl = document.getElementById('clipboard-message');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = 'clipboard-message';
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            z-index: 2147483648;
            transition: opacity 0.3s;
            pointer-events: none;
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

// ============ STORAGE OPERATIONS ============

/**
 * Load clipboard items from storage
 */
async function loadItems() {
    try {
        const result = await chrome.storage.local.get([CONFIG.STORAGE_KEY, CONFIG.SETTINGS_KEY]);
        
        state.settings = { ...state.settings, ...result[CONFIG.SETTINGS_KEY] };
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
        await chrome.storage.local.set({
            [CONFIG.STORAGE_KEY]: state.items,
            [CONFIG.SETTINGS_KEY]: state.settings
        });
        
        console.log(`💾 Saved ${state.items.length} clipboard items`);
    } catch (error) {
        console.error('❌ Failed to save clipboard items:', error);
    }
}

/**
 * Load window position
 */
async function loadPosition() {
    try {
        const result = await chrome.storage.local.get([CONFIG.POSITION_KEY, CONFIG.SIZE_KEY]);
        
        if (result[CONFIG.POSITION_KEY]) {
            state.position = { ...state.position, ...result[CONFIG.POSITION_KEY] };
        }
        if (result[CONFIG.SIZE_KEY]) {
            state.size = { ...state.size, ...result[CONFIG.SIZE_KEY] };
        }
    } catch (error) {
        console.error('❌ Failed to load position:', error);
    }
}

/**
 * Save window position
 */
async function savePosition() {
    try {
        await chrome.storage.local.set({
            [CONFIG.POSITION_KEY]: state.position,
            [CONFIG.SIZE_KEY]: state.size
        });
    } catch (error) {
        console.error('❌ Failed to save position:', error);
    }
}

/**
 * Add new clipboard item
 */
async function addItem(text, source = 'manual', noteId = null) {
    if (!text || !text.trim()) return;
    
    const cleanText = text.trim();
    
    // For notes, check if we already have an item with this noteId
    if (noteId && source === 'notes') {
        const existingIndex = state.items.findIndex(item => item.noteId === noteId);
        if (existingIndex !== -1) {
            // Update existing note item
            const existingItem = state.items[existingIndex];
            state.items[existingIndex] = {
                ...existingItem,
                text: cleanText,
                preview: cleanText.length > CONFIG.PREVIEW_LENGTH 
                    ? cleanText.substring(0, CONFIG.PREVIEW_LENGTH) + '...' 
                    : cleanText,
                timestamp: Date.now(),
                source
            };
            
            await saveItems();
            updateUI();
            console.log(`🔄 Updated note item: "${cleanText.substring(0, 50)}..."`);
            return;
        }
    }
    
    // Check for text duplicates (for non-note items or new notes)
    const existingIndex = state.items.findIndex(item => item.text === cleanText);
    if (existingIndex !== -1) {
        // Move existing item to top
        const existingItem = state.items[existingIndex];
        state.items.splice(existingIndex, 1);
        state.items.unshift({
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
            preview: cleanText.length > CONFIG.PREVIEW_LENGTH 
                ? cleanText.substring(0, CONFIG.PREVIEW_LENGTH) + '...' 
                : cleanText,
            timestamp: Date.now(),
            pinned: false,
            source,
            tag: null,
            noteId: noteId || null
        };
        
        state.items.unshift(newItem);
    }
    
    // Auto-trim if over limit
    if (state.items.length > state.settings.limit) {
        const unpinnedItems = state.items.filter(item => !item.pinned);
        const pinnedItems = state.items.filter(item => item.pinned);
        const keepCount = state.settings.limit - pinnedItems.length;
        const keptUnpinned = unpinnedItems.slice(0, Math.max(0, keepCount));
        state.items = [...pinnedItems, ...keptUnpinned];
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
        state.items.splice(index, 1);
        await saveItems();
        updateUI();
    }
}

/**
 * Toggle pin status
 */
async function togglePin(itemId) {
    const item = state.items.find(item => item.id === itemId);
    if (item) {
        item.pinned = !item.pinned;
        
        // Re-sort: pinned first, then by timestamp
        state.items.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return b.timestamp - a.timestamp;
        });
        
        await saveItems();
        updateUI();
    }
}

/**
 * Clear all items
 */
async function clearAllItems() {
    if (state.items.length === 0) return;
    
    const confirmed = confirm(`Clear all ${state.items.length} clipboard items?`);
    if (confirmed) {
        state.items = [];
        await saveItems();
        updateUI();
    }
}

/**
 * Copy item to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        // Removed success notification
    } catch (error) {
        console.error('❌ Failed to copy:', error);
        showMessage('Failed to copy to clipboard', 'error');
    }
}

/**
 * Edit item in notes
 */
function editInNotes(text) {
    // Send message to notes to open with this content
    chrome.runtime.sendMessage({
        action: 'openTeleprompterWithContent',
        content: text
    });
    
    // Removed success notification
}

// ============ UI OPERATIONS ============

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
                <button class="item-button pin-button${item.pinned ? ' pinned' : ''}" title="${item.pinned ? 'Unpin' : 'Pin'}" data-action="pin">
                    ${item.pinned ? '📌' : '📍'}
                </button>
                <button class="item-button edit-button" title="Open in Notes" data-action="edit">✏️</button>
                <button class="item-button delete-button" title="Delete" data-action="delete">🗑️</button>
            </div>
        </div>
        <div class="clipboard-item-preview">${escapeHtml(item.preview)}</div>
    `;
    
    // Click to copy
    itemEl.addEventListener('click', (e) => {
        if (!e.target.closest('.clipboard-item-controls')) {
            copyToClipboard(item.text);
        }
    });
    
    // Control buttons
    itemEl.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action === 'pin') {
            e.stopPropagation();
            togglePin(item.id);
        } else if (action === 'edit') {
            e.stopPropagation();
            editInNotes(item.text);
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
    const listEl = state.shadowRoot?.querySelector('.clipboard-list');
    if (!listEl) return;
    
    if (state.items.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <div class="empty-text">No clipboard items yet</div>
                <div class="empty-hint">Press Ctrl+V to paste content</div>
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
    // Re-render items
    renderItems();
}

// ============ UTILITY FUNCTIONS ============

/**
 * Get time ago string
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
        paste: '📝',
        context: '🖱️',
        notes: '📒',
        teleprompter: '📒' // Legacy support, should be 'notes' now
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

// ============ MAIN FUNCTIONS ============

/**
 * Show clipboard manager
 */
async function showClipboardManager() {
    if (state.isVisible) return;
    
    try {
        // Load data
        await loadPosition();
        await loadItems();
        
        // Create window
        const container = createClipboardWindow();
        document.body.appendChild(container);
        
        // Setup events
        setupEventListeners();
        
        // Update UI
        updateUI();
        
        // Set state
        state.isVisible = true;
        
        // Focus and set paste ready
        setTimeout(() => {
            const window = state.shadowRoot?.querySelector('.clipboard-window');
            if (window) {
                window.focus();
                setPasteReady(true);
            }
        }, 100);
        
        console.log('📋 Clipboard manager shown');
        
    } catch (error) {
        console.error('❌ Failed to show clipboard manager:', error);
    }
}

/**
 * Hide clipboard manager
 */
function hideClipboardManager() {
    if (!state.isVisible) return;
    
    try {
        if (state.container && state.container.parentNode) {
            state.container.parentNode.removeChild(state.container);
        }
        
        state.isVisible = false;
        state.isPasteReady = false;
        state.shadowRoot = null;
        state.container = null;
        
        console.log('📋 Clipboard manager hidden');
        
    } catch (error) {
        console.error('❌ Failed to hide clipboard manager:', error);
    }
}

/**
 * Toggle clipboard manager visibility
 */
function toggleClipboardManager() {
    if (state.isVisible) {
        hideClipboardManager();
    } else {
        showClipboardManager();
    }
}

// ============ MESSAGE HANDLING ============

/**
 * Handle messages from background script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'toggleClipboardManager':
            toggleClipboardManager();
            sendResponse({ success: true });
            break;
            
        case 'addToClipboard':
            if (request.text) {
                addItem(request.text, request.source || 'external', request.noteId).then(() => {
                    sendResponse({ success: true });
                });
                return true; // Keep message channel open for async response
            }
            break;
            
        case 'refreshClipboard':
            // Refresh the clipboard UI
            if (state.isVisible) {
                loadItems().then(() => {
                    updateUI();
                });
            }
            sendResponse({ success: true });
            break;
            
        default:
            break;
    }
});

// ============ INITIALIZATION ============

/**
 * Initialize clipboard manager
 */
async function initializeClipboardManager() {
    if (state.isInitialized) return;
    
    console.log('🚀 Initializing Clipboard Manager Overlay');
    
    try {
        // Load initial data
        await loadItems();
        
        state.isInitialized = true;
        console.log('✅ Clipboard Manager Overlay initialized');
        
    } catch (error) {
        console.error('❌ Failed to initialize clipboard manager overlay:', error);
    }
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeClipboardManager);
} else {
    initializeClipboardManager();
}
