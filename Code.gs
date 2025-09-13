/**
 * GeloLabs Meeting Notes - Google Workspace Add-on
 * 
 * This add-on integrates with Google Meet to capture meeting notes
 * and provide real-time transcript functionality.
 */

// Global variables for meeting state
let currentMeeting = null;
let meetingNotes = [];
let isRecording = false;

/**
 * Triggered when the add-on is installed or updated
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Triggered when the add-on is opened
 */
function onOpen(e) {
  console.log('GeloLabs Meeting Notes Add-on opened');
  
  // Create the main card interface
  const card = createMainCard();
  return card;
}

/**
 * Triggered when the add-on homepage is accessed
 */
function onHomepage(e) {
  console.log('Homepage triggered');
  
  const card = createMainCard();
  return card;
}

/**
 * Triggered when Google Meet is opened
 */
function onMeetTrigger(e) {
  console.log('Google Meet trigger activated');
  
  // Check if we're in a meeting
  if (e && e.meeting) {
    currentMeeting = e.meeting;
    console.log('Meeting detected:', currentMeeting.meetingId);
    
    // Start monitoring the meeting
    startMeetingMonitoring();
  }
  
  const card = createMeetingCard();
  return card;
}

/**
 * Universal action to open meeting notes
 */
function onOpenMeetingNotes(e) {
  console.log('Open meeting notes triggered');
  
  const card = createNotesCard();
  return card;
}

/**
 * Creates the main add-on card
 */
function createMainCard() {
  const card = CardService.newCardBuilder();
  
  const header = CardService.newCardHeader()
    .setTitle('GeloLabs Meeting Notes')
    .setSubtitle('Capture and organize your meeting notes')
    .setImageUrl('https://www.gelolabs.com/logo.png');
  
  const section = CardService.newCardSection()
    .setHeader('Meeting Notes Assistant')
    .addWidget(CardService.newTextParagraph()
      .setText('Welcome to GeloLabs Meeting Notes! This add-on helps you capture and organize meeting notes from Google Meet.'))
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText('Start New Meeting')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('startNewMeeting')))
      .addButton(CardService.newTextButton()
        .setText('View Recent Notes')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('viewRecentNotes'))));
  
  card.setHeader(header);
  card.addSection(section);
  
  return card.build();
}

/**
 * Creates the meeting interface card
 */
function createMeetingCard() {
  const card = CardService.newCardBuilder();
  
  const header = CardService.newCardHeader()
    .setTitle('Meeting Notes')
    .setSubtitle('Active meeting detected')
    .setImageUrl('https://www.gelolabs.com/logo.png');
  
  const section = CardService.newCardSection()
    .setHeader('Meeting Controls')
    .addWidget(CardService.newTextParagraph()
      .setText('Meeting ID: ' + (currentMeeting ? currentMeeting.meetingId : 'Unknown')))
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(isRecording ? 'Stop Recording' : 'Start Recording')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('toggleRecording')))
      .addButton(CardService.newTextButton()
        .setText('View Notes')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('viewCurrentNotes'))));
  
  // Add recent notes if available
  if (meetingNotes.length > 0) {
    const notesSection = CardService.newCardSection()
      .setHeader('Recent Notes');
    
    // Show last 3 notes
    const recentNotes = meetingNotes.slice(-3);
    recentNotes.forEach(note => {
      notesSection.addWidget(CardService.newTextParagraph()
        .setText(`[${formatTime(note.timestamp)}] ${note.speaker}: ${note.text}`));
    });
    
    card.addSection(notesSection);
  }
  
  card.setHeader(header);
  card.addSection(section);
  
  return card.build();
}

/**
 * Creates the notes display card
 */
function createNotesCard() {
  const card = CardService.newCardBuilder();
  
  const header = CardService.newCardHeader()
    .setTitle('Meeting Notes')
    .setSubtitle('Your captured notes')
    .setImageUrl('https://www.gelolabs.com/logo.png');
  
  const section = CardService.newCardSection()
    .setHeader('Notes');
  
  if (meetingNotes.length === 0) {
    section.addWidget(CardService.newTextParagraph()
      .setText('No notes captured yet. Join a Google Meet meeting to start capturing notes.'));
  } else {
    // Display all notes
    meetingNotes.forEach(note => {
      section.addWidget(CardService.newTextParagraph()
        .setText(`[${formatTime(note.timestamp)}] ${note.speaker}: ${note.text}`));
    });
    
    // Add export button
    section.addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText('Export Notes')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('exportNotes')))
      .addButton(CardService.newTextButton()
        .setText('Clear Notes')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('clearNotes'))));
  }
  
  card.setHeader(header);
  card.addSection(section);
  
  return card.build();
}

/**
 * Starts monitoring the current meeting
 */
function startMeetingMonitoring() {
  console.log('Starting meeting monitoring...');
  
  // Set up periodic transcript capture
  // Note: This is a simplified version - real implementation would use Google Meet APIs
  setInterval(() => {
    if (isRecording && currentMeeting) {
      captureTranscript();
    }
  }, 5000); // Check every 5 seconds
}

/**
 * Captures transcript from the current meeting
 */
function captureTranscript() {
  try {
    // This would use Google Meet's transcript API
    // For now, we'll simulate transcript capture
    console.log('Capturing transcript...');
    
    // In a real implementation, this would access:
    // - meeting.getTranscript()
    // - meeting.getParticipants()
    // - meeting.getCurrentSpeaker()
    
    // Simulate capturing a note
    const simulatedNote = {
      timestamp: Date.now(),
      speaker: 'Unknown Speaker',
      text: 'Meeting transcript captured at ' + new Date().toLocaleTimeString(),
      type: 'transcript'
    };
    
    addNote(simulatedNote);
    
  } catch (error) {
    console.error('Error capturing transcript:', error);
  }
}

/**
 * Adds a note to the current meeting
 */
function addNote(note) {
  meetingNotes.push(note);
  console.log('Added note:', note);
  
  // Save to storage
  saveNotes();
}

/**
 * Saves notes to Google Drive or other storage
 */
function saveNotes() {
  try {
    // Save to Google Drive
    const folder = DriveApp.getFolderById('your-folder-id'); // Replace with actual folder ID
    const file = folder.createFile('meeting-notes-' + Date.now() + '.json', JSON.stringify(meetingNotes));
    console.log('Notes saved to Drive:', file.getName());
  } catch (error) {
    console.error('Error saving notes:', error);
  }
}

/**
 * Toggles recording state
 */
function toggleRecording() {
  isRecording = !isRecording;
  console.log('Recording toggled:', isRecording);
  
  if (isRecording) {
    startMeetingMonitoring();
  }
  
  // Return updated card
  return createMeetingCard();
}

/**
 * Views current meeting notes
 */
function viewCurrentNotes() {
  return createNotesCard();
}

/**
 * Views recent notes from all meetings
 */
function viewRecentNotes() {
  // This would load notes from storage
  console.log('Loading recent notes...');
  return createNotesCard();
}

/**
 * Starts a new meeting session
 */
function startNewMeeting() {
  currentMeeting = {
    meetingId: 'meeting-' + Date.now(),
    startTime: Date.now()
  };
  
  meetingNotes = [];
  isRecording = false;
  
  console.log('New meeting started:', currentMeeting.meetingId);
  return createMeetingCard();
}

/**
 * Exports notes to a file
 */
function exportNotes() {
  try {
    const notesText = meetingNotes.map(note => 
      `[${formatTime(note.timestamp)}] ${note.speaker}: ${note.text}`
    ).join('\n\n');
    
    // Create a text file in Google Drive
    const folder = DriveApp.getFolderById('your-folder-id'); // Replace with actual folder ID
    const file = folder.createFile('meeting-notes-' + Date.now() + '.txt', notesText);
    
    console.log('Notes exported:', file.getName());
    
    // Return success card
    const card = CardService.newCardBuilder();
    const section = CardService.newCardSection()
      .setHeader('Export Successful')
      .addWidget(CardService.newTextParagraph()
        .setText('Notes exported to Google Drive: ' + file.getName()));
    
    card.addSection(section);
    return card.build();
    
  } catch (error) {
    console.error('Error exporting notes:', error);
    
    // Return error card
    const card = CardService.newCardBuilder();
    const section = CardService.newCardSection()
      .setHeader('Export Failed')
      .addWidget(CardService.newTextParagraph()
        .setText('Failed to export notes. Please try again.'));
    
    card.addSection(section);
    return card.build();
  }
}

/**
 * Clears all notes
 */
function clearNotes() {
  meetingNotes = [];
  console.log('Notes cleared');
  return createNotesCard();
}

/**
 * Formats timestamp for display
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
} 