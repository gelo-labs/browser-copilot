// GeloLabs Browser Assistant - popup.js

document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('toggle-button');
    const timeSavedValue = document.getElementById('time-saved-value');
    const confirmationText = document.getElementById('confirmation-text');
    const confirmDisableButton = document.getElementById('confirm-disable-button');
    const cancelDisableButton = document.getElementById('cancel-disable-button');

    let currentState = 'loading'; // Can be 'loading', 'active', 'inactive', 'confirming'

    // --- Update UI Functions ---

    function updateButtonUI() {
        if (currentState === 'loading') {
            toggleButton.textContent = 'Loading...';
            toggleButton.disabled = true;
            toggleButton.className = ''; // Remove active/inactive classes
            confirmationText.style.display = 'none';
            confirmDisableButton.style.display = 'none';
            cancelDisableButton.style.display = 'none';
        } else if (currentState === 'active') {
            toggleButton.textContent = 'Blocker Active';
            toggleButton.disabled = false;
            toggleButton.className = 'active'; 
            toggleButton.style.display = 'block'; // Ensure main button is visible
            confirmationText.style.display = 'none';
            confirmDisableButton.style.display = 'none';
            cancelDisableButton.style.display = 'none';
        } else if (currentState === 'inactive') {
            toggleButton.textContent = 'Blocker Disabled';
            toggleButton.disabled = false;
            toggleButton.className = 'inactive';
            toggleButton.style.display = 'block';
            confirmationText.style.display = 'none';
            confirmDisableButton.style.display = 'none';
            cancelDisableButton.style.display = 'none';
        } else if (currentState === 'confirming') {
            toggleButton.style.display = 'none'; // Hide main button during confirmation
            confirmationText.style.display = 'block';
            confirmDisableButton.style.display = 'inline-block'; // Or block, depending on desired layout
            cancelDisableButton.style.display = 'inline-block'; // Or block
        }
    }

    function updateTimeSavedUI() {
        timeSavedValue.textContent = 'Calculating...';
        chrome.runtime.sendMessage({ action: 'getTimeSaved' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error getting time saved:", chrome.runtime.lastError);
                timeSavedValue.textContent = 'Error';
            } else if (response && typeof response.timeSaved !== 'undefined') {
                timeSavedValue.textContent = response.timeSaved;
            } else {
                 timeSavedValue.textContent = 'N/A';
            }
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

    // --- Initial Load ---

    function initializePopup() {
        console.log("Initializing popup...");
        chrome.storage.sync.get(['blockingState'], (result) => {
            currentState = result.blockingState || 'active'; // Default to active if not set
            console.log("Initial state:", currentState);
            updateButtonUI();
            updateTimeSavedUI();
        });

        // Listen for changes happening while popup is open
        chrome.storage.onChanged.addListener((changes, namespace) => {
          if (namespace === 'sync' && changes.blockingState) {
            console.log("Detected state change while popup open:", changes.blockingState.newValue);
            // Only update if not currently in confirmation step
            if (currentState !== 'confirming') {
                currentState = changes.blockingState.newValue;
                updateButtonUI();
            }
            // Always update time saved display
            updateTimeSavedUI(); 
          }
        });
    }

    initializePopup();

    // AI Assistant is ready with hardcoded API key
    console.log('GeloLabs AI Assistant ready');

}); 