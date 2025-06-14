// GeloTools Browser Hub - popup.js

document.addEventListener('DOMContentLoaded', () => {
    // Check if this is first run and show pin suggestion
    checkFirstRun();
    
    // Initialize all components
    initializeShortsBlocker();
    initializeFocusTimer();
    initializeTabManager();
    initializeSiteBlocker();
    initializeQuickActions();
    initializeNotes();
    initializeCurrentTab();
    initializeSettings();
});

// === FIRST RUN & PIN SUGGESTION ===
function checkFirstRun() {
    chrome.storage.sync.get(['hasShownPinSuggestion'], (result) => {
        if (!result.hasShownPinSuggestion) {
            showPinSuggestion();
            chrome.storage.sync.set({ hasShownPinSuggestion: true });
        }
    });
}

function showPinSuggestion() {
    // Create pin suggestion overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        font-family: inherit;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: #242530;
        border-radius: 12px;
        padding: 24px;
        max-width: 320px;
        border: 1px solid #313244;
        text-align: center;
        color: #cdd6f4;
    `;

    modal.innerHTML = `
        <div style="font-size: 2em; margin-bottom: 16px;">📌</div>
        <h3 style="margin: 0 0 12px 0; color: #cdd6f4; font-size: 1.2em;">Pin GeloTools for Easy Access</h3>
        <p style="margin: 0 0 20px 0; color: #a6adc8; font-size: 0.9em; line-height: 1.4;">
            For the best experience, pin this extension to your toolbar by clicking the puzzle icon 🧩 in your browser and selecting the pin icon next to GeloTools.
        </p>
        <button id="got-it-btn" style="
            background: #89b4fa;
            color: #1e1e2e;
            border: none;
            border-radius: 6px;
            padding: 10px 20px;
            font-size: 0.9em;
            font-weight: 500;
            cursor: pointer;
            margin-right: 8px;
        ">Got it!</button>
        <button id="remind-later-btn" style="
            background: transparent;
            color: #a6adc8;
            border: 1px solid #45475a;
            border-radius: 6px;
            padding: 10px 20px;
            font-size: 0.9em;
            cursor: pointer;
        ">Remind me later</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Event listeners
    document.getElementById('got-it-btn').addEventListener('click', () => {
        overlay.remove();
    });

    document.getElementById('remind-later-btn').addEventListener('click', () => {
        // Clear the flag so it shows again next time
        chrome.storage.sync.set({ hasShownPinSuggestion: false });
        overlay.remove();
    });
}

// === SHORTS BLOCKER ===
function initializeShortsBlocker() {
    const toggleButton = document.getElementById('toggle-blocker-button');
    const statusElement = document.getElementById('blocker-status');
    const modal = document.getElementById('confirmation-modal');
    const confirmButton = document.getElementById('confirm-disable-button');
    const cancelButton = document.getElementById('cancel-disable-button');
    const timeSavedElement = document.getElementById('time-saved-value');

    let currentState = 'loading';

    function updateBlockerUI() {
        chrome.storage.sync.get(['blockingState'], (result) => {
            currentState = result.blockingState || 'active';
            
            if (currentState === 'active') {
                statusElement.textContent = 'Active';
                statusElement.className = 'tool-status active';
                toggleButton.textContent = 'Disable Blocker';
                toggleButton.className = 'tool-button';
            } else {
                statusElement.textContent = 'Disabled';
                statusElement.className = 'tool-status inactive';
                toggleButton.textContent = 'Enable Blocker';
                toggleButton.className = 'tool-button active';
            }
        });
    }

    function updateTimeSaved() {
        chrome.runtime.sendMessage({ action: 'getTimeSaved' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error getting time saved:", chrome.runtime.lastError);
                timeSavedElement.textContent = '0';
            } else if (response && typeof response.timeSaved !== 'undefined') {
                timeSavedElement.textContent = response.timeSaved;
            } else {
                timeSavedElement.textContent = '0';
            }
        });
    }

    toggleButton.addEventListener('click', () => {
        if (currentState === 'active') {
            modal.style.display = 'flex';
        } else {
            chrome.storage.sync.set({ blockingState: 'active' }, () => {
                updateBlockerUI();
                updateTimeSaved();
            });
        }
    });

    confirmButton.addEventListener('click', () => {
        chrome.storage.sync.set({ blockingState: 'inactive' }, () => {
            modal.style.display = 'none';
            updateBlockerUI();
        });
    });

    cancelButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Initialize
    updateBlockerUI();
    updateTimeSaved();
}

// === FOCUS TIMER ===
function initializeFocusTimer() {
    const startButton = document.getElementById('start-timer-button');
    const timerDisplay = document.getElementById('timer-display');
    const statusElement = document.getElementById('timer-status');
    
    let timerInterval = null;
    let timeLeft = 25 * 60; // 25 minutes in seconds
    let isRunning = false;

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function updateTimerDisplay() {
        timerDisplay.textContent = formatTime(timeLeft);
    }

    function startTimer() {
        isRunning = true;
        statusElement.textContent = 'Running';
        statusElement.className = 'tool-status running';
        startButton.textContent = 'Pause';
        
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            
            if (timeLeft <= 0) {
                stopTimer();
                // Timer completed notification
                chrome.runtime.sendMessage({ action: 'timerCompleted' });
            }
        }, 1000);
    }

    function pauseTimer() {
        isRunning = false;
        statusElement.textContent = 'Paused';
        statusElement.className = 'tool-status';
        startButton.textContent = 'Resume';
        clearInterval(timerInterval);
    }

    function stopTimer() {
        isRunning = false;
        statusElement.textContent = 'Completed';
        statusElement.className = 'tool-status active';
        startButton.textContent = 'Start';
        clearInterval(timerInterval);
        timeLeft = 25 * 60;
        updateTimerDisplay();
    }

    startButton.addEventListener('click', () => {
        if (!isRunning) {
            startTimer();
        } else {
            pauseTimer();
        }
    });

    updateTimerDisplay();
}

// === TAB MANAGER ===
function initializeTabManager() {
    const tabCountElement = document.getElementById('tab-count');
    const closeDuplicatesButton = document.getElementById('close-duplicates-button');
    const bookmarkAllButton = document.getElementById('bookmark-all-button');

    function updateTabCount() {
        chrome.tabs.query({}, (tabs) => {
            tabCountElement.textContent = `${tabs.length} tabs`;
        });
    }

    closeDuplicatesButton.addEventListener('click', () => {
        chrome.tabs.query({}, (tabs) => {
            const urlMap = new Map();
            const duplicates = [];

            tabs.forEach(tab => {
                if (urlMap.has(tab.url)) {
                    duplicates.push(tab.id);
                } else {
                    urlMap.set(tab.url, tab.id);
                }
            });

            if (duplicates.length > 0) {
                chrome.tabs.remove(duplicates, () => {
                    updateTabCount();
                });
            }
        });
    });

    bookmarkAllButton.addEventListener('click', () => {
        chrome.tabs.query({}, (tabs) => {
            const timestamp = new Date().toISOString().split('T')[0];
            chrome.bookmarks.create({
                title: `Session ${timestamp}`
            }, (folder) => {
                tabs.forEach(tab => {
                    if (!tab.url.startsWith('chrome://')) {
                        chrome.bookmarks.create({
                            parentId: folder.id,
                            title: tab.title,
                            url: tab.url
                        });
                    }
                });
            });
        });
    });

    updateTabCount();
}

// === SITE BLOCKER ===
function initializeSiteBlocker() {
    const statusElement = document.getElementById('site-blocker-status');
    const manageButton = document.getElementById('manage-blocklist-button');

    function updateBlockedCount() {
        chrome.storage.sync.get(['blockedSites'], (result) => {
            const blockedSites = result.blockedSites || [];
            statusElement.textContent = `${blockedSites.length} blocked`;
        });
    }

    manageButton.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    });

    updateBlockedCount();
}

// === QUICK ACTIONS ===
function initializeQuickActions() {
    const clearCacheButton = document.getElementById('clear-cache-button');
    const incognitoButton = document.getElementById('incognito-button');

    clearCacheButton.addEventListener('click', () => {
        chrome.browsingData.removeCache({}, () => {
            clearCacheButton.textContent = '✓ Cleared';
            setTimeout(() => {
                clearCacheButton.textContent = 'Clear Cache';
            }, 2000);
        });
    });

    incognitoButton.addEventListener('click', () => {
        chrome.windows.create({ incognito: true });
    });
}

// === NOTES ===
function initializeNotes() {
    const notesTextarea = document.getElementById('quick-notes');

    // Load saved notes
    chrome.storage.sync.get(['quickNotes'], (result) => {
        if (result.quickNotes) {
            notesTextarea.value = result.quickNotes;
        }
    });

    // Save notes on input
    let saveTimeout;
    notesTextarea.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            chrome.storage.sync.set({ quickNotes: notesTextarea.value });
        }, 500);
    });
}

// === CURRENT TAB INFO ===
function initializeCurrentTab() {
    const currentDomainElement = document.getElementById('current-domain');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            try {
                const url = new URL(tabs[0].url);
                currentDomainElement.textContent = url.hostname;
            } catch (e) {
                currentDomainElement.textContent = 'Unknown';
            }
        }
    });
}

// === SETTINGS ===
function initializeSettings() {
    const settingsButton = document.getElementById('settings-button');

    settingsButton.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    });
} 