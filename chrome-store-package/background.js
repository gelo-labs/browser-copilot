// GeloLabs Browser Assistant - background.js

// --- Constants ---
const DAILY_HOURS_SAVED_ESTIMATE = 1.05;

// --- Storage Keys ---
const INSTALL_TIME_KEY = 'installTime';
const BLOCKING_STATE_KEY = 'blockingState'; // 'active' or 'inactive'
const DISABLED_PERIODS_KEY = 'disabledPeriods'; // Array of { start: timestamp, end: timestamp }

// --- Initialization ---

// Set install time on first install
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({ 
        [INSTALL_TIME_KEY]: Date.now(),
        [BLOCKING_STATE_KEY]: 'active', // Start active by default
        [DISABLED_PERIODS_KEY]: [] 
    }, () => {
        console.log('GeloTools Blocker installed. State initialized.');
    });
  } else if (details.reason === 'update') {
    // Optional: Handle updates if storage structure changes
    console.log('GeloTools Blocker updated.');
    // Ensure default state exists if somehow missing after update
    chrome.storage.sync.get([BLOCKING_STATE_KEY], (result) => {
        if (!result[BLOCKING_STATE_KEY]) {
            chrome.storage.sync.set({ [BLOCKING_STATE_KEY]: 'active' });
        }
    });
     // Ensure install time exists if somehow missing after update
     chrome.storage.sync.get([INSTALL_TIME_KEY], (result) => {
        if (!result[INSTALL_TIME_KEY]) {
            chrome.storage.sync.set({ [INSTALL_TIME_KEY]: Date.now() }); // Set to now if missing
        }
    });
     // Ensure disabled periods exists if somehow missing after update
     chrome.storage.sync.get([DISABLED_PERIODS_KEY], (result) => {
        if (!result[DISABLED_PERIODS_KEY]) {
            chrome.storage.sync.set({ [DISABLED_PERIODS_KEY]: [] }); 
        }
    });
  }
});

// --- State Change Handling ---

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes[BLOCKING_STATE_KEY]) {
    const oldState = changes[BLOCKING_STATE_KEY].oldValue;
    const newState = changes[BLOCKING_STATE_KEY].newValue;
    const timestamp = Date.now();

    console.log(`Blocking state changed from ${oldState} to ${newState} at ${timestamp}`);

    chrome.storage.sync.get([DISABLED_PERIODS_KEY], (result) => {
      let periods = result[DISABLED_PERIODS_KEY] || [];

      if (oldState === 'active' && newState === 'inactive') {
        // Started being disabled: Add a new period with only a start time
        periods.push({ start: timestamp, end: null });
        console.log('Started disabled period');
      } else if (oldState === 'inactive' && newState === 'active') {
        // Stopped being disabled: Find the last open period and set its end time
        const lastPeriod = periods.find(p => p.end === null);
        if (lastPeriod) {
          lastPeriod.end = timestamp;
          console.log('Ended disabled period');
        } else {
            console.warn('Re-enabled blocker, but could not find matching start time for disabled period.');
            // Optionally, handle this case - maybe assume it started at install time?
        }
      }
      
      // Save the updated periods
      chrome.storage.sync.set({ [DISABLED_PERIODS_KEY]: periods });
    });
  }
});

// --- Time Saved Calculation ---

function calculateTimeSaved(callback) {
  chrome.storage.sync.get([INSTALL_TIME_KEY, DISABLED_PERIODS_KEY], (result) => {
    const installTime = result[INSTALL_TIME_KEY];
    const disabledPeriods = result[DISABLED_PERIODS_KEY] || [];

    if (!installTime) {
      console.error("Install time not found!");
      callback(0); // Return 0 if install time is missing
      return;
    }

    const now = Date.now();
    const totalTimeElapsedMs = now - installTime;

    let totalDisabledMs = 0;
    disabledPeriods.forEach(period => {
      const endTime = period.end || now; // If period is still ongoing, count until now
      // Ensure start time is valid and before end time
      if (period.start && period.start < endTime) { 
          totalDisabledMs += (endTime - period.start);
      }
    });

    const totalEnabledMs = totalTimeElapsedMs - totalDisabledMs;
    if (totalEnabledMs < 0) totalEnabledMs = 0; // Floor at 0

    const totalEnabledDays = totalEnabledMs / (1000 * 60 * 60 * 24);
    const estimatedHoursSaved = totalEnabledDays * DAILY_HOURS_SAVED_ESTIMATE;

    // Round to 1 decimal place
    const roundedHoursSaved = Math.round(estimatedHoursSaved * 10) / 10;
    
    callback(roundedHoursSaved);
  });
}

// --- Message Listener for Popup ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTimeSaved') {
    calculateTimeSaved(timeSaved => {
      sendResponse({ timeSaved: timeSaved });
    });
    return true; // Indicates response will be sent asynchronously
  }
});

console.log("GeloLabs Browser Assistant background script loaded."); 