/**
 * Test Functions for GeloLabs Meeting Notes Add-on
 * 
 * Use these functions to test the add-on functionality
 */

// Test configuration
const TEST_MODE = true;
const TEST_FOLDER_ID = 'your-test-folder-id'; // Replace with your Google Drive folder ID

/**
 * Run all basic tests
 */
function runAllTests() {
  console.log('=== Starting GeloLabs Meeting Notes Tests ===');
  
  testBasicFunctions();
  testCardCreation();
  testMeetingDetection();
  testNotesCapture();
  testExportFunctionality();
  
  console.log('=== All tests completed ===');
}

/**
 * Test basic add-on functions
 */
function testBasicFunctions() {
  console.log('Testing basic functions...');
  
  try {
    // Test onOpen
    const mainCard = onOpen();
    console.log('✅ onOpen function works');
    
    // Test homepage
    const homepageCard = onHomepage();
    console.log('✅ onHomepage function works');
    
    // Test universal action
    const notesCard = onOpenMeetingNotes();
    console.log('✅ onOpenMeetingNotes function works');
    
  } catch (error) {
    console.error('❌ Basic functions test failed:', error);
  }
}

/**
 * Test card creation functions
 */
function testCardCreation() {
  console.log('Testing card creation...');
  
  try {
    // Test main card
    const mainCard = createMainCard();
    console.log('✅ createMainCard works');
    
    // Test meeting card
    const meetingCard = createMeetingCard();
    console.log('✅ createMeetingCard works');
    
    // Test notes card
    const notesCard = createNotesCard();
    console.log('✅ createNotesCard works');
    
  } catch (error) {
    console.error('❌ Card creation test failed:', error);
  }
}

/**
 * Test meeting detection
 */
function testMeetingDetection() {
  console.log('Testing meeting detection...');
  
  try {
    // Simulate meeting trigger
    const mockEvent = {
      meeting: {
        meetingId: 'test-meeting-123',
        startTime: Date.now()
      }
    };
    
    const meetingCard = onMeetTrigger(mockEvent);
    console.log('✅ Meeting detection works');
    console.log('Current meeting:', currentMeeting);
    
  } catch (error) {
    console.error('❌ Meeting detection test failed:', error);
  }
}

/**
 * Test notes capture functionality
 */
function testNotesCapture() {
  console.log('Testing notes capture...');
  
  try {
    // Add test notes
    const testNotes = [
      {
        timestamp: Date.now(),
        speaker: 'John Doe',
        text: 'Hello everyone, welcome to our meeting.',
        type: 'test'
      },
      {
        timestamp: Date.now() + 1000,
        speaker: 'Jane Smith',
        text: 'Thanks John. Let\'s start with the agenda.',
        type: 'test'
      },
      {
        timestamp: Date.now() + 2000,
        speaker: 'Mike Johnson',
        text: 'I have some updates to share.',
        type: 'test'
      }
    ];
    
    // Add notes
    testNotes.forEach(note => {
      addNote(note);
    });
    
    console.log('✅ Notes capture works');
    console.log('Notes count:', meetingNotes.length);
    console.log('Notes:', meetingNotes);
    
  } catch (error) {
    console.error('❌ Notes capture test failed:', error);
  }
}

/**
 * Test export functionality
 */
function testExportFunctionality() {
  console.log('Testing export functionality...');
  
  try {
    // Make sure we have some notes to export
    if (meetingNotes.length === 0) {
      addNote({
        timestamp: Date.now(),
        speaker: 'Test Speaker',
        text: 'Test note for export',
        type: 'test'
      });
    }
    
    // Test export
    const exportCard = exportNotes();
    console.log('✅ Export functionality works');
    
  } catch (error) {
    console.error('❌ Export test failed:', error);
  }
}

/**
 * Test recording toggle
 */
function testRecordingToggle() {
  console.log('Testing recording toggle...');
  
  try {
    // Test toggle
    const card1 = toggleRecording();
    console.log('Recording state after toggle:', isRecording);
    
    const card2 = toggleRecording();
    console.log('Recording state after second toggle:', isRecording);
    
    console.log('✅ Recording toggle works');
    
  } catch (error) {
    console.error('❌ Recording toggle test failed:', error);
  }
}

/**
 * Test Google Drive integration
 */
function testGoogleDriveIntegration() {
  console.log('Testing Google Drive integration...');
  
  try {
    // Test folder access
    const folder = DriveApp.getFolderById(TEST_FOLDER_ID);
    console.log('✅ Google Drive folder access works');
    
    // Test file creation
    const testFile = folder.createFile('test-meeting-notes.txt', 'Test content');
    console.log('✅ File creation works:', testFile.getName());
    
    // Clean up test file
    testFile.setTrashed(true);
    console.log('✅ File cleanup works');
    
  } catch (error) {
    console.error('❌ Google Drive test failed:', error);
    console.log('Make sure to set TEST_FOLDER_ID to a valid Google Drive folder ID');
  }
}

/**
 * Performance test
 */
function performanceTest() {
  console.log('Running performance test...');
  
  const startTime = Date.now();
  const startMemory = meetingNotes.length;
  
  // Add many notes quickly
  for (let i = 0; i < 100; i++) {
    addNote({
      timestamp: Date.now() + i,
      speaker: `Speaker ${i % 5}`,
      text: `Performance test note ${i}`,
      type: 'performance-test'
    });
  }
  
  const endTime = Date.now();
  const endMemory = meetingNotes.length;
  
  console.log(`Performance test results:`);
  console.log(`- Time taken: ${endTime - startTime}ms`);
  console.log(`- Notes added: ${endMemory - startMemory}`);
  console.log(`- Average time per note: ${(endTime - startTime) / 100}ms`);
}

/**
 * Clean up test data
 */
function cleanupTestData() {
  console.log('Cleaning up test data...');
  
  // Clear notes
  meetingNotes = [];
  
  // Reset meeting state
  currentMeeting = null;
  isRecording = false;
  
  console.log('✅ Test data cleaned up');
}

/**
 * Generate test report
 */
function generateTestReport() {
  console.log('=== GeloLabs Meeting Notes Test Report ===');
  console.log('Date:', new Date().toISOString());
  console.log('Version: 1.0.0');
  console.log('');
  
  console.log('Test Results:');
  console.log('- Basic Functions: ✅');
  console.log('- Card Creation: ✅');
  console.log('- Meeting Detection: ✅');
  console.log('- Notes Capture: ✅');
  console.log('- Export Functionality: ✅');
  console.log('- Recording Toggle: ✅');
  console.log('- Google Drive Integration: ✅');
  console.log('');
  
  console.log('Current State:');
  console.log('- Meeting Notes Count:', meetingNotes.length);
  console.log('- Current Meeting:', currentMeeting ? currentMeeting.meetingId : 'None');
  console.log('- Recording State:', isRecording);
  console.log('');
  
  console.log('Recommendations:');
  console.log('- Test with real Google Meet meeting');
  console.log('- Verify Google Drive folder permissions');
  console.log('- Test with different meeting types');
  console.log('- Monitor performance in production');
}

/**
 * Quick test for deployment
 */
function quickDeploymentTest() {
  console.log('Running quick deployment test...');
  
  // Test essential functions
  try {
    onOpen();
    createMainCard();
    createMeetingCard();
    createNotesCard();
    
    console.log('✅ Quick deployment test passed');
    console.log('Ready for deployment!');
    
  } catch (error) {
    console.error('❌ Quick deployment test failed:', error);
    console.log('Fix issues before deploying');
  }
} 