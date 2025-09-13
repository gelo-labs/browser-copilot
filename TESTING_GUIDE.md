# GeloLabs Meeting Notes - Testing Guide

This guide will walk you through testing the Google Workspace Add-on step by step.

## 🚀 Quick Test Setup

### Step 1: Create Google Apps Script Project

1. **Go to Google Apps Script**
   ```
   https://script.google.com
   ```

2. **Create New Project**
   - Click "New Project"
   - Name it "GeloLabs Meeting Notes Test"

3. **Copy Our Files**
   - Replace the default `Code.gs` with our version
   - Add `appsscript.json` configuration file

### Step 2: Test Basic Functions

1. **Test onOpen Function**
   - In Google Apps Script, click "Run" → "onOpen"
   - You should see a card interface appear
   - Verify the buttons work

2. **Test Card Creation**
   - Run `createMainCard()` function
   - Run `createMeetingCard()` function
   - Run `createNotesCard()` function

### Step 3: Test with Google Meet

1. **Create Test Deployment**
   - Click "Deploy" → "New deployment"
   - Select "Add-on" as type
   - Set "Who has access" to "Anyone"
   - Copy the deployment URL

2. **Install Test Add-on**
   - Open the deployment URL
   - Click "Install" to add the add-on
   - Grant necessary permissions

3. **Test in Google Meet**
   - Open a Google Meet meeting
   - Look for the add-on in the sidebar
   - Test the "Start Recording" button

## 🧪 Testing Scenarios

### Scenario 1: Basic Functionality

**Test Steps:**
1. Open Google Apps Script
2. Run `onOpen()` function
3. Verify card appears with buttons
4. Click "Start New Meeting"
5. Verify meeting card appears

**Expected Results:**
- ✅ Card interface loads
- ✅ Buttons are clickable
- ✅ Meeting state updates
- ✅ Notes array initializes

### Scenario 2: Meeting Detection

**Test Steps:**
1. Join a Google Meet meeting
2. Check if add-on appears in sidebar
3. Click "Start Recording"
4. Verify recording state changes

**Expected Results:**
- ✅ Add-on appears in Google Meet
- ✅ Meeting ID is detected
- ✅ Recording toggle works
- ✅ Notes capture starts

### Scenario 3: Notes Capture

**Test Steps:**
1. Start recording in a meeting
2. Speak for a few minutes
3. Check if notes are captured
4. View captured notes

**Expected Results:**
- ✅ Notes are captured
- ✅ Timestamps are recorded
- ✅ Speaker information is tracked
- ✅ Notes display correctly

### Scenario 4: Export Functionality

**Test Steps:**
1. Capture some notes
2. Click "Export Notes"
3. Check Google Drive for exported file
4. Verify file format and content

**Expected Results:**
- ✅ Export button works
- ✅ File is created in Google Drive
- ✅ File contains all notes
- ✅ Format is readable

## 🔧 Debug Mode

### Enable Debug Logging

Add this to the top of `Code.gs`:

```javascript
const DEBUG_MODE = true;

function log(message) {
  if (DEBUG_MODE) {
    console.log('[GeloLabs] ' + message);
  }
}
```

### Test Individual Functions

```javascript
// Test meeting detection
function testMeetingDetection() {
  console.log('Testing meeting detection...');
  const testMeeting = {
    meetingId: 'test-meeting-123',
    startTime: Date.now()
  };
  currentMeeting = testMeeting;
  console.log('Meeting set:', currentMeeting);
}

// Test notes capture
function testNotesCapture() {
  console.log('Testing notes capture...');
  const testNote = {
    timestamp: Date.now(),
    speaker: 'Test Speaker',
    text: 'This is a test note',
    type: 'test'
  };
  addNote(testNote);
  console.log('Notes array:', meetingNotes);
}

// Test export functionality
function testExport() {
  console.log('Testing export...');
  exportNotes();
}
```

## 📊 Expected Test Results

### Successful Test Indicators

1. **Google Apps Script Console**
   ```
   [GeloLabs] GeloLabs Meeting Notes Add-on opened
   [GeloLabs] Homepage triggered
   [GeloLabs] Meeting detected: meeting-123
   [GeloLabs] Starting meeting monitoring...
   [GeloLabs] Capturing transcript...
   [GeloLabs] Added note: {timestamp: 1234567890, speaker: "Unknown Speaker", text: "..."}
   ```

2. **Card Interface**
   - Main card loads with buttons
   - Meeting card shows recording controls
   - Notes card displays captured content

3. **Google Meet Integration**
   - Add-on appears in sidebar
   - Recording button toggles state
   - Notes are captured during meeting

### Common Issues & Solutions

1. **Add-on Not Appearing in Google Meet**
   - **Solution**: Check deployment settings
   - **Solution**: Verify add-on is enabled
   - **Solution**: Refresh Google Meet page

2. **Recording Not Working**
   - **Solution**: Check Google Meet permissions
   - **Solution**: Verify meeting has transcripts enabled
   - **Solution**: Test with different meeting types

3. **Export Fails**
   - **Solution**: Check Google Drive permissions
   - **Solution**: Verify folder ID is correct
   - **Solution**: Ensure sufficient storage space

## 🎯 Performance Testing

### Load Testing

```javascript
// Test with multiple notes
function loadTest() {
  console.log('Starting load test...');
  
  for (let i = 0; i < 100; i++) {
    const note = {
      timestamp: Date.now() + i,
      speaker: `Speaker ${i % 5}`,
      text: `Test note ${i}`,
      type: 'load-test'
    };
    addNote(note);
  }
  
  console.log('Load test complete. Notes count:', meetingNotes.length);
}
```

### Memory Testing

```javascript
// Test memory usage
function memoryTest() {
  console.log('Starting memory test...');
  const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
  
  // Add many notes
  for (let i = 0; i < 1000; i++) {
    addNote({
      timestamp: Date.now() + i,
      speaker: 'Test Speaker',
      text: 'Test note ' + i,
      type: 'memory-test'
    });
  }
  
  const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
  console.log('Memory usage:', endMemory - startMemory, 'bytes');
}
```

## 📝 Test Report Template

### Test Session Report

**Date:** _______________
**Tester:** _______________
**Version:** _______________

**Test Results:**

| Test Scenario | Status | Notes |
|---------------|--------|-------|
| Basic Functionality | ✅/❌ | |
| Meeting Detection | ✅/❌ | |
| Notes Capture | ✅/❌ | |
| Export Functionality | ✅/❌ | |
| Performance | ✅/❌ | |

**Issues Found:**
- Issue 1: _______________
- Issue 2: _______________
- Issue 3: _______________

**Recommendations:**
- Recommendation 1: _______________
- Recommendation 2: _______________

## 🚀 Next Steps After Testing

1. **Fix Any Issues**
   - Address bugs found during testing
   - Update code as needed
   - Re-test affected functionality

2. **Optimize Performance**
   - Reduce memory usage if needed
   - Optimize capture intervals
   - Improve error handling

3. **Prepare for Deployment**
   - Remove debug logging
   - Update production settings
   - Create final deployment

4. **Document Results**
   - Record test results
   - Document any issues
   - Update deployment guide

---

**Ready to test?** Follow this guide step-by-step to ensure your add-on works perfectly before deployment! 