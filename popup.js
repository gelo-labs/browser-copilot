// GeloLabs Browser Assistant - popup.js

document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('toggle-button');
    const timeSavedValue = document.getElementById('time-saved-value');
    const confirmationText = document.getElementById('confirmation-text');
    const confirmDisableButton = document.getElementById('confirm-disable-button');
    const cancelDisableButton = document.getElementById('cancel-disable-button');
    const meetSection = document.getElementById('meet-section');
    const activateMeetNotesButton = document.getElementById('activate-meet-notes-button');
    const meetNotesInterface = document.getElementById('meet-notes-interface');
    const notesStatusIndicator = document.getElementById('notes-status-indicator');
    const notesStatusText = document.getElementById('notes-status-text');
    const exportNotesButton = document.getElementById('export-notes-button');
    const clearNotesButton = document.getElementById('clear-notes-button');
    const notesList = document.getElementById('notes-list');

    let currentState = 'loading'; // Can be 'loading', 'active', 'inactive', 'confirming'

    // --- Update UI Functions ---

    function updateButtonUI() {
        if (currentState === 'loading') {
            const buttonText = toggleButton.querySelector('.button-text');
            if (buttonText) buttonText.textContent = 'Loading...';
            toggleButton.disabled = true;
            toggleButton.className = 'feature-button'; // Remove active/inactive classes
            confirmationText.style.display = 'none';
            confirmDisableButton.style.display = 'none';
            cancelDisableButton.style.display = 'none';
        } else if (currentState === 'active') {
            const buttonText = toggleButton.querySelector('.button-text');
            if (buttonText) buttonText.textContent = 'Blocker Active';
            toggleButton.disabled = false;
            toggleButton.className = 'feature-button active'; 
            toggleButton.style.display = 'block'; // Ensure main button is visible
            confirmationText.style.display = 'none';
            document.querySelector('.confirmation-buttons').style.display = 'none';
            confirmDisableButton.style.display = 'none';
            cancelDisableButton.style.display = 'none';
        } else if (currentState === 'inactive') {
            const buttonText = toggleButton.querySelector('.button-text');
            if (buttonText) buttonText.textContent = 'Blocker Disabled';
            toggleButton.disabled = false;
            toggleButton.className = 'feature-button inactive';
            toggleButton.style.display = 'block';
            confirmationText.style.display = 'none';
            document.querySelector('.confirmation-buttons').style.display = 'none';
            confirmDisableButton.style.display = 'none';
            cancelDisableButton.style.display = 'none';
        } else if (currentState === 'confirming') {
            toggleButton.style.display = 'none'; // Hide main button during confirmation
            confirmationText.style.display = 'block';
            document.querySelector('.confirmation-buttons').style.display = 'flex';
            confirmDisableButton.style.display = 'inline-block';
            cancelDisableButton.style.display = 'inline-block';
        }
    }

    function updateTimeSavedUI() {
        timeSavedValue.textContent = 'Calculating...';
        
        // Add proper error handling for chrome.runtime.sendMessage
        try {
            chrome.runtime.sendMessage({ action: 'getTimeSaved' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn("Runtime error getting time saved:", chrome.runtime.lastError);
                    timeSavedValue.textContent = 'N/A';
                } else if (response && typeof response.timeSaved !== 'undefined') {
                    timeSavedValue.textContent = response.timeSaved;
                } else {
                    timeSavedValue.textContent = 'N/A';
                }
            });
        } catch (error) {
            console.error("Error sending message to background:", error);
            timeSavedValue.textContent = 'N/A';
        }
    }

    // Check if current tab is on Google Meet or YouTube
    function checkCurrentSite() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url) {
                const url = tabs[0].url;
                
                // Show Meet section on Google Meet
                if (url.includes('meet.google.com')) {
                    meetSection.style.display = 'block';
                    console.log('Google Meet detected - showing activation button');
                } else {
                    meetSection.style.display = 'none';
                }
                
                // Show YouTube sections only on YouTube
                const youtubeAiSection = document.getElementById('youtube-ai-section');
                const youtubeBlockerSection = document.getElementById('youtube-blocker-section');
                
                if (url.includes('youtube.com')) {
                    youtubeBlockerSection.style.display = 'block';
                    
                    // Show AI section only on video pages
                    if (url.includes('/watch?v=')) {
                        youtubeAiSection.style.display = 'block';
                        // Update button to be functional
                        const aiButton = youtubeAiSection.querySelector('.feature-button');
                        if (aiButton) {
                            aiButton.classList.remove('disabled');
                            aiButton.querySelector('.button-text').textContent = 'Ask AI';
                            aiButton.onclick = () => {
                                // Trigger YouTube AI
                                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                                    chrome.tabs.sendMessage(tabs[0].id, { action: 'openYouTubeAI' });
                                });
                                window.close();
                            };
                        }
                        console.log('YouTube video detected - showing AI section');
                    } else {
                        youtubeAiSection.style.display = 'none';
                    }
                    
                    console.log('YouTube detected - showing YouTube sections');
                } else {
                    youtubeAiSection.style.display = 'none';
                    youtubeBlockerSection.style.display = 'none';
                }
            }
        });
    }

    // Display notes in the interface (demo mode since no script injection)
    function displayNotes(notes) {
        if (!notes || notes.length === 0) {
            notesList.innerHTML = '<div class="no-notes">Meeting notes feature is in development. This extension currently focuses on YouTube Shorts blocking and AI video assistance.</div>';
            return;
        }

        const notesHTML = notes.map(note => `
            <div class="note-entry">
                <div class="note-header">
                    <span class="note-speaker">${note.speaker}</span>
                    <span class="note-time">${formatTime(note.timestamp)}</span>
                </div>
                <div class="note-text">${note.text}</div>
            </div>
        `).join('');

        notesList.innerHTML = notesHTML;
    }

    // Update notes status
    function updateNotesStatus(hasNotes) {
        if (hasNotes) {
            notesStatusIndicator.textContent = '✅';
            notesStatusText.textContent = `Capturing notes (${notesList.children.length} entries)`;
        } else {
            notesStatusIndicator.textContent = '⏳';
            notesStatusText.textContent = 'Feature in development';
        }
    }

    // Format timestamp
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
    }

    // --- Event Listeners ---

    toggleButton.addEventListener('click', () => {
        chrome.storage.sync.get(['blockingState'], (result) => {
            const currentBlockingState = result.blockingState || 'active';
            if (currentBlockingState === 'active') {
                // User wants to disable -> show confirmation
                currentState = 'confirming';
                updateButtonUI();
            } else {
                // User wants to enable -> just enable directly
                chrome.storage.sync.set({ blockingState: 'active' }, () => {
                    currentState = 'active';
                    updateButtonUI();
                    updateTimeSavedUI(); // Recalculate time saved immediately
                });
            }
        });
    });

    confirmDisableButton.addEventListener('click', () => {
        // User confirmed disabling
        chrome.storage.sync.set({ blockingState: 'inactive' }, () => {
             currentState = 'inactive';
             updateButtonUI();
             // Time saved updates automatically via background listener
        });
    });

    cancelDisableButton.addEventListener('click', () => {
        // User cancelled disabling -> revert to previous state
        chrome.storage.sync.get(['blockingState'], (result) => {
            currentState = result.blockingState || 'active'; // Revert to actual stored state
             updateButtonUI();
        });
    });

    // Meet notes activation button (demo mode)
    activateMeetNotesButton.addEventListener('click', () => {
        console.log('User clicked activate Meet notes');
        
        // Show the notes interface (demo mode)
        meetNotesInterface.style.display = 'block';
        meetActivationSection.style.display = 'none';
        
        // Show demo message
        updateNotesStatus(false);
        displayNotes([]);
    });

    // Export notes button (demo mode)
    exportNotesButton.addEventListener('click', () => {
        alert('Meeting notes export feature is in development. This extension currently focuses on YouTube Shorts blocking and AI video assistance.');
    });

    // Clear notes button (demo mode)
    clearNotesButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all meeting notes?')) {
            displayNotes([]);
            updateNotesStatus(false);
        }
    });

    // Teleprompter button
    const teleprompterButton = document.getElementById('toggle-teleprompter');
    if (teleprompterButton) {
        teleprompterButton.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'toggleTeleprompter' }, (response) => {
                if (response && response.success) {
                    console.log('Teleprompter toggled:', response.visible ? 'shown' : 'hidden');
                    // Update button text based on visibility
                    const buttonText = teleprompterButton.querySelector('.button-text');
                    if (buttonText) {
                        buttonText.textContent = response.visible ? 'Close Notes' : 'Open Notes';
                    }
                } else {
                    console.error('Failed to toggle teleprompter:', response);
                }
            });
        });
    }
    
    // Clipboard Manager button
    const clipboardButton = document.getElementById('toggle-clipboard');
    if (clipboardButton) {
        clipboardButton.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'toggleClipboardManager' }, (response) => {
                if (response && response.success) {
                    console.log('Clipboard manager toggled');
                    // Update button text based on visibility
                    const buttonText = clipboardButton.querySelector('.button-text');
                    if (buttonText) {
                        buttonText.textContent = response.visible ? 'Close Clipboard Manager' : 'Open Clipboard Manager';
                    }
                } else {
                    console.error('Failed to toggle clipboard manager:', response);
                }
            });
        });
    }

    // --- Initial Load ---

    function initializePopup() {
        console.log("Initializing popup...");
        
        // Get current state with error handling
        try {
            chrome.storage.sync.get(['blockingState'], (result) => {
                if (chrome.runtime.lastError) {
                    console.warn("Runtime error getting blocking state:", chrome.runtime.lastError);
                    currentState = 'active'; // Default to active
                } else {
                    currentState = result.blockingState || 'active';
                }
                updateButtonUI();
                updateTimeSavedUI();
            });
        } catch (error) {
            console.error("Error initializing popup:", error);
            currentState = 'active'; // Default to active
            updateButtonUI();
            updateTimeSavedUI();
        }

        // Check if we're on Google Meet
        checkCurrentSite();
    }

    initializePopup();

    // AI Assistant is ready with hardcoded API key
    console.log('GeloLabs AI Assistant ready');

}); 