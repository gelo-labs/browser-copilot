# GeloLabs Meeting Notes - Google Workspace Add-on

A Google Workspace Add-on that captures and organizes meeting notes from Google Meet using official Google APIs.

## 🎯 Overview

This add-on integrates directly with Google Meet to capture real-time meeting transcripts, speaker identification, and meeting metadata. Unlike Chrome extensions, this approach is officially supported by Google and avoids all CSP restrictions.

## ✨ Features

- **Real-time Transcript Capture**: Access live meeting transcripts through Google's official APIs
- **Speaker Identification**: Automatically identify and label speakers
- **Meeting Metadata**: Capture meeting details, participants, and timestamps
- **Export Functionality**: Export notes to Google Drive or other formats
- **Native Integration**: Seamlessly integrates with Google Meet's interface
- **No CSP Restrictions**: Officially supported by Google

## 🏗️ Architecture

### Google Workspace Add-on vs Chrome Extension

| Feature | Chrome Extension | Google Workspace Add-on |
|---------|------------------|------------------------|
| **Google Meet Support** | ❌ Blocked by CSP | ✅ Officially Supported |
| **Transcript Access** | ❌ Limited (scraping) | ✅ Direct API Access |
| **Speaker Identification** | ❌ Manual detection | ✅ Built-in support |
| **UI Integration** | ❌ Floating elements | ✅ Native sidebar |
| **Deployment** | Chrome Web Store | Google Workspace Marketplace |
| **Company Control** | User-controlled | Admin-controlled |

## 📁 Project Structure

```
gelolabs-meeting-notes-addon/
├── appsscript.json          # Add-on configuration
├── Code.gs                  # Main Google Apps Script code
├── README.md               # This file
├── SETUP_GUIDE.md          # Setup instructions
├── DEPLOYMENT_GUIDE.md     # Deployment instructions
└── API_REFERENCE.md        # Google Meet API reference
```

## 🚀 Quick Start

### Prerequisites

1. **Google Workspace Account**: Personal or company account
2. **Google Apps Script Access**: Enable Google Apps Script
3. **Google Meet Access**: Active Google Meet usage

### Setup Steps

1. **Create Google Apps Script Project**
   ```bash
   # Go to https://script.google.com
   # Create new project
   # Copy files from this repository
   ```

2. **Configure Add-on Settings**
   ```json
   {
     "timeZone": "America/New_York",
     "dependencies": {
       "enabledAdvancedServices": []
     },
     "exceptionLogging": "STACKDRIVER",
     "runtimeVersion": "V8"
   }
   ```

3. **Deploy as Add-on**
   - Click "Deploy" → "New deployment"
   - Select "Add-on" as type
   - Configure add-on settings
   - Deploy to Google Workspace Marketplace

## 🔧 Development

### Local Development

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd gelolabs-meeting-notes-addon
   ```

2. **Open in Google Apps Script**
   - Go to https://script.google.com
   - Create new project
   - Copy files from local directory

3. **Test Locally**
   - Use Google Apps Script's built-in testing
   - Test with Google Meet test environment

### Key Functions

- `onInstall(e)`: Triggered when add-on is installed
- `onOpen(e)`: Triggered when add-on is opened
- `onMeetTrigger(e)`: Triggered when Google Meet is opened
- `startMeetingMonitoring()`: Starts transcript capture
- `captureTranscript()`: Captures meeting transcript
- `exportNotes()`: Exports notes to Google Drive

## 📊 API Integration

### Google Meet APIs (Planned)

```javascript
// Real-time transcript access
const transcript = meeting.getTranscript();

// Speaker identification
const speakers = meeting.getParticipants();

// Meeting metadata
const metadata = meeting.getMetadata();

// Participant information
const participants = meeting.getParticipantList();
```

### Google Drive Integration

```javascript
// Save notes to Google Drive
const folder = DriveApp.getFolderById('folder-id');
const file = folder.createFile('notes.json', JSON.stringify(notes));
```

## 🚀 Deployment

### Google Workspace Marketplace

1. **Prepare Add-on**
   - Complete all code
   - Test thoroughly
   - Prepare documentation

2. **Submit for Review**
   - Create listing on Google Workspace Marketplace
   - Submit for Google review
   - Wait for approval (2-4 weeks)

3. **Company Deployment**
   - Admin approves in Google Workspace Admin Console
   - Users can install from Marketplace
   - Enterprise deployment available

## 🔒 Security & Permissions

### Required Permissions

- **Google Meet**: Access meeting data and transcripts
- **Google Drive**: Save and export notes
- **Google Calendar**: Access meeting information
- **User Data**: Store meeting notes and preferences

### Data Privacy

- **Local Storage**: Notes stored in user's Google Drive
- **No External Servers**: All data stays within Google ecosystem
- **User Control**: Users control what data is captured
- **Company Compliance**: Follows Google Workspace security policies

## 📈 Roadmap

### Phase 1: Basic Functionality ✅
- [x] Add-on structure and configuration
- [x] Basic UI components
- [x] Meeting detection
- [ ] Transcript capture (API integration)

### Phase 2: Advanced Features 🔄
- [ ] Real-time transcript capture
- [ ] Speaker identification
- [ ] Meeting metadata integration
- [ ] Export functionality

### Phase 3: Enterprise Features 📋
- [ ] Company-wide deployment
- [ ] Admin controls
- [ ] Analytics and reporting
- [ ] Integration with other Google Workspace apps

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**
3. **Make changes**
4. **Test thoroughly**
5. **Submit pull request**

## 📞 Support

- **Email**: hello@gelolabs.com
- **Documentation**: [GeloLabs Documentation](https://docs.gelolabs.com)
- **Issues**: [GitHub Issues](https://github.com/gelolabs/meeting-notes-addon/issues)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Workspace Add-ons team for the excellent documentation
- Google Meet API team for providing official integration methods
- The open-source community for inspiration and feedback

---

**Note**: This add-on is designed to work alongside the GeloLabs Chrome Extension, which handles YouTube Shorts blocking and AI video assistance. Together, they provide a comprehensive productivity solution. 