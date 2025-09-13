# Changelog

All notable changes to GeloLabs: Browser Copilot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2024-09-13 (Current Release)

### 🆕 Added
- **GeloNotes**: Floating sticky notes with autoscroll teleprompter mode
- **GeloClipboard**: High-capacity clipboard manager with 1000 item storage
- **Logo Spinner**: Interactive physics-based logo spinner on gelolabs.com
- **Enhanced Context Menus**: Branded right-click menus (GeloNotes, GeloClipboard)
- **YouTube Video AI Integration**: Right-click context menu for YouTube videos
- **Keyboard Shortcuts**: Alt+G+1 (Notes), Alt+G+2 (Clipboard), Alt+G+3 (YouTube AI)

### 🎨 Redesigned
- **Unified Interface**: Consistent black/white/grey color scheme across all menus
- **Clean Popup Design**: Removed frames, added separator lines, improved spacing
- **Context-Aware Visibility**: YouTube features only show on YouTube pages
- **Enhanced Star Ratings**: Bright glow effects with improved hover animations

### 🔧 Improved
- **Extension Context Handling**: Fixed "Extension context invalidated" errors
- **Smart Visibility**: YouTube Video AI only shows on video pages (/watch?v=)
- **Performance Optimization**: Zero polling, efficient event handling
- **Error Recovery**: Graceful fallbacks for extension context issues

### 🐛 Fixed
- **Button Color Consistency**: All buttons now use unified grey color scheme
- **Separator Line Spacing**: Fixed double lines between sections
- **Background Styling**: Proper light grey background implementation
- **Context Menu Reliability**: Improved message passing between scripts

## [2.2.0] - 2024-12-XX

### 🆕 Added
- **Google Meet Integration**: Automatic meeting notes capture from Google Meet
- **Live Subtitle Detection**: Real-time subtitle monitoring with speaker identification
- **Smart Notifications**: Prompts to enable subtitles for optimal note-taking
- **Meeting Notes Interface**: Floating button and notes management panel
- **Export Functionality**: Download meeting notes as text files
- **Timestamped Notes**: Each note includes speaker name and timestamp
- **Meeting-Specific Storage**: Notes saved per meeting with unique meeting IDs

### 🔧 Improved
- **Multi-Platform Support**: Extension now works on both YouTube and Google Meet
- **Enhanced Subtitle Detection**: Support for various Google Meet subtitle selectors
- **User Experience**: Intuitive notifications and interface design
- **Privacy**: Meeting notes stored locally with no external data transmission

## [2.0.0] - 2024-11-XX

### 🆕 Added
- **AI Video Assistant**: Complete integration with Google Gemini API for video analysis
- **Conversational Chat Interface**: AI chat with conversation memory and context awareness
- **Quick Action Buttons**: One-click "Summarize", "Main Points", and "Action Items"
- **Smart Transcript Extraction**: Automatic video caption and transcript processing
- **YouTube Header Integration**: GeloLabs icon in YouTube header with hover animations
- **Gaming Content Filter**: Remove gaming videos from recommendations with multi-language support
- **Time Saved Tracking**: Counter showing productivity improvements from blocked content
- **Settings Interface**: Comprehensive settings panel with API key management
- **Video-Specific Caching**: Conversation history cached per video
- **Responsive UI**: Interface adapts to different screen resolutions (4K, HD, FHD)
- **Enhanced Privacy Controls**: Detailed privacy settings and data management

### 🔧 Improved
- **Content Blocking Engine**: More reliable YouTube Shorts detection and removal
- **Performance Optimization**: Reduced memory usage and faster loading times
- **Error Handling**: Better error messages and fallback mechanisms
- **User Interface**: Modern, dark-themed interface with improved accessibility
- **Message Formatting**: Enhanced AI response formatting with paragraphs and structure
- **Notification System**: Responsive notifications that scale with screen size

### 🐛 Fixed
- **Enter Key Issue**: Fixed Enter key closing chat interface unexpectedly
- **Message Replacement Bug**: User messages no longer get replaced by AI responses
- **Transcript Loading**: Improved transcript pre-loading for better AI analysis
- **Interface Positioning**: Better positioning of floating windows and menus
- **URL Change Handling**: Proper cleanup when navigating between videos
- **Memory Leaks**: Fixed potential memory leaks in content script

### 🔒 Security
- **API Key Encryption**: Secure storage of API keys using Chrome's encrypted sync storage
- **HTTPS Enforcement**: All external communications use encrypted connections
- **Minimal Permissions**: Reduced to only necessary permissions (Storage, YouTube access)
- **Local Processing**: Most functionality works entirely offline

### 📚 Documentation
- **Comprehensive README**: Updated with detailed setup and usage instructions
- **Privacy Policy**: Complete privacy policy meeting Chrome Web Store requirements
- **Chrome Web Store Listing**: Professional store description and metadata
- **User Guide**: Step-by-step setup and usage documentation

## [1.2.0] - 2024-11-XX

### 🆕 Added
- **Gaming Content Removal**: Basic gaming video filtering
- **Improved Shorts Detection**: Better YouTube Shorts identification

### 🔧 Improved
- **Performance**: Faster content blocking execution
- **Reliability**: More stable operation across YouTube updates

### 🐛 Fixed
- **False Positives**: Reduced incorrect content blocking
- **Loading Issues**: Fixed extension loading on some YouTube pages

## [1.1.0] - 2024-10-XX

### 🆕 Added
- **Toggle Control**: On/off switch in extension popup
- **Usage Statistics**: Basic time saved tracking

### 🔧 Improved
- **User Interface**: Cleaner popup design
- **Content Detection**: More accurate Shorts identification

### 🐛 Fixed
- **Page Refresh Issues**: Extension now works after page refreshes
- **Memory Usage**: Reduced memory consumption

## [1.0.0] - 2024-09-XX

### 🆕 Added
- **YouTube Shorts Blocker**: Core functionality to hide YouTube Shorts
- **Basic Content Filtering**: Remove distracting short-form content
- **Chrome Extension Framework**: Manifest V3 implementation
- **Simple UI**: Basic popup interface

### 🔧 Initial Features
- **Content Script**: Injection into YouTube pages
- **DOM Manipulation**: Hide Shorts containers and elements
- **Storage API**: Save user preferences locally
- **Background Script**: Handle extension lifecycle

---

## Upcoming Features (Roadmap)

### v2.1.0 (Planned)
- **Multi-Language AI Support**: AI responses in multiple languages
- **Video Bookmarking**: Save interesting videos with AI-generated tags
- **Advanced Statistics**: Detailed productivity analytics
- **Custom Filters**: User-defined content filtering rules

### v2.2.0 (Planned)
- **Batch Video Analysis**: Analyze multiple videos at once
- **Export Features**: Export AI conversations and insights
- **Integration APIs**: Connect with note-taking apps
- **Team Features**: Share insights with team members

### v3.0.0 (Future)
- **Multi-Platform Support**: Extend to other video platforms
- **Advanced AI Models**: Support for multiple AI providers
- **Collaborative Features**: Community-driven content curation
- **Enterprise Features**: Advanced controls for organizations

---

## Support

For questions about any version or to report issues:
- **Email**: hello@gelolabs.com
- **GitHub Issues**: [Report a Bug](https://github.com/gelo-labs/browser-copilot/issues)
- **Feature Requests**: [Request a Feature](https://github.com/gelo-labs/browser-copilot/discussions)

## Migration Guide

### Upgrading from v1.x to v2.0
1. **Backup Settings**: Your existing settings will be preserved
2. **API Key Setup**: Add your Google Gemini API key in Settings for AI features
3. **New Interface**: Familiarize yourself with the new YouTube header icon
4. **Privacy Review**: Review the updated Privacy Policy for AI features

### First-Time Installation
1. **Install Extension**: Add from Chrome Web Store or load unpacked
2. **Basic Setup**: Content blocking works immediately
3. **AI Setup**: Optional - add API key for AI features
4. **Explore Features**: Click the GeloLabs icon on any YouTube video

---

**GeloLabs Team**  
*Building the future of productive browsing* 