// Google Meet Meeting Notes Extension - Non-Invasive Mode
// Completely non-invasive - no script injection into Google Meet at all

console.log('=== GELOLABS MEET SCRIPT LOADED (NON-INVASIVE MODE) ===');

// State management for meeting notes
let meetState = {
  isNoteTakingActive: false,
  subtitlesEnabled: false,
  currentMeetingId: null,
  notes: [],
  lastSubtitleTime: 0,
  isInjected: false,
  isUserActivated: false
};

// Meeting notes storage
let meetingNotes = new Map();

// Completely non-invasive injection - no script injection at all
function nonInvasiveInject() {
  if (meetState.isInjected) return;
  
  console.log('Non-invasive mode activated - no script injection...');
  
  // Only set up basic state, no script injection
  meetState.isInjected = true;
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'activateMeetNotes') {
      activateMeetNotes();
      sendResponse({ success: true });
    }
    
    if (request.action === 'getMeetingNotes') {
      sendResponse({ notes: meetState.notes });
    }
    
    if (request.action === 'exportMeetingNotes') {
      exportMeetingNotes();
      sendResponse({ success: true });
    }
    
    if (request.action === 'clearMeetingNotes') {
      clearMeetingNotes();
      sendResponse({ success: true });
    }
  });
}

// Only activate when user explicitly requests it
function activateMeetNotes() {
  if (meetState.isUserActivated) return;
  
  console.log('User activated Meet notes - initializing...');
  meetState.isUserActivated = true;
  
  // Now safe to initialize since user explicitly requested it
  initializeMeetNotes();
  
  // Don't inject anything - user will access via extension popup
  console.log('Non-invasive mode: No script injection, access via extension popup');
}

// Initialize meeting notes functionality
function initializeMeetNotes() {
  console.log('Initializing Meet Notes (Non-Invasive Mode)...');
  const currentUrl = window.location.href;
  
  if (!currentUrl.includes('meet.google.com')) {
    console.log('Not on Google Meet, skipping initialization');
    return;
  }
  
  console.log('On Google Meet, proceeding with non-invasive initialization...');

  // Extract meeting ID from URL
  const meetingId = extractMeetingId(currentUrl);
  if (meetingId) {
    meetState.currentMeetingId = meetingId;
    loadMeetingNotes(meetingId);
  }

  // Set up non-invasive subtitle monitoring (no script injection)
  setupNonInvasiveSubtitleMonitoring();
  
  // Don't inject anything - user accesses via extension popup
  console.log('Non-invasive mode: No script injection, access via extension popup');
}

// Extract meeting ID from Google Meet URL
function extractMeetingId(url) {
  const match = url.match(/meet\.google\.com\/([a-z-]+)/);
  if (match) return match[1];
  
  // For test page, use a test meeting ID
  if (url.includes('meet-test.html')) {
    return 'test-meeting-123';
  }
  
  return null;
}

// Check if subtitles are enabled (no notifications)
function checkSubtitlesAndNotify() {
  console.log('Checking for subtitles...');
  const subtitleElements = document.querySelectorAll('[data-speaker-id], .subtitle-text, .captions-text, .captions-display, .live-captions, [role="log"], [aria-live="polite"], .subtitle-element');
  const hasSubtitles = subtitleElements.length > 0;
  
  console.log('Subtitle elements found:', subtitleElements.length);
  meetState.subtitlesEnabled = hasSubtitles;
  
  if (!hasSubtitles && !meetState.isNoteTakingActive) {
    console.log('No subtitles detected - user should enable live captions');
  } else if (hasSubtitles && !meetState.isNoteTakingActive) {
    console.log('Subtitles detected - meeting notes ready');
  }
}

// Non-invasive subtitle monitoring - no script injection
function setupNonInvasiveSubtitleMonitoring() {
  console.log('Setting up non-invasive subtitle monitoring...');
  
  // Use extremely subtle approach - check very infrequently
  setInterval(() => {
    if (meetState.isNoteTakingActive) {
      // Use more specific selectors to avoid false positives
      const subtitleElements = document.querySelectorAll(
        '[data-speaker-id], [class*="caption"], [class*="subtitle"], [role="log"], [aria-live="polite"]'
      );
      if (subtitleElements.length > 0) {
        processSubtitles(subtitleElements);
      }
    }
  }, 5000); // Check every 5 seconds - extremely subtle
  
  // Initial check with much longer delay
  setTimeout(() => {
    const existingSubtitles = document.querySelectorAll(
      '[data-speaker-id], [class*="caption"], [class*="subtitle"], [role="log"], [aria-live="polite"]'
    );
    if (existingSubtitles.length > 0) {
      console.log('Found existing subtitle elements:', existingSubtitles.length);
      processSubtitles(existingSubtitles);
    }
  }, 5000); // Much longer delay
}

// Process subtitle elements and extract notes
function processSubtitles(subtitleElements) {
  console.log('Processing subtitles...', subtitleElements.length, 'elements');
  if (!meetState.subtitlesEnabled) {
    meetState.subtitlesEnabled = true;
    console.log('Subtitles detected - meeting notes ready');
  }

  subtitleElements.forEach((element, index) => {
    console.log(`Processing element ${index}:`, element);
    
    // For test page, look for subtitle-text class specifically
    let text = '';
    let speakerName = '';
    
    if (element.classList.contains('subtitle-element')) {
      // Test page structure
      const speakerElement = element.querySelector('.speaker-name');
      const textElement = element.querySelector('.subtitle-text');
      speakerName = speakerElement?.textContent?.trim() || 'Unknown Speaker';
      text = textElement?.textContent?.trim() || '';
    } else {
      // Real Google Meet structure
      text = element.textContent?.trim() || '';
      const speakerId = element.getAttribute('data-speaker-id');
      speakerName = getSpeakerName(speakerId) || 'Unknown Speaker';
    }
    
    console.log('Text content:', text);
    console.log('Speaker name:', speakerName);
    
    if (!text) return;
    
    // Create note entry
    const note = {
      timestamp: Date.now(),
      speaker: speakerName,
      text: text,
      type: 'subtitle'
    };

    // Add to notes if it's new content
    if (!isDuplicateNote(note)) {
      meetState.notes.push(note);
      saveMeetingNotes();
      console.log('Added note:', note);
    } else {
      console.log('Duplicate note, skipping');
    }
  });
}

// Get speaker name from speaker ID
function getSpeakerName(speakerId) {
  if (!speakerId) return null;
  
  // Try to find speaker name in the DOM
  const speakerElement = document.querySelector(`[data-speaker-id="${speakerId}"]`);
  if (speakerElement) {
    const nameElement = speakerElement.querySelector('.speaker-name, .participant-name');
    return nameElement?.textContent?.trim();
  }
  
  return null;
}

// Check if note is duplicate
function isDuplicateNote(newNote) {
  const recentNotes = meetState.notes.slice(-5); // Check last 5 notes
  return recentNotes.some(note => 
    note.text === newNote.text && 
    Math.abs(note.timestamp - newNote.timestamp) < 5000 // Within 5 seconds
  );
}

// Save meeting notes to storage
function saveMeetingNotes() {
  if (!meetState.currentMeetingId) return;
  
  const notesData = {
    meetingId: meetState.currentMeetingId,
    notes: meetState.notes,
    lastUpdated: Date.now()
  };

  // Try Chrome storage first, fallback to localStorage
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({
      [`meeting_notes_${meetState.currentMeetingId}`]: notesData
    });
  } else {
    // Fallback to localStorage for test page
    try {
      localStorage.setItem(`meeting_notes_${meetState.currentMeetingId}`, JSON.stringify(notesData));
      console.log('Saved notes to localStorage');
    } catch (e) {
      console.log('Failed to save to localStorage:', e);
    }
  }
}

// Load meeting notes from storage
function loadMeetingNotes(meetingId) {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get([`meeting_notes_${meetingId}`], (result) => {
      const notesData = result[`meeting_notes_${meetingId}`];
      if (notesData) {
        meetState.notes = notesData.notes || [];
      }
    });
  } else {
    // Fallback to localStorage for test page
    try {
      const stored = localStorage.getItem(`meeting_notes_${meetingId}`);
      if (stored) {
        const notesData = JSON.parse(stored);
        meetState.notes = notesData.notes || [];
        console.log('Loaded notes from localStorage:', meetState.notes.length);
      }
    } catch (e) {
      console.log('Failed to load from localStorage:', e);
    }
  }
}

// Export meeting notes
function exportMeetingNotes() {
  if (meetState.notes.length === 0) return;

  const notesText = meetState.notes.map(note => 
    `[${formatTime(note.timestamp)}] ${note.speaker}: ${note.text}`
  ).join('\n\n');

  const blob = new Blob([notesText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meeting-notes-${meetState.currentMeetingId}-${new Date().toISOString().split('T')[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// Clear meeting notes
function clearMeetingNotes() {
  meetState.notes = [];
  saveMeetingNotes();
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

// Initialize when page loads with non-invasive approach
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing Meet Notes (Non-Invasive)...');
  nonInvasiveInject();
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loading, initializing Meet Notes (Non-Invasive)...');
    nonInvasiveInject();
  });
} else {
  console.log('DOM already loaded, initializing Meet Notes (Non-Invasive)...');
  nonInvasiveInject();
} 