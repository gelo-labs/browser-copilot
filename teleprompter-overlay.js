// GeloLabs Teleprompter & Sticky Notes Overlay
// Runs on all sites to provide floating notes and teleprompter functionality

(function() {
    'use strict';
    
    // Prevent multiple instances
    if (window.geloLabsTeleprompterLoaded) return;
    window.geloLabsTeleprompterLoaded = true;
    
    console.log('🎬 GeloLabs Teleprompter loading...');
    
    // Configuration
    const CONFIG = {
        CONTAINER_ID: 'gelolabs-teleprompter-container',
        STORAGE_KEY_PREFIX: 'gelolabs_teleprompter_',
        DEFAULT_POSITION: { x: 100, y: 100 },
        DEFAULT_SIZE: { width: 400, height: 300 },
        MIN_SIZE: { width: 250, height: 150 },
        MAX_SIZE: { width: 800, height: 600 },
        SCROLL_SPEEDS: { min: 2.5, max: 80, default: 10 }, // pixels per second
        AUTO_SAVE_DELAY: 1000,
        Z_INDEX: 2147483647 // Maximum z-index
    };
    
    // Global state
    let state = {
        isVisible: false,
        mode: 'editor', // 'editor' or 'teleprompter'
        position: { ...CONFIG.DEFAULT_POSITION },
        size: { ...CONFIG.DEFAULT_SIZE },
        opacity: 100,
        mirrorMode: false,
        currentNote: null,
        notes: [],
        
        // Teleprompter state
        isScrolling: false,
        scrollSpeed: CONFIG.SCROLL_SPEEDS.default,
        fontSize: 24,
        lineSpacing: 1.4,
        paragraphSnap: false,
        
        // Editor state
        autoSaveTimer: null,
        
        // DOM references
        container: null,
        shadowRoot: null,
        header: null,
        content: null,
        toolbar: null,
        resizeHandle: null
    };
    
    // ============ SHADOW DOM & CONTAINER MANAGEMENT ============
    
    function createShadowContainer() {
        // Create main container
        const container = document.createElement('div');
        container.id = CONFIG.CONTAINER_ID;
        container.style.cssText = `
            position: fixed !important;
            top: ${state.position.y}px !important;
            left: ${state.position.x}px !important;
            width: ${state.size.width}px !important;
            height: ${state.size.height}px !important;
            z-index: ${CONFIG.Z_INDEX} !important;
            pointer-events: auto !important;
            font-family: system-ui, -apple-system, sans-serif !important;
        `;
        
        // Create shadow root for complete style isolation
        const shadowRoot = container.attachShadow({ mode: 'closed' });
        
        // Inject comprehensive styles
        const styles = createStyles();
        shadowRoot.appendChild(styles);
        
        // Create main window structure
        const window = createWindowStructure();
        shadowRoot.appendChild(window);
        
        // Store references
        state.container = container;
        state.shadowRoot = shadowRoot;
        
        // Set up event listeners
        setupEventListeners();
        
        return container;
    }
    
    function createStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Reset and base styles */
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            
            .teleprompter-window {
                width: 100%;
                height: 100%;
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 8px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                opacity: ${state.opacity / 100};
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                outline: none;
            }
            
            .teleprompter-window:focus {
                outline: none;
                border: 1px solid #444;
            }
            
            /* Removed drag area indicator - no visual bar needed */
            
            .teleprompter-header {
                background: #1e1e1e;
                border-bottom: 1px solid #444;
                padding: 4px 8px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: move;
                user-select: none;
                min-height: 24px;
                position: relative;
            }
            
            .header-left {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
            }
            
            .mode-toggle {
                background: #444;
                border: none;
                color: #fff;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .mode-toggle:hover {
                background: #555;
            }
            
            .mode-toggle.active {
                background: #0066cc;
            }
            
            .header-controls {
                display: flex;
                align-items: center;
                gap: 6px;
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            
            .teleprompter-header:hover .header-controls {
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
            
            /* Opacity slider removed */
            
            .teleprompter-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                position: relative;
            }
            
            .editor-toolbar {
                background: #333;
                border-top: 1px solid #444;
                padding: 6px 8px;
                display: flex;
                align-items: center;
                gap: 4px;
                flex-wrap: wrap;
                order: 3;
                cursor: grab;
                position: relative;
            }
            
            .editor-toolbar:active {
                cursor: grabbing;
            }
            
            .editor-toolbar::before {
                content: '⋮⋮';
                color: #666;
                font-size: 12px;
                margin-right: 4px;
                line-height: 1;
                letter-spacing: -2px;
            }
            
            .toolbar-button {
                background: #444;
                border: none;
                color: #ccc;
                padding: 4px 6px;
                border-radius: 3px;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s;
                min-width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .toolbar-button:hover {
                background: #555;
                color: #fff;
            }
            
            .toolbar-button.active {
                background: #0066cc;
                color: #fff;
            }
            
            .toolbar-separator {
                width: 1px;
                height: 16px;
                background: #555;
                margin: 0 2px;
            }
            
            .editor-area {
                flex: 1;
                width: 100%;
                padding: 16px;
                background: #2a2a2a;
                color: #fff;
                border: none;
                outline: none;
                font-family: inherit;
                font-size: 14px;
                line-height: 1.5;
                overflow-y: auto;
                resize: none;
                order: 2;
                scrollbar-width: none; /* Firefox */
                -ms-overflow-style: none; /* IE/Edge */
                box-sizing: border-box;
            }
            
            .editor-area::-webkit-scrollbar {
                display: none; /* Chrome/Safari */
            }
            
            .editor-area:focus {
                outline: none;
                box-shadow: none;
            }
            
            /* Remove spell check and error highlighting */
            .editor-area * {
                text-decoration: none !important;
                background: transparent !important;
                background-color: transparent !important;
            }
            
            .editor-area::spelling-error,
            .editor-area::grammar-error {
                text-decoration: none !important;
                background: none !important;
            }
            
            /* Ensure good contrast for all text elements */
            .editor-area p,
            .editor-area div,
            .editor-area span,
            .editor-area h1,
            .editor-area h2,
            .editor-area h3,
            .editor-area h4,
            .editor-area h5,
            .editor-area h6,
            .editor-area li,
            .editor-area blockquote,
            .editor-area strong,
            .editor-area em,
            .editor-area b,
            .editor-area i {
                color: #e0e0e0 !important;
                background: transparent !important;
                background-color: transparent !important;
            }
            
            .teleprompter-view {
                flex: 1;
                padding: 24px;
                background: #1a1a1a;
                color: #fff;
                font-size: ${state.fontSize}px;
                line-height: ${state.lineSpacing};
                overflow-y: auto;
                scroll-behavior: smooth;
                transform: ${state.mirrorMode ? 'scaleX(-1)' : 'none'};
                scrollbar-width: none; /* Firefox */
                -ms-overflow-style: none; /* IE/Edge */
            }
            
            .teleprompter-view::-webkit-scrollbar {
                display: none; /* Chrome/Safari */
            }
            
            .teleprompter-view ul,
            .teleprompter-view ol {
                margin-left: 0;
                padding-left: 20px;
            }
            
            .teleprompter-view li {
                margin-bottom: 4px;
            }
            
            .teleprompter-controls {
                background: #333;
                border-top: 1px solid #444;
                padding: 8px 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                cursor: grab;
                position: relative;
            }
            
            .teleprompter-controls:active {
                cursor: grabbing;
            }
            
            .teleprompter-controls::before {
                content: '⋮⋮';
                color: #666;
                font-size: 12px;
                margin-right: 8px;
                line-height: 1;
                letter-spacing: -2px;
            }
            
            .teleprompter-button {
                background: #444;
                border: none;
                color: #fff;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .teleprompter-button:hover {
                background: #555;
            }
            
            .teleprompter-button.playing {
                background: #0066cc;
            }
            
            .speed-control {
                display: flex;
                align-items: center;
                gap: 6px;
                color: #ccc;
                font-size: 11px;
            }
            
            .speed-slider {
                width: 80px;
                height: 3px;
                background: #444;
                border-radius: 2px;
                outline: none;
                cursor: pointer;
            }
            
            .resize-handle {
                position: absolute;
                bottom: 0;
                right: 0;
                width: 20px;
                height: 20px;
                cursor: nw-resize;
                background: linear-gradient(-45deg, transparent 40%, #666 40%, #666 50%, transparent 50%);
            }
            
            .resize-handle:hover {
                background: linear-gradient(-45deg, transparent 40%, #888 40%, #888 50%, transparent 50%);
            }
            
            /* High contrast theme */
            @media (prefers-contrast: high) {
                .teleprompter-window {
                    background: #000;
                    border-color: #fff;
                }
                
                .teleprompter-header {
                    background: #000;
                    border-color: #fff;
                }
                
                .header-title {
                    color: #fff;
                }
                
                .editor-area, .teleprompter-view {
                    background: #000;
                    color: #fff;
                }
            }
            
            /* Reduced motion */
            @media (prefers-reduced-motion: reduce) {
                .teleprompter-view {
                    scroll-behavior: auto;
                }
                
                * {
                    transition: none !important;
                }
            }
            
            /* Focus styles for accessibility */
            .control-button:focus,
            .toolbar-button:focus,
            .teleprompter-button:focus {
                outline: 2px solid #0066cc;
                outline-offset: 2px;
            }
            
            .edit-mode-btn {
                background: #0066cc !important;
                color: #fff !important;
            }
            
            .mode-toggle-btn {
                background: #0066cc !important;
                color: #fff !important;
            }
        `;
        
        return style;
    }
    
    function createWindowStructure() {
        const window = document.createElement('div');
        window.className = 'teleprompter-window';
        window.setAttribute('role', 'dialog');
        window.setAttribute('aria-label', 'Sticky Notes');
        
        // Editor area (full height)
        const editor = createEditor();
        window.appendChild(editor);
        
        // Floating close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.style.cssText = `
            position: absolute;
            top: 4px;
            right: 4px;
            background: none;
            border: none;
            color: #666;
            font-size: 14px;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 30;
            padding: 2px;
        `;
        closeButton.addEventListener('click', hideWindow);
        window.appendChild(closeButton);
        
        // Floating autoscroll controls (hidden by default)
        const controls = createFloatingAutoscrollControls();
        window.appendChild(controls);
        
        // Resize handle (bottom-right corner)
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        resizeHandle.style.cssText = `
            position: absolute;
            bottom: 2px;
            right: 2px;
            width: 12px;
            height: 12px;
            background: none;
            cursor: nw-resize;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 30;
            font-size: 10px;
            color: #666;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        resizeHandle.innerHTML = '◢';
        window.appendChild(resizeHandle);
        
        // Show controls, close button, and resize handle on hover
        window.addEventListener('mouseenter', () => {
            controls.style.opacity = '1';
            closeButton.style.opacity = '1';
            resizeHandle.style.opacity = '1';
        });
        window.addEventListener('mouseleave', () => {
            controls.style.opacity = '0';
            closeButton.style.opacity = '0';
            resizeHandle.style.opacity = '0';
        });
        
        state.resizeHandle = resizeHandle;
        
        return window;
    }
    
    // createMinimalHeader removed - no top bar needed
    
    
    function createEditor() {
        // Editor area
        const editor = document.createElement('div');
        editor.className = 'editor-area';
        editor.contentEditable = true;
        editor.setAttribute('role', 'textbox');
        editor.setAttribute('aria-label', 'Note editor');
        editor.setAttribute('spellcheck', 'false');
        editor.setAttribute('autocorrect', 'off');
        editor.setAttribute('autocapitalize', 'off');
        editor.innerHTML = state.currentNote?.content || '<p>Start typing your notes...</p>';
        editor.style.cssText = `
            flex: 1;
            padding: 16px;
            background: #2a2a2a;
            color: #fff;
            border: none;
            outline: none;
            font-family: inherit;
            font-size: 14px;
            line-height: 1.5;
            overflow-y: auto;
            resize: none;
            scrollbar-width: none;
            -ms-overflow-style: none;
        `;
        
        // Hide webkit scrollbar
        const style = document.createElement('style');
        style.textContent = `.editor-area::-webkit-scrollbar { display: none; }`;
        editor.appendChild(style);
        
        // Handle paste events to preserve formatting
        editor.addEventListener('paste', (e) => {
            e.preventDefault();
            
            // Get pasted data
            const clipboardData = e.clipboardData || window.clipboardData;
            const htmlData = clipboardData.getData('text/html');
            const textData = clipboardData.getData('text/plain');
            
            // Insert HTML if available, otherwise plain text
            if (htmlData) {
                document.execCommand('insertHTML', false, htmlData);
            } else {
                document.execCommand('insertText', false, textData);
            }
            
            // Trigger auto-save
            clearTimeout(state.autoSaveTimer);
            state.autoSaveTimer = setTimeout(() => {
                saveCurrentNote();
            }, CONFIG.AUTO_SAVE_DELAY);
        });
        
        return editor;
    }
    
    function createFloatingAutoscrollControls() {
        const controls = document.createElement('div');
        controls.className = 'floating-autoscroll-controls';
        controls.style.cssText = `
            position: absolute;
            bottom: 4px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            border: 1px solid #444;
            border-radius: 6px;
            padding: 6px 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 20;
            font-size: 11px;
        `;
        
        // Play/Pause button
        const playButton = document.createElement('button');
        playButton.className = 'play-button';
        
        // Create image for play button
        const playIcon = document.createElement('img');
        try {
            playIcon.src = chrome.runtime.getURL('playbutton.png');
            playIcon.style.cssText = `
                width: 16px;
                height: 16px;
                filter: invert(1);
            `;
            playButton.appendChild(playIcon);
        } catch (error) {
            console.log('Extension context invalidated, using fallback play button');
            // Use Unicode play symbol as fallback
            const playSpan = document.createElement('span');
            playSpan.textContent = '▶';
            playSpan.style.cssText = `
                font-size: 12px;
                color: #fff;
                display: block;
                line-height: 16px;
                text-align: center;
            `;
            playButton.appendChild(playSpan);
        }
        
        playButton.style.cssText = `
            background: none;
            border: none;
            cursor: pointer;
            padding: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Speed slider (compact)
        const speedSlider = document.createElement('input');
        speedSlider.type = 'range';
        speedSlider.className = 'speed-slider';
        speedSlider.min = CONFIG.SCROLL_SPEEDS.min;
        speedSlider.max = CONFIG.SCROLL_SPEEDS.max;
        speedSlider.value = state.scrollSpeed;
        speedSlider.style.cssText = `
            width: 60px;
            height: 2px;
            background: #444;
            border-radius: 1px;
            outline: none;
            cursor: pointer;
        `;
        
        controls.appendChild(playButton);
        controls.appendChild(speedSlider);
        
        return controls;
    }
    
    // createToolbar removed - using autoscroll controls instead
    
    // Teleprompter functions removed - using single editor with autoscroll
    
    // ============ EVENT LISTENERS ============
    
    function setupEventListeners() {
        // Top edge drag functionality
        setupDragFunctionality();
        
        // Resize functionality
        setupResizeFunctionality();
        
        // Autoscroll functionality
        setupAutoscrollListeners();
        
        // Button event listeners
        setupButtonListeners();
        
        // Keyboard shortcuts
        setupKeyboardShortcuts();
        
        // Auto-save for editor
        setupAutoSave();
    }
    
    function setupDragFunctionality() {
        const window = state.shadowRoot.querySelector('.teleprompter-window');
        if (!window) return;
        
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        window.addEventListener('mousedown', (e) => {
            // Skip if clicking on buttons or controls
            if (e.target.closest('button, input, .floating-autoscroll-controls, .resize-handle')) {
                return;
            }
            
            // Only drag from top 30px
            const rect = window.getBoundingClientRect();
            if (e.clientY - rect.top > 30) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            // Get current position from container style
            const container = state.container;
            console.log('🔍 Container style before parsing:', {
                left: container.style.left,
                top: container.style.top
            });
            
            startLeft = parseInt(container.style.left) || 100;
            startTop = parseInt(container.style.top) || 100;
            
            console.log('🔍 Parsed values:', {
                startLeft,
                startTop,
                startLeftIsNaN: isNaN(startLeft),
                startTopIsNaN: isNaN(startTop)
            });
            
            console.log('🎯 Drag start:', { startX, startY, startLeft, startTop });
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            
            document.body.style.cursor = 'move';
            e.preventDefault();
        });
        
        function onMouseMove(e) {
            if (!isDragging) return;
            
            let newLeft = startLeft + (e.clientX - startX);
            let newTop = startTop + (e.clientY - startY);
            
            // Debug all values before constraints
            console.log('🔍 Before constraints:', {
                startLeft, startTop, startX, startY,
                clientX: e.clientX, clientY: e.clientY,
                newLeft, newTop,
                newLeftIsNaN: isNaN(newLeft),
                newTopIsNaN: isNaN(newTop)
            });
            
            // Check for NaN and reset if needed
            if (isNaN(newLeft) || isNaN(newTop)) {
                console.error('❌ NaN detected in drag calculation, skipping');
                return;
            }
            
            // Simple boundary constraints without complex calculations
            const windowWidth = window.innerWidth || 1920;
            const windowHeight = window.innerHeight || 1080;
            
            // Keep window mostly visible with fine-tuned alignment
            // Left: allow only 100px to go off-screen (keep close button very accessible)
            // Right: allow window to go right to the very edge
            // Bottom: allow window to go lower
            newLeft = Math.max(-100, newLeft);              // Left boundary (more restrictive)
            newLeft = Math.min(windowWidth - 5, newLeft);   // Right boundary (almost no restriction)
            newTop = Math.max(0, newTop);                   // Top boundary (unchanged)
            newTop = Math.min(windowHeight - 40, newTop);   // Bottom boundary (less restrictive)
            
            // Update container directly
            const container = state.container;
            container.style.left = newLeft + 'px';
            container.style.top = newTop + 'px';
            
            // Update state
            state.position.x = newLeft;
            state.position.y = newTop;
            
            console.log('🎯 Dragging:', { x: newLeft, y: newTop });
        }
        
        function onMouseUp() {
            if (!isDragging) return;
            
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            
            document.body.style.cursor = 'default';
            saveSettings();
            
            console.log('🏁 Drag ended at:', state.position);
        }
    }
    
    function setupResizeFunctionality() {
        let isResizing = false;
        let resizeStart = { x: 0, y: 0 };
        let sizeStart = { width: 0, height: 0 };
        
        const resizeHandle = state.resizeHandle;
        if (!resizeHandle) {
            console.log('❌ Resize handle not found');
            return;
        }
        
        console.log('📏 Setting up resize functionality');
        
        resizeHandle.addEventListener('mousedown', (e) => {
            console.log('✅ Starting resize');
            isResizing = true;
            resizeStart = { x: e.clientX, y: e.clientY };
            sizeStart = { width: state.size.width, height: state.size.height };
            
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', handleResizeEnd);
            
            e.preventDefault();
            e.stopPropagation();
        });
        
        function handleResize(e) {
            if (!isResizing) return;
            
            const deltaX = e.clientX - resizeStart.x;
            const deltaY = e.clientY - resizeStart.y;
            
            state.size.width = Math.max(CONFIG.MIN_SIZE.width, 
                                       Math.min(CONFIG.MAX_SIZE.width, sizeStart.width + deltaX));
            state.size.height = Math.max(CONFIG.MIN_SIZE.height, 
                                        Math.min(CONFIG.MAX_SIZE.height, sizeStart.height + deltaY));
            
            console.log('📏 Resizing to:', state.size);
            updateSize();
            
            e.preventDefault();
        }
        
        function handleResizeEnd(e) {
            console.log('🏁 Resize ended');
            isResizing = false;
            document.removeEventListener('mousemove', handleResize);
            document.removeEventListener('mouseup', handleResizeEnd);
            saveSettings();
            e.preventDefault();
        }
    }
    
    function setupButtonListeners() {
        // Mode toggle buttons (in toolbar and teleprompter controls)
        const modeToggleButtons = state.shadowRoot.querySelectorAll('[data-action="toggle-mode"]');
        modeToggleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                toggleMode();
            });
        });
    }
    
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when window is visible and focused
            if (!state.isVisible || !state.shadowRoot.activeElement) return;
            
            if (state.mode === 'teleprompter') {
                handleTeleprompterShortcuts(e);
            } else {
                handleEditorShortcuts(e);
            }
        });
    }
    
    function handleTeleprompterShortcuts(e) {
        const view = state.shadowRoot.querySelector('.teleprompter-view');
        
        switch (e.code) {
            case 'Space':
                e.preventDefault();
                toggleScrolling();
                break;
            case 'Home':
                e.preventDefault();
                view.scrollTop = 0;
                pauseScrolling();
                break;
            case 'End':
                e.preventDefault();
                view.scrollTop = view.scrollHeight;
                pauseScrolling();
                break;
            case 'ArrowUp':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    adjustSpeed(5);
                }
                break;
            case 'ArrowDown':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    adjustSpeed(-5);
                }
                break;
        }
    }
    
    function handleEditorShortcuts(e) {
        // Standard formatting shortcuts
        if (e.ctrlKey || e.metaKey) {
            let command = null;
            
            switch (e.key.toLowerCase()) {
                case 'b': command = 'bold'; break;
                case 'i': command = 'italic'; break;
                case 'u': command = 'underline'; break;
            }
            
            if (command) {
                e.preventDefault();
                document.execCommand(command);
                updateToolbarState();
            }
        }
    }
    
    function setupAutoSave() {
        const editor = state.shadowRoot?.querySelector('.editor-area');
        if (!editor) return;
        
        editor.addEventListener('input', () => {
            clearTimeout(state.autoSaveTimer);
            state.autoSaveTimer = setTimeout(() => {
                saveCurrentNote();
            }, CONFIG.AUTO_SAVE_DELAY);
        });
        
        editor.addEventListener('blur', () => {
            saveCurrentNote();
        });
    }
    
    // ============ WINDOW MANAGEMENT ============
    
    function showWindow() {
        if (state.isVisible) return;
        
        console.log('🎬 Showing teleprompter window');
        
        // Create container if it doesn't exist
        if (!state.container) {
            const container = createShadowContainer();
            document.body.appendChild(container);
        }
        
        state.isVisible = true;
        loadSettings();
        
        // Focus the window
        const focusTarget = state.mode === 'editor' 
            ? state.shadowRoot.querySelector('.editor-area')
            : state.shadowRoot.querySelector('.teleprompter-view');
        
        if (focusTarget) {
            setTimeout(() => focusTarget.focus(), 100);
        }
    }
    
    function hideWindow() {
        if (!state.isVisible) return;
        
        console.log('🎬 Hiding teleprompter window');
        
        // Stop scrolling if active
        pauseScrolling();
        
        // Save current state
        saveCurrentNote();
        saveSettings();
        
        // Remove from DOM
        if (state.container && state.container.parentNode) {
            state.container.parentNode.removeChild(state.container);
        }
        
        state.isVisible = false;
        state.container = null;
        state.shadowRoot = null;
    }
    
    function toggleWindow() {
        if (state.isVisible) {
            hideWindow();
        } else {
            showWindow();
        }
    }
    
    // toggleMode removed - single editor mode only
    
    function setupAutoscrollListeners() {
        const controls = state.shadowRoot.querySelector('.floating-autoscroll-controls');
        if (!controls) return;
        
        console.log('🎮 Setting up autoscroll listeners');
        
        // Handle play/pause button
        const playButton = controls.querySelector('.play-button');
        if (playButton) {
            playButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎬 Play button clicked');
                toggleScrolling();
            });
        }
        
        // Handle speed slider
        const speedSlider = controls.querySelector('.speed-slider');
        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                e.stopPropagation();
                state.scrollSpeed = parseInt(e.target.value);
                console.log('🏃 Speed changed to:', state.scrollSpeed);
                saveSettings();
            });
        }
        
        // Pause scrolling on manual scroll of editor
        const editor = state.shadowRoot.querySelector('.editor-area');
        if (editor) {
            let lastAutoscrollTime = 0;
            
            editor.addEventListener('scroll', (e) => {
                if (!state.isScrolling) return;
                
                const now = performance.now();
                const timeSinceLastAutoscroll = now - lastAutoscrollTime;
                
                // If scroll happened more than 100ms after last autoscroll update, it's manual
                if (timeSinceLastAutoscroll > 100) {
                    console.log('✋ Manual scroll detected, pausing autoscroll');
                    pauseScrolling();
                }
            });
            
            // Track autoscroll updates to distinguish from manual scrolls
            state.updateLastAutoscrollTime = () => {
                lastAutoscrollTime = performance.now();
            };
        }
    }
    
    // ============ TELEPROMPTER FUNCTIONALITY ============
    
    let scrollAnimationFrame = null;
    let lastScrollTime = 0;
    let accumulatedScroll = 0;
    
    function startScrolling() {
        if (state.isScrolling) return;
        
        state.isScrolling = true;
        lastScrollTime = performance.now();
        accumulatedScroll = 0;
        
        const playButton = state.shadowRoot.querySelector('.play-button');
        if (playButton) {
            const playIcon = playButton.querySelector('img');
            const playSpan = playButton.querySelector('span');
            if (playIcon) {
                try {
                    playIcon.src = chrome.runtime.getURL('playbutton.png'); // Use same icon, just change style
                    playIcon.style.filter = 'invert(1) hue-rotate(180deg)'; // Make it look different for pause
                } catch (error) {
                    console.log('Extension context invalidated during pause');
                }
            } else if (playSpan) {
                playSpan.textContent = '⏸';
            }
            playButton.setAttribute('aria-label', 'Pause scrolling');
        }
        
        console.log('🎬 Auto-scroll started');
        scrollLoop();
    }
    
    function pauseScrolling() {
        if (!state.isScrolling) return;
        
        state.isScrolling = false;
        
        if (scrollAnimationFrame) {
            cancelAnimationFrame(scrollAnimationFrame);
            scrollAnimationFrame = null;
        }
        
        const playButton = state.shadowRoot.querySelector('.play-button');
        if (playButton) {
            const playIcon = playButton.querySelector('img');
            const playSpan = playButton.querySelector('span');
            if (playIcon) {
                try {
                    playIcon.src = chrome.runtime.getURL('playbutton.png');
                    playIcon.style.filter = 'invert(1)'; // Reset to normal play style
                } catch (error) {
                    console.log('Extension context invalidated during play');
                }
            } else if (playSpan) {
                playSpan.textContent = '▶';
            }
            playButton.setAttribute('aria-label', 'Start scrolling');
        }
        
        console.log('⏸️ Auto-scroll paused');
    }
    
    function toggleScrolling() {
        if (state.isScrolling) {
            pauseScrolling();
        } else {
            startScrolling();
        }
    }
    
    function scrollLoop() {
        if (!state.isScrolling) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - lastScrollTime;
        lastScrollTime = currentTime;
        
        const editor = state.shadowRoot.querySelector('.editor-area');
        if (editor) {
            // Calculate scroll amount and accumulate
            const scrollAmountFloat = (state.scrollSpeed * deltaTime) / 1000;
            accumulatedScroll += scrollAmountFloat;
            
            const oldScrollTop = editor.scrollTop;
            
            // Scroll when we have accumulated at least 0.5 pixels for smoother movement
            if (accumulatedScroll >= 0.5) {
                const scrollPixels = Math.floor(accumulatedScroll);
                editor.scrollTop += scrollPixels;
                accumulatedScroll -= scrollPixels;
                
                // Track this as an autoscroll update
                if (state.updateLastAutoscrollTime) {
                    state.updateLastAutoscrollTime();
                }
                
                console.log('📜 Auto-scroll update:', {
                    speed: state.scrollSpeed,
                    deltaTime,
                    scrollAmountFloat,
                    scrollPixels,
                    accumulatedScroll,
                    oldScrollTop,
                    newScrollTop: editor.scrollTop,
                    scrollHeight: editor.scrollHeight,
                    clientHeight: editor.clientHeight
                });
            } else {
                console.log('📜 Accumulating scroll:', {
                    speed: state.scrollSpeed,
                    scrollAmountFloat,
                    accumulatedScroll,
                    threshold: 0.5
                });
            }
            
            // Check if we've reached the bottom
            if (editor.scrollTop >= editor.scrollHeight - editor.clientHeight) {
                console.log('🏁 Reached bottom, pausing auto-scroll');
                pauseScrolling();
                return;
            }
        } else {
            console.error('❌ No editor area found for auto-scrolling');
        }
        
        scrollAnimationFrame = requestAnimationFrame(scrollLoop);
    }
    
    function adjustSpeed(delta) {
        const newSpeed = Math.max(CONFIG.SCROLL_SPEEDS.min, 
                                 Math.min(CONFIG.SCROLL_SPEEDS.max, state.scrollSpeed + delta));
        
        if (newSpeed !== state.scrollSpeed) {
            state.scrollSpeed = newSpeed;
            
            const speedSlider = state.shadowRoot.querySelector('.speed-slider');
            const speedValue = state.shadowRoot.querySelector('.speed-control span:last-child');
            
            if (speedSlider) speedSlider.value = state.scrollSpeed;
            if (speedValue) speedValue.textContent = `${state.scrollSpeed}px/s`;
            
            saveSettings();
        }
    }
    
    // ============ UTILITY FUNCTIONS ============
    
    function updatePosition() {
        if (state.container) {
            state.container.style.left = `${state.position.x}px`;
            state.container.style.top = `${state.position.y}px`;
        }
    }
    
    function updateSize() {
        if (state.container) {
            state.container.style.width = `${state.size.width}px`;
            state.container.style.height = `${state.size.height}px`;
        }
    }
    
    function updateOpacity() {
        const window = state.shadowRoot?.querySelector('.teleprompter-window');
        if (window) {
            window.style.opacity = state.opacity / 100;
        }
    }
    
    // updateToolbarState removed - no formatting buttons to update
    
    // ============ STORAGE MANAGEMENT ============
    
    function getStorageKey(key) {
        const origin = window.location.origin;
        return `${CONFIG.STORAGE_KEY_PREFIX}${origin}_${key}`;
    }
    
    function saveSettings() {
        const settings = {
            position: state.position,
            size: state.size,
            opacity: state.opacity,
            mode: state.mode,
            scrollSpeed: state.scrollSpeed,
            fontSize: state.fontSize,
            lineSpacing: state.lineSpacing,
            mirrorMode: state.mirrorMode,
            paragraphSnap: state.paragraphSnap
        };
        
        chrome.storage.sync.set({
            [getStorageKey('settings')]: settings
        }).catch(() => {
            // Fallback to local storage
            chrome.storage.local.set({
                [getStorageKey('settings')]: settings
            });
        });
    }
    
    function loadSettings() {
        chrome.storage.sync.get(getStorageKey('settings')).then(result => {
            const settings = result[getStorageKey('settings')];
            if (settings) {
                // Validate position values before applying
                if (settings.position && (isNaN(settings.position.x) || isNaN(settings.position.y))) {
                    console.warn('⚠️ Invalid position in saved settings, using defaults');
                    settings.position = { ...CONFIG.DEFAULT_POSITION };
                }
                
                Object.assign(state, settings);
                updatePosition();
                updateSize();
                updateOpacity();
            }
        }).catch(() => {
            // Fallback to local storage
            chrome.storage.local.get(getStorageKey('settings')).then(result => {
                const settings = result[getStorageKey('settings')];
                if (settings) {
                    // Validate position values before applying
                    if (settings.position && (isNaN(settings.position.x) || isNaN(settings.position.y))) {
                        console.warn('⚠️ Invalid position in saved settings, using defaults');
                        settings.position = { ...CONFIG.DEFAULT_POSITION };
                    }
                    
                    Object.assign(state, settings);
                    updatePosition();
                    updateSize();
                    updateOpacity();
                }
            });
        });
    }
    
    function saveCurrentNote() {
        const editor = state.shadowRoot?.querySelector('.editor-area');
        if (!editor) return;
        
        const content = editor.innerHTML;
        const timestamp = Date.now();
        
        if (!state.currentNote) {
            state.currentNote = {
                id: `note_${timestamp}`,
                title: 'Untitled Note',
                content: content,
                created: timestamp,
                modified: timestamp
            };
        } else {
            state.currentNote.content = content;
            state.currentNote.modified = timestamp;
        }
        
        // Save to storage
        chrome.storage.sync.set({
            [getStorageKey('currentNote')]: state.currentNote
        }).catch(() => {
            chrome.storage.local.set({
                [getStorageKey('currentNote')]: state.currentNote
            });
        });
        
        // Auto-save to clipboard manager if content exists
        if (content && content.trim() && content !== '<p>Start typing your notes...</p>') {
            // Extract clean text content from HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            
            // Remove any script tags or style elements
            const scripts = tempDiv.querySelectorAll('script, style');
            scripts.forEach(el => el.remove());
            
            const textContent = tempDiv.textContent || tempDiv.innerText || '';
            const cleanText = textContent.trim();
            
            if (cleanText && cleanText !== 'Start typing your notes...') {
                // Send to clipboard manager with note ID for tracking
                chrome.runtime.sendMessage({
                    action: 'addToClipboard',
                    text: cleanText,
                    source: 'notes',
                    noteId: state.currentNote.id
                }).catch(error => {
                    console.log('Could not save to clipboard manager:', error);
                });
            }
        }
    }
    
    function createNewNote() {
        const editor = state.shadowRoot?.querySelector('.editor-area');
        if (!editor) return;
        
        // Save current note first if it has content
        if (state.currentNote && state.currentNote.content && state.currentNote.content.trim() !== '<p>Start typing your notes...</p>') {
            saveCurrentNote();
        }
        
        // Create new note
        const timestamp = Date.now();
        state.currentNote = {
            id: `note_${timestamp}`,
            title: 'Untitled Note',
            content: '<p>Start typing your notes...</p>',
            created: timestamp,
            modified: timestamp
        };
        
        // Set editor content
        editor.innerHTML = '<p>Start typing your notes...</p>';
        editor.focus();
        
        console.log('📝 Created new note');
    }
    
    function loadCurrentNote() {
        chrome.storage.sync.get(getStorageKey('currentNote')).then(result => {
            const note = result[getStorageKey('currentNote')];
            if (note) {
                state.currentNote = note;
                
                // Update editor content if in editor mode
                const editor = state.shadowRoot?.querySelector('.editor-area');
                if (editor && state.mode === 'editor') {
                    editor.innerHTML = note.content;
                }
            }
        }).catch(() => {
            chrome.storage.local.get(getStorageKey('currentNote')).then(result => {
                const note = result[getStorageKey('currentNote')];
                if (note) {
                    state.currentNote = note;
                    
                    const editor = state.shadowRoot?.querySelector('.editor-area');
                    if (editor && state.mode === 'editor') {
                        editor.innerHTML = note.content;
                    }
                }
            });
        });
    }
    
    // ============ MESSAGE HANDLING ============
    
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
            case 'toggleTeleprompter':
                toggleWindow();
                sendResponse({ success: true, visible: state.isVisible });
                break;
                
            case 'openTeleprompterWithContent':
                // Open notes with specific content
                if (!state.isVisible) {
                    showWindow();
                }
                
                // Set the content
                const editor = state.shadowRoot?.querySelector('.editor-area');
                if (editor && request.content) {
                    editor.innerHTML = request.content;
                    // Focus the editor
                    setTimeout(() => editor.focus(), 100);
                }
                
                sendResponse({ success: true, visible: state.isVisible });
                break;
                
            case 'getTeleprompterStatus':
                sendResponse({
                    visible: state.isVisible,
                    mode: state.mode,
                    scrolling: state.isScrolling
                });
                break;
                
            default:
                sendResponse({ error: 'Unknown action' });
        }
    });
    
    // ============ INITIALIZATION ============
    
    function initialize() {
        console.log('🎬 GeloLabs Teleprompter initialized');
        
        // Load settings and notes
        loadSettings();
        loadCurrentNote();
        
        // Set up global keyboard shortcut listener for Alt+G+Number combinations
        let altGPressed = false;
        let altGTimeout = null;
        
        document.addEventListener('keydown', (e) => {
            // Debug keyboard events
            if (e.altKey && e.key.toLowerCase() === 'g') {
                console.log('🔍 Key event:', {
                    key: e.key,
                    code: e.code,
                    altKey: e.altKey,
                    ctrlKey: e.ctrlKey,
                    shiftKey: e.shiftKey,
                    metaKey: e.metaKey,
                    altGPressed: altGPressed
                });
            }
            
            // Handle Alt+G combination (support both 'g' and 'G')
            if (e.altKey && (e.key.toLowerCase() === 'g' || e.code === 'KeyG') && !altGPressed) {
                e.preventDefault();
                altGPressed = true;
                
                // Clear any existing timeout
                if (altGTimeout) {
                    clearTimeout(altGTimeout);
                }
                
                // Reset after 3 seconds if no number is pressed (longer timeout)
                altGTimeout = setTimeout(() => {
                    altGPressed = false;
                    console.log('⏰ Alt+G timeout - resetting');
                }, 3000);
                
                console.log('🎯 Alt+G detected - waiting for number key... (you have 3 seconds)');
                return;
            }
            
            // Handle number keys after Alt+G
            if (altGPressed && e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                altGPressed = false;
                
                if (altGTimeout) {
                    clearTimeout(altGTimeout);
                    altGTimeout = null;
                }
                
                const toolNumber = parseInt(e.key);
                console.log(`🚀 GeloLabs shortcut: Alt+G+${toolNumber}`);
                
                // Handle different tool numbers
                switch (toolNumber) {
                    case 1:
                        console.log('📝 Opening Notes...');
                        if (state.isVisible) {
                            // If already visible, create a new note
                            createNewNote();
                        } else {
                            // Show window with new note
                            showWindow();
                            setTimeout(() => createNewNote(), 100);
                        }
                        break;
                    case 2:
                        console.log('📋 Opening Clipboard Manager...');
                        chrome.runtime.sendMessage({ action: 'toggleClipboardManager' });
                        break;
                    case 3:
                        console.log('🤖 Opening YouTube Video AI...');
                        // Check if we're on YouTube
                        if (window.location.href.includes('youtube.com')) {
                            // Trigger the YouTube AI interface
                            const event = new CustomEvent('gelolabs-open-ai-chat');
                            document.dispatchEvent(event);
                        } else {
                            console.log('⚠️ YouTube Video AI only available on YouTube');
                        }
                        break;
                    default:
                        console.log(`🔧 GeloLabs Tool #${toolNumber} not implemented yet`);
                        break;
                }
                return;
            }
            
            // Reset Alt+G state if any other key is pressed
            if (altGPressed && e.key !== 'g' && (e.key < '1' || e.key > '9')) {
                altGPressed = false;
                if (altGTimeout) {
                    clearTimeout(altGTimeout);
                    altGTimeout = null;
                }
            }
        });
        
        // Reset on key up to handle edge cases
        document.addEventListener('keyup', (e) => {
            if (e.key.toLowerCase() === 'g' || e.key === 'Alt') {
                // Don't reset immediately on keyup to allow for quick G+Number combinations
            }
        });
        
        console.log('✅ Teleprompter ready');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (state.isVisible) {
            saveCurrentNote();
            saveSettings();
        }
    });
    
})();
