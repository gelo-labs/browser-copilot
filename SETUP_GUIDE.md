# GeloLabs Meeting Notes - Setup Guide

This guide will walk you through setting up the GeloLabs Meeting Notes Google Workspace Add-on.

## 📋 Prerequisites

### Required Accounts & Access

1. **Google Workspace Account**
   - Personal Google account, OR
   - Company Google Workspace account
   - Must have Google Meet access

2. **Google Apps Script Access**
   - Enable Google Apps Script in your account
   - Visit https://script.google.com to verify access

3. **Google Drive Access**
   - For storing meeting notes
   - Create a dedicated folder for notes

## 🚀 Step-by-Step Setup

### Step 1: Create Google Apps Script Project

1. **Go to Google Apps Script**
   ```
   https://script.google.com
   ```

2. **Create New Project**
   - Click "New Project"
   - Name it "GeloLabs Meeting Notes"

3. **Copy Project Files**
   - Replace the default `Code.gs` with our version
   - Add `appsscript.json` configuration file

### Step 2: Configure Add-on Settings

1. **Update appsscript.json**
   ```json
   {
     "timeZone": "America/New_York",
     "dependencies": {
       "enabledAdvancedServices": []
     },
     "exceptionLogging": "STACKDRIVER",
     "runtimeVersion": "V8",
     "addOns": {
       "common": {
         "name": "GeloLabs Meeting Notes",
         "logoUrl": "https://www.gelolabs.com/logo.png",
         "useLocaleFromApp": true,
         "homepageTrigger": {
           "runFunction": "onHomepage",
           "enabled": true
         },
         "universalActions": [
           {
             "label": "Open Meeting Notes",
             "runFunction": "onOpenMeetingNotes"
           }
         ]
       },
       "meet": {
         "contextualTriggers": [
           {
             "unconditional": {},
             "onTriggerFunction": "onMeetTrigger"
           }
         ]
       }
     }
   }
   ```

2. **Configure Google Drive Folder**
   - Create a folder in Google Drive for meeting notes
   - Update the folder ID in `Code.gs`:
   ```javascript
   const folder = DriveApp.getFolderById('YOUR_FOLDER_ID_HERE');
   ```

### Step 3: Test the Add-on

1. **Test Locally**
   - Click "Run" → "onOpen" in Google Apps Script
   - Verify the card interface appears

2. **Test with Google Meet**
   - Open a Google Meet meeting
   - Check if the add-on appears in the sidebar
   - Test the "Start Recording" functionality

### Step 4: Deploy as Add-on

1. **Create Deployment**
   - Click "Deploy" → "New deployment"
   - Select "Add-on" as type
   - Fill in required information:
     - **Description**: "GeloLabs Meeting Notes - Capture and organize meeting notes"
     - **Version**: "1.0.0"
     - **Execute as**: "Me"
     - **Who has access**: "Anyone"

2. **Configure Add-on Settings**
   - **Add-on name**: "GeloLabs Meeting Notes"
   - **Logo**: Upload your logo (120x120px)
   - **Description**: Add detailed description
   - **Support URL**: https://gelolabs.com/support

3. **Test Deployment**
   - Install the add-on in test mode
   - Verify functionality in Google Meet

## 🔧 Configuration Options

### Google Drive Integration

```javascript
// In Code.gs, update the folder ID
const NOTES_FOLDER_ID = 'your-folder-id-here';

function saveNotes() {
  const folder = DriveApp.getFolderById(NOTES_FOLDER_ID);
  const file = folder.createFile('meeting-notes-' + Date.now() + '.json', JSON.stringify(meetingNotes));
}
```

### Meeting Detection

```javascript
// Configure meeting detection sensitivity
const MEETING_CHECK_INTERVAL = 5000; // 5 seconds
const TRANSCRIPT_CAPTURE_INTERVAL = 3000; // 3 seconds
```

### Export Settings

```javascript
// Configure export format
const EXPORT_FORMAT = 'txt'; // or 'json', 'csv'
const INCLUDE_TIMESTAMPS = true;
const INCLUDE_SPEAKER_NAMES = true;
```

## 🧪 Testing

### Test Scenarios

1. **Basic Functionality**
   - [ ] Add-on loads in Google Meet
   - [ ] Start/Stop recording works
   - [ ] Notes are captured
   - [ ] Export functionality works

2. **Meeting Integration**
   - [ ] Detects meeting start
   - [ ] Captures speaker information
   - [ ] Handles meeting end
   - [ ] Saves notes properly

3. **Error Handling**
   - [ ] No meeting detected
   - [ ] Network issues
   - [ ] Permission denied
   - [ ] Storage full

### Debug Mode

Enable debug logging:

```javascript
// Add to Code.gs
const DEBUG_MODE = true;

function log(message) {
  if (DEBUG_MODE) {
    console.log('[GeloLabs] ' + message);
  }
}
```

## 🔒 Security & Permissions

### Required Permissions

The add-on will request these permissions:

- **Google Meet**: Access meeting data and transcripts
- **Google Drive**: Save and export notes
- **Google Calendar**: Access meeting information
- **User Data**: Store meeting notes and preferences

### Privacy Settings

- **Data Storage**: All notes stored in user's Google Drive
- **No External Access**: No data sent to external servers
- **User Control**: Users can delete notes anytime
- **Company Compliance**: Follows Google Workspace security policies

## 🚨 Troubleshooting

### Common Issues

1. **Add-on Not Appearing in Google Meet**
   - Check deployment status
   - Verify add-on is enabled
   - Check browser console for errors

2. **Recording Not Working**
   - Verify Google Meet permissions
   - Check if meeting has transcripts enabled
   - Test with different meeting types

3. **Export Fails**
   - Check Google Drive permissions
   - Verify folder ID is correct
   - Ensure sufficient storage space

4. **Performance Issues**
   - Reduce capture intervals
   - Limit note history size
   - Check network connectivity

### Debug Steps

1. **Check Console Logs**
   ```javascript
   // In Google Apps Script
   View → Execution log
   ```

2. **Test Individual Functions**
   ```javascript
   // Test specific functions
   function testCaptureTranscript() {
     captureTranscript();
   }
   ```

3. **Verify Permissions**
   - Check Google Workspace Admin Console
   - Verify add-on is approved
   - Test with different user accounts

## 📞 Support

### Getting Help

1. **Check Documentation**
   - [Google Workspace Add-ons Guide](https://developers.google.com/apps-script/add-ons)
   - [Google Meet API Reference](https://developers.google.com/meet/add-ons)

2. **Contact Support**
   - **Email**: hello@gelolabs.com
   - **GitHub Issues**: [Create Issue](https://github.com/gelolabs/meeting-notes-addon/issues)

3. **Community Resources**
   - [Google Apps Script Community](https://developers.google.com/apps-script/community)
   - [Google Workspace Developers](https://developers.google.com/workspace)

### Reporting Issues

When reporting issues, include:

- **Google Workspace Account Type**: Personal or Company
- **Add-on Version**: Current version number
- **Error Messages**: Full error text
- **Steps to Reproduce**: Detailed steps
- **Expected vs Actual Behavior**: Clear description

## 🎯 Next Steps

After setup:

1. **Test thoroughly** with different meeting types
2. **Configure company deployment** if using Google Workspace
3. **Submit to Google Workspace Marketplace** for public distribution
4. **Monitor usage** and gather feedback
5. **Iterate and improve** based on user feedback

---

**Need help?** Contact us at hello@gelolabs.com or create an issue on GitHub. 