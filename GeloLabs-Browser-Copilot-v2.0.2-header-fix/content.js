// Platform-specific selectors and URLs
const PLATFORM_CONFIG = {
  youtube: {
    isMatch: (url) => url.includes('youtube.com'),
    isShorts: (url) => url.includes('/shorts'),
    selectors: {
      shorts: [
        'ytd-reel-shelf-renderer',
        'ytd-rich-shelf-renderer:has(a[href*="/shorts"])',
        '#shorts-container',
        'ytd-mini-guide-entry-renderer[aria-label="Shorts"]',
        'ytd-guide-entry-renderer[title="Shorts"]',
        '#endpoint[title="Shorts"]',
        'a[title="Shorts"]'
      ],
      feedNavigation: [
        '.ytd-reel-video-renderer',
        '.ytd-shorts',
        'ytd-reel-player-overlay-renderer',
        '#navigation-button-down',
        '#navigation-button-up',
        'ytd-shorts-player-controls'
      ]
    }
  }
};

// State management
let currentState = { blockingState: 'active' };
let observer = null;
let videoCache = new Map(); // Cache for video summaries
let currentVideoId = null;
let transcriptOpened = false; // Track if transcript is already opened

// Initialize and listen for state changes
chrome.storage.sync.get(['blockingState'], (result) => {
  // Default to 'active' if no state is stored yet
  currentState.blockingState = result.blockingState || 'active';
  applyBlockingRules();
});

// Load cached video data
chrome.storage.local.get(['videoCache'], (result) => {
  if (result.videoCache) {
    Object.entries(result.videoCache).forEach(([key, value]) => {
      videoCache.set(key, value);
    });
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.blockingState) {
    currentState.blockingState = changes.blockingState.newValue;
    applyBlockingRules();
  }
});

// Main blocking logic
function applyBlockingRules() {
  // If state is not active, remove styles and observer and return
  if (currentState.blockingState !== 'active') {
    removeBlockingStyles();
    disconnectObserver();
    // Unwrap Shorts container if needed
    centerShortsContainerJS(false);
    setTikTokScrollBlocked(false);
    return;
  }

  // If state IS active:
  const currentUrl = window.location.href;
  const platform = getPlatform(currentUrl);
  
  if (!platform) return; // Only proceed if on YouTube

  // Inject styles and set up observer unconditionally when active
  injectBlockingStyles(platform);
  setupMutationObserver(platform); 

  // JS-based centering for direct Shorts
  if (platform.isShorts(currentUrl)) {
    centerShortsContainerJS(true);
  } else {
    centerShortsContainerJS(false);
  }

  // Remove YouTube games from recommendations  
  removeYouTubeGamesPreview();
}

function getPlatform(url) {
  for (const [name, config] of Object.entries(PLATFORM_CONFIG)) {
    if (config.isMatch(url)) return { name, ...config };
  }
  return null;
}

function injectBlockingStyles(platform) {
  const styleId = 'gelotools-blocking-styles';
  let style = document.getElementById(styleId);
  
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }

  const currentUrl = window.location.href;
  const isDirectContent = platform.isShorts(currentUrl);

  let cssText = '';

  // Only apply narrowing/centering on direct Shorts/Reels/FYP pages
  if (isDirectContent) {
    cssText += `
      /* Aggressively make the whole window and overlay narrower and centered */
      body, #page-manager, ytd-app {
        max-width: 95vw !important;
        margin-left: auto !important;
        margin-right: auto !important;
        overflow-x: hidden !important;
      }
    `;
  }

  // Hide Shorts side/action buttons only on Shorts pages
  if (isDirectContent) {
    cssText += `
      #actions,
      #like-button,
      #dislike-button,
      #comments-button,
      #menu-button,
      #pivot-button,
      #navigation-button-down,
      #navigation-button-up,
      ytd-shorts-player-controls[button-location="navigation"] {
        display: none !important;
      }
    `;
  }

  cssText += `
    .gelotools-blocked-message {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      width: 95vw !important;
      max-width: 95vw !important;
      height: 100vh !important;
      position: fixed !important;
      left: 50% !important;
      top: 0 !important;
      transform: translateX(-50%) !important;
      background: #232426;
      z-index: 999999;
      text-align: center !important;
      padding-left: 8px !important;
      padding-right: 8px !important;
      box-sizing: border-box !important;
    }
  `;

  // Define YouTube specific selectors for different contexts
  const ytAlwaysHideSelectors = [
      'ytd-reel-shelf-renderer',                      // Main feed shelf
      'ytd-rich-shelf-renderer:has(a[href*="/shorts"])', // Another feed shelf type?
      'ytd-mini-guide-entry-renderer[aria-label="Shorts"]', // Mini sidebar
      'ytd-guide-entry-renderer[title="Shorts"]',         // Full sidebar
      '#endpoint[title="Shorts"]',                         // Another sidebar link variant?
      'a[title="Shorts"][href^="/shorts/"]'              // Specific Shorts links in feed/elsewhere?
  ];
  const ytGeneralHideSelectors = [
      '#shorts-container', // Hide the container itself on non-direct pages
      // Add any other selectors from original config if needed for general pages
  ];
  const ytDirectLinkNavSelectors = [
      '#navigation-button-down',
      '#navigation-button-up',
      'ytd-shorts-player-controls[button-location="navigation"]',
      '.ytp-prev-button',
      '.ytp-next-button',
      'ytd-reel-player-overlay-renderer #overlay'
  ];
  const ytDirectLinkShowSelectors = [
      'ytd-shorts', '#shorts-container', '#contents.ytd-shorts', 'ytd-shorts-inner-container',
      'ytd-reel-video-renderer', '#shorts-player', '#player-container',
      '#shorts-player > .html5-video-container > video',
      'ytd-reel-video-renderer[is-active] video',
      '#player-container video',
      'ytd-page-manager',
      'ytd-watch-flexy'
  ];
  const ytDirectLinkNoScrollCenterSelectors = [
      'ytd-shorts', '#shorts-container', '#contents.ytd-shorts', 'ytd-shorts-inner-container'
  ];


  // --- Apply rules based on platform and context ---

  // 1. Apply Always-Hide rules for YouTube
  if (ytAlwaysHideSelectors.length > 0) {
      cssText += `
          /* Always Hide These YT Elements */
          ${ytAlwaysHideSelectors.join(',\n          ')} {
              display: none !important;
          }
      `;
  }

  // 2. Handle non-direct pages
  if (!isDirectContent) {
      const selectorsToHide = ytGeneralHideSelectors;

      if (selectorsToHide.length > 0) {
          cssText += `
              /* Hide General Elements on Non-Direct Pages */
              ${selectorsToHide.join(',\n              ')} {
                  display: none !important;
              }
          `;
      }
  }

  // 3. Handle Direct YouTube Shorts Page
  if (isDirectContent) {
      // Hide Navigation
      if (ytDirectLinkNavSelectors.length > 0) {
          cssText += `
              /* YT Direct: Hide Nav */
              ${ytDirectLinkNavSelectors.join(',\n              ')} {
                  display: none !important;
                  pointer-events: none !important;
              }
          `;
      }
      // Show Player/Containers
      if (ytDirectLinkShowSelectors.length > 0) {
          cssText += `
              /* YT Direct: Show Player */
              ${ytDirectLinkShowSelectors.join(',\n              ')} {
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
              }
          `;
      }
      // Prevent Scroll & Center (revert to previously working method)
      if (ytDirectLinkNoScrollCenterSelectors.length > 0) {
          cssText += `
              /* YT Direct: No Scroll & Center (classic) */
              ${ytDirectLinkNoScrollCenterSelectors.join(',\n              ')} {
                  overflow-y: hidden !important;
                  scroll-snap-type: none !important;
                  margin-left: auto !important;
                  margin-right: auto !important;
                  display: block !important;
              }
          `;
      }
      // Remove all flex/grid centering rules from parent containers
      // Ensure page scroll
      cssText += `
          /* YT Direct: Allow Page Scroll */
          html, body {
              overflow: auto !important;
          }
      `;
  }

  // Apply the combined CSS
  style.textContent = cssText;
}

function removeBlockingStyles() {
  
  const style = document.getElementById('gelotools-blocking-styles');
  if (style) {
    style.remove();
  }
  
  // Force refresh the page elements to restore normal YouTube behavior
  const allBlockedSelectors = [
    'ytd-reel-shelf-renderer',
    'ytd-rich-shelf-renderer:has(a[href*="/shorts"])',
    'ytd-mini-guide-entry-renderer[aria-label="Shorts"]',
    'ytd-guide-entry-renderer[title="Shorts"]',
    '#endpoint[title="Shorts"]',
    'a[title="Shorts"][href^="/shorts/"]',
    '#shorts-container'
  ];
  
  allBlockedSelectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.style.display = '';
        el.style.visibility = '';
        el.style.opacity = '';
        el.style.pointerEvents = '';
        // Remove any inline styles that might be blocking
        if (el.style.cssText) {
          el.style.cssText = el.style.cssText.replace(/display\s*:\s*none\s*!important/gi, '');
        }
      });
    } catch (e) {
      // Ignore invalid selectors
    }
  });
  
  // Force a complete page refresh of YouTube's layout
  const ytdApp = document.querySelector('ytd-app');
  if (ytdApp) {
    ytdApp.style.display = 'none';
    ytdApp.offsetHeight; // Force reflow
    ytdApp.style.display = '';
  }
  
  // Also try refreshing the sidebar specifically
  const sidebar = document.querySelector('#guide-content, ytd-guide-renderer');
  if (sidebar) {
    sidebar.style.display = 'none';
    sidebar.offsetHeight; // Force reflow
    sidebar.style.display = '';
  }
}

function setupMutationObserver(platform) {
  disconnectObserver();

  observer = new MutationObserver(() => {
    if (currentState.blockingState === 'active') {
      injectBlockingStyles(platform);
      // Always remove YouTube games when blocking is active
      removeYouTubeGamesPreview();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function disconnectObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

// --- JS-based centering for Shorts ---
function centerShortsContainerJS(enable) {
    // Try both selectors for robustness
    const shorts = document.querySelector('#shorts-container') || document.querySelector('ytd-shorts');
    if (!shorts) return;

    const wrapperId = 'gelotools-shorts-center-wrapper';
    let wrapper = document.getElementById(wrapperId);

    if (enable) {
        if (wrapper) return; // Already wrapped
        wrapper = document.createElement('div');
        wrapper.id = wrapperId;
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'center';
        wrapper.style.width = '100%';
        wrapper.style.boxSizing = 'border-box';
        // Insert wrapper before shorts and move shorts inside
        shorts.parentNode.insertBefore(wrapper, shorts);
        wrapper.appendChild(shorts);
    } else {
        // Unwrap if needed
        if (wrapper && wrapper.contains(shorts)) {
            wrapper.parentNode.insertBefore(shorts, wrapper);
            wrapper.remove();
            shorts.style.maxWidth = '';
            shorts.style.width = '';
        }
    }
}



// Remove YouTube games from recommendations and feed
function removeYouTubeGamesPreview() {
  // Enhanced selectors for YouTube gaming content
  const gameSelectors = [
    // Gaming shelf/section
    'ytd-rich-section-renderer',
    // Gaming videos in recommendations
    'ytd-compact-video-renderer[href*="/gaming"]',
    'ytd-video-meta-block[href*="/gaming"]',
    // Gaming shelf containers
    'ytd-shelf-renderer:has([href*="/gaming"])',
    // Gaming cards and previews
    'ytd-game-details-renderer',
    'ytd-gaming-video-renderer',
    // Live gaming streams
    'ytd-video-renderer:has([aria-label*="Live"])',
    // Gaming trending shelf
    'ytd-expanded-shelf-contents-renderer:has([href*="/gaming"])'
  ];

  // Remove by content (language-agnostic)
  const sections = document.querySelectorAll('ytd-rich-section-renderer, ytd-shelf-renderer');
  sections.forEach(section => {
    const text = section.textContent?.toLowerCase() || '';
    // Remove gaming sections (supports multiple languages)
    if (text.includes('игротека') || text.includes('gaming') || text.includes('games') || 
        text.includes('play') && text.includes('free') || text.includes('live gaming')) {
      section.remove();
    }
  });

  // Remove by selectors
  gameSelectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    } catch (e) {
      // Ignore invalid selectors
    }
  });

  // Remove gaming videos from recommendations feed
  const videoRenderers = document.querySelectorAll('ytd-video-renderer, ytd-compact-video-renderer');
  videoRenderers.forEach(video => {
    const titleElement = video.querySelector('#video-title, .ytd-video-meta-block');
    const channelElement = video.querySelector('#channel-name, .ytd-channel-name');
    
    if (titleElement || channelElement) {
      const title = titleElement?.textContent?.toLowerCase() || '';
      const channel = channelElement?.textContent?.toLowerCase() || '';
      
      // Check for gaming keywords
      const gamingKeywords = ['game', 'gaming', 'gameplay', 'playthrough', 'let\'s play', 'walkthrough', 'review game'];
      
      if (gamingKeywords.some(keyword => title.includes(keyword) || channel.includes(keyword))) {
        video.remove();
      }
    }
  });
}

// Initial setup

applyBlockingRules();

// Wait a bit for YouTube to load, then inject icon
setTimeout(() => {
  
  injectYouTubeHeaderIcon();
}, 2000);

// Handle URL changes (for single-page apps)
let lastUrl = window.location.href;
new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    applyBlockingRules();
    
    // Reset transcript flag when navigating to new video
    if (currentUrl.includes('/watch?v=')) {
      transcriptOpened = false;
    }
    
    // Close GeloLabs main interface when navigating to another video
    const mainInterface = document.getElementById('gelolabs-main-interface');
    if (mainInterface) {
      mainInterface.style.display = 'none';
    }
    
    // Re-inject icon if needed
    setTimeout(() => {
      
      injectYouTubeHeaderIcon();
    }, 2000);
  }
}).observe(document, { subtree: true, childList: true });

// Inject GeloLabs icon into YouTube header
function injectYouTubeHeaderIcon() {
  // Check if we're on YouTube and if icon already exists
  if (!window.location.href.includes('youtube.com')) return;
  if (document.getElementById('gelolabs-yt-icon')) return;

  // Wait for YouTube header to load - target the notification button's parent
  let targetContainer = document.querySelector('ytd-masthead #end');
  
  // Fallback selectors
  if (!targetContainer) {
    targetContainer = document.querySelector('#masthead #end');
  }
  if (!targetContainer) {
    targetContainer = document.querySelector('ytd-notification-topbar-button-renderer')?.parentElement;
  }
  if (!targetContainer) {
    targetContainer = document.querySelector('[aria-label*="Уведомления"]')?.parentElement;
  }
  
  if (!targetContainer) {
    
    setTimeout(() => injectYouTubeHeaderIcon(), 2000);
    return;
  }
  
  

  // Create a simple div that looks like YouTube's buttons
  const iconContainer = document.createElement('div');
  iconContainer.id = 'gelolabs-yt-icon';
  iconContainer.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: absolute;
    right: 260px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1000;
    margin: 0;
  `;
  
  

  // Create the icon (adaptive to theme)
  const icon = document.createElement('img');
  
  // Detect YouTube theme more reliably
  const isDarkMode = document.documentElement.hasAttribute('dark') || 
                    document.documentElement.getAttribute('data-cast-api-enabled') === 'true' ||
                    document.querySelector('html[dark]') !== null ||
                    getComputedStyle(document.documentElement).getPropertyValue('--yt-spec-base-background').includes('24, 24, 24');
  
  // Use appropriate icon based on theme
  icon.src = chrome.runtime.getURL(isDarkMode ? 'icons/logo2.png' : 'icons/logo1.png');
  icon.style.cssText = `
    width: 32px;
    height: 32px;
    object-fit: contain;
    transition: transform 0.6s ease-in-out;
  `;
  icon.alt = 'GeloLabs AI Assistant';
  
  
  
  iconContainer.appendChild(icon);
  
  

  // Add hover effects with 360° spin
  iconContainer.addEventListener('mouseenter', () => {
    iconContainer.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    iconContainer.style.borderRadius = '50%';
    icon.style.transform = 'rotate(360deg)';
  });

  iconContainer.addEventListener('mouseleave', () => {
    iconContainer.style.backgroundColor = 'transparent';
    icon.style.transform = 'rotate(0deg)';
  });

  // Add click handler to open LLM interface
  iconContainer.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openLLMInterface();
  });

  // Add tooltip
  iconContainer.title = 'GeloLabs: Ask about this video';

  // Use absolute positioning, append to masthead container
  const masthead = document.querySelector('ytd-masthead') || document.querySelector('#masthead');
  if (masthead) {
    
    masthead.appendChild(iconContainer);
  } else {
    
    targetContainer.appendChild(iconContainer);
  }
  
  
}

// Open main interface menu
function openLLMInterface() {
  // Check if interface is already open
  const existingInterface = document.getElementById('gelolabs-main-interface');
  if (existingInterface) {
    existingInterface.style.display = existingInterface.style.display === 'none' ? 'block' : 'none';
    return;
  }

  createMainInterface();
}

// Create the main interface menu
function createMainInterface() {
  // Get the button position for proper positioning
  const iconButton = document.getElementById('gelolabs-yt-icon');
  const buttonRect = iconButton ? iconButton.getBoundingClientRect() : { top: 60, right: 20 };
  
  const interface_div = document.createElement('div');
  interface_div.id = 'gelolabs-main-interface';
  interface_div.style.cssText = `
    position: fixed;
    top: ${buttonRect.top + 50}px;
    right: 20px;
    background: #1f1f23;
    border: 1px solid #333338;
    border-radius: 12px;
    width: 420px;
    max-height: 600px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    color: #e1e1e6;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    z-index: 10000;
    display: block;
  `;

  interface_div.innerHTML = `
    <div style="padding: 16px; border-bottom: 1px solid #333338; background: #1f1f23;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <h3 style="margin: 0; color: #fff; font-weight: 600; font-size: 16px;">GeloLabs: Browser Copilot</h3>
        <button id="close-menu" style="background: none; border: none; color: #999; font-size: 18px; cursor: pointer; padding: 4px; transition: color 0.2s;">×</button>
      </div>
              <p style="margin: 0; color: #888; font-size: 12px; font-weight: 400;">Open Beta - Report issues to hello@gelolabs.com</p>
    </div>
    
    <div style="padding: 16px; background: #1a1a1e;">
      <!-- Shorts Blocker Control -->
      <div class="menu-section" style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="color: #e1e1e6; font-weight: 600; font-size: 14px;">🚫 Shorts Blocker</span>
          <button id="toggle-blocker" style="padding: 6px 12px; background: #4a9eff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
            Loading...
          </button>
        </div>
        <p style="margin: 0; color: #888; font-size: 12px;">Block YouTube Shorts and gaming content</p>
      </div>
      
      <!-- AI Assistant Section -->
      <div class="menu-section" style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="color: #e1e1e6; font-weight: 600; font-size: 14px;">🤖 AI Video Assistant</span>
          <button id="open-ai-chat" style="padding: 6px 12px; background: #2a2a2e; border: 1px solid #333338; color: #bbb; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;">
            Ask AI
          </button>
        </div>
        <p style="margin: 0; color: #888; font-size: 12px;">Analyze video content with AI</p>
      </div>
      
      <!-- Settings Section -->
      <div class="menu-section" style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="color: #e1e1e6; font-weight: 600; font-size: 14px;">⚙️ Settings</span>
          <button id="open-settings" style="padding: 6px 12px; background: #2a2a2e; border: 1px solid #333338; color: #bbb; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;">
            Configure
          </button>
        </div>
        <p style="margin: 0; color: #888; font-size: 12px;">API keys, preferences, and more</p>
      </div>
      
      <!-- Rate App Section -->
      <div class="menu-section" style="border-top: 1px solid #333338; padding-top: 16px;">
        <div style="text-align: center;">
          <p style="margin: 0 0 8px 0; color: #888; font-size: 12px;">Enjoying GeloLabs? Help others discover it!</p>
          <button id="rate-app" style="padding: 8px 16px; background: #4a9eff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; transition: background 0.2s;">
            ⭐ Rate Extension
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(interface_div);

  // Initialize blocker toggle state
  initializeBlockerToggle();

  // Add event listeners
  document.getElementById('close-menu').addEventListener('click', () => {
    interface_div.style.display = 'none';
  });
  
  // Add hover effect to close button
  const closeBtn = document.getElementById('close-menu');
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.color = '#fff';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.color = '#999';
  });

  // Blocker toggle
  document.getElementById('toggle-blocker').addEventListener('click', toggleBlocker);

  // AI Chat button
  document.getElementById('open-ai-chat').addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.location.href.includes('/watch?v=')) {
      showNotification('Please navigate to a YouTube video to use AI features.');
      return;
    }
    
    interface_div.style.display = 'none';
    
    // Show loading notification
    showNotification('Opening AI Assistant...');
    
    // Ensure current video ID is set
    const videoId = getCurrentVideoId();
    if (videoId && !currentVideoId) {
      currentVideoId = videoId;
    }
    
    // Pre-open transcript before creating chat interface
    await preOpenTranscript();
    
    // Small delay to ensure interface is hidden before creating new one
    setTimeout(() => {
      createAIChatInterface();
    }, 50);
  });

  // Settings button
  document.getElementById('open-settings').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    interface_div.style.display = 'none';
    
    // Small delay to ensure interface is hidden before creating new one
    setTimeout(() => {
      createSettingsInterface();
    }, 50);
  });

  // Rate app button
  document.getElementById('rate-app').addEventListener('click', () => {
    interface_div.style.display = 'none';
    window.open('https://chrome.google.com/webstore/detail/gelolabs-browser-assistant/YOUR_EXTENSION_ID', '_blank');
  });

  // Add hover effects to buttons
  ['open-ai-chat', 'open-settings'].forEach(id => {
    const btn = document.getElementById(id);
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#333338';
      btn.style.color = '#fff';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#2a2a2e';
      btn.style.color = '#bbb';
    });
  });

  // Rate app button hover effect
  const rateBtn = document.getElementById('rate-app');
  rateBtn.addEventListener('mouseenter', () => {
    rateBtn.style.background = '#357abd';
  });
  rateBtn.addEventListener('mouseleave', () => {
    rateBtn.style.background = '#4a9eff';
  });

  // Click outside to close
  document.addEventListener('click', function closeOnClickOutside(e) {
    if (!interface_div.contains(e.target) && e.target.id !== 'gelolabs-yt-icon') {
      interface_div.style.display = 'none';
      document.removeEventListener('click', closeOnClickOutside);
    }
  });
}

// Get current video ID
function getCurrentVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// Cache video chat
function cacheVideoChat(videoId) {
  const messagesContainer = document.getElementById('llm-messages');
  if (messagesContainer) {
    const messages = Array.from(messagesContainer.children).map(msg => ({
      html: msg.innerHTML,
      className: msg.className
    }));
    videoCache.set(videoId, messages);
    
    // Store in chrome storage for persistence
    const cacheObj = {};
    videoCache.forEach((value, key) => {
      cacheObj[key] = value;
    });
    chrome.storage.local.set({ videoCache: cacheObj });
  }
}

// Load cached chat for video
function loadCachedChat(videoId) {
  const messagesContainer = document.getElementById('llm-messages');
  if (messagesContainer && videoCache.has(videoId)) {
    messagesContainer.innerHTML = '';
    const cachedMessages = videoCache.get(videoId);
    cachedMessages.forEach(msgData => {
      const msgDiv = document.createElement('div');
      msgDiv.innerHTML = msgData.html;
      msgDiv.className = msgData.className;
      messagesContainer.appendChild(msgDiv);
    });
    
    // Scroll to bottom
    document.getElementById('llm-chat-container').scrollTop = document.getElementById('llm-chat-container').scrollHeight;
  }
}

// Create settings interface
function createSettingsInterface() {
  // Check if interface is already open
  const existingInterface = document.getElementById('gelolabs-settings');
  if (existingInterface) {
    existingInterface.style.display = 'block';
    return;
  }

  // Get the button position for proper positioning
  const iconButton = document.getElementById('gelolabs-yt-icon');
  const buttonRect = iconButton ? iconButton.getBoundingClientRect() : { top: 60, right: 20 };
  
  const interface_div = document.createElement('div');
  interface_div.id = 'gelolabs-settings';
  interface_div.style.cssText = `
    position: fixed;
    top: ${buttonRect.top + 50}px;
    right: 20px;
    background: #1f1f23;
    border: 1px solid #333338;
    border-radius: 12px;
    width: 420px;
    max-height: 500px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    color: #e1e1e6;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    z-index: 10000;
    display: block;
  `;

  interface_div.innerHTML = `
    <div style="padding: 16px; border-bottom: 1px solid #333338; background: #1f1f23;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <h3 style="margin: 0; color: #fff; font-weight: 600; font-size: 16px;">Settings</h3>
        <button id="close-settings" style="background: none; border: none; color: #999; font-size: 18px; cursor: pointer; padding: 4px; transition: color 0.2s;">×</button>
      </div>
      <p style="margin: 0; color: #888; font-size: 12px; font-weight: 400;">Configure your preferences</p>
    </div>
    
    <div style="padding: 16px; background: #1a1a1e;">
      <!-- API Key Section -->
      <div class="settings-section" style="margin-bottom: 20px;">
        <label style="display: block; color: #e1e1e6; font-weight: 600; font-size: 14px; margin-bottom: 8px;">
          🔑 Google Gemini API Key
        </label>
        <input id="api-key-input" type="password" placeholder="Enter your API key..." 
               style="width: 100%; padding: 10px 12px; background: #2a2a2e; border: 1px solid #333338; border-radius: 6px; color: #e1e1e6; outline: none; font-size: 14px; box-sizing: border-box;">
        <p style="margin: 8px 0 0 0; color: #888; font-size: 12px;">
          Get your free API key at <a href="https://makersuite.google.com/app/apikey" target="_blank" style="color: #4a9eff;">makersuite.google.com</a>
        </p>
        <button id="save-api-key" style="margin-top: 8px; padding: 6px 12px; background: #4a9eff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
          Save API Key
        </button>
      </div>
      
      <!-- Cache Management -->
      <div class="settings-section" style="margin-bottom: 20px;">
        <label style="display: block; color: #e1e1e6; font-weight: 600; font-size: 14px; margin-bottom: 8px;">
          🗄️ Cache Management
        </label>
        <p style="margin: 0 0 8px 0; color: #888; font-size: 12px;">Clear cached video summaries and conversations</p>
        <button id="clear-cache" style="padding: 6px 12px; background: #ff4757; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
          Clear Cache
        </button>
      </div>
      
      <!-- About Section -->
      <div class="settings-section">
        <label style="display: block; color: #e1e1e6; font-weight: 600; font-size: 14px; margin-bottom: 8px;">
          ℹ️ About
        </label>
        <p style="margin: 0; color: #888; font-size: 12px; line-height: 1.4;">
                     GeloLabs: Browser Copilot v2.0 (Open Beta)<br>
           Blocks YouTube Shorts and provides AI-powered video analysis.<br>
          <a href="https://github.com/gelo-labs" target="_blank" style="color: #4a9eff;">Visit our GitHub</a>
        </p>
      </div>
    </div>
  `;

  document.body.appendChild(interface_div);

  // Load current API key
  chrome.storage.sync.get(['geminiApiKey'], (result) => {
    if (result.geminiApiKey) {
      document.getElementById('api-key-input').value = result.geminiApiKey;
    }
  });

  // Add event listeners
  document.getElementById('close-settings').addEventListener('click', () => {
    interface_div.style.display = 'none';
  });

  document.getElementById('save-api-key').addEventListener('click', () => {
    const apiKey = document.getElementById('api-key-input').value.trim();
    if (apiKey) {
      chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
        showNotification('API key saved successfully!');
      });
    } else {
      showNotification('Please enter a valid API key');
    }
  });

  document.getElementById('clear-cache').addEventListener('click', () => {
    videoCache.clear();
    chrome.storage.local.remove('videoCache');
    showNotification('Cache cleared successfully!');
  });

  // Click outside to close
  document.addEventListener('click', function closeSettingsOnClickOutside(e) {
    if (!interface_div.contains(e.target) && e.target.id !== 'gelolabs-yt-icon') {
      interface_div.style.display = 'none';
      document.removeEventListener('click', closeSettingsOnClickOutside);
    }
  });
}

// Initialize blocker toggle state
function initializeBlockerToggle() {
  chrome.storage.sync.get(['blockingState'], (result) => {
    const isActive = result.blockingState === 'active';
    const toggleBtn = document.getElementById('toggle-blocker');
    if (toggleBtn) {
      toggleBtn.textContent = isActive ? 'Disable' : 'Enable';
      toggleBtn.style.background = isActive ? '#ff4757' : '#4a9eff';
    }
  });
}

// Toggle blocker function
function toggleBlocker() {
  chrome.storage.sync.get(['blockingState'], (result) => {
    const currentState = result.blockingState || 'active';
    const newState = currentState === 'active' ? 'inactive' : 'active';
    
    chrome.storage.sync.set({ blockingState: newState }, () => {
      const toggleBtn = document.getElementById('toggle-blocker');
      if (toggleBtn) {
        toggleBtn.textContent = newState === 'active' ? 'Disable' : 'Enable';
        toggleBtn.style.background = newState === 'active' ? '#ff4757' : '#4a9eff';
      }
      
      // If disabling, force a page reload to ensure Shorts return
      if (newState === 'inactive') {
        showNotification('Shorts blocker disabled - refreshing page...');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        showNotification(`Shorts blocker ${newState === 'active' ? 'enabled' : 'disabled'}`);
      }
    });
  });
}



// Pre-open transcript for better subtitle extraction
async function preOpenTranscript() {
  if (transcriptOpened) return; // Already opened
  
  const transcriptSelectors = [
    '[aria-label*="transcript"]',
    '[aria-label*="Show transcript"]',
    '[aria-label*="Transcript"]',
    'button[aria-label*="transcript"]',
    '.ytd-video-description-transcript-section-renderer button',
    '#expand-transcript-button',
    '[data-target-id="engagement-panel-transcript"]'
  ];

  let transcriptButton = null;
  for (const selector of transcriptSelectors) {
    transcriptButton = document.querySelector(selector);
    if (transcriptButton) break;
  }

  if (transcriptButton) {
    
    transcriptButton.click();
    transcriptOpened = true;
    
    // Wait a bit for transcript to load
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Create AI Chat Interface (the original chat interface)
function createAIChatInterface() {
  // Get current video ID and check if we need to reset chat
  const videoId = getCurrentVideoId();
  const shouldResetChat = videoId !== currentVideoId;
  
  if (shouldResetChat) {
    // Cache previous video's chat if it exists
    if (currentVideoId && document.getElementById('gelolabs-ai-chat')) {
      cacheVideoChat(currentVideoId);
    }
    currentVideoId = videoId;
    transcriptOpened = false; // Reset transcript flag for new video
  }

  // Remove existing interface if it exists
  const existingInterface = document.getElementById('gelolabs-ai-chat');
  if (existingInterface) {
    if (shouldResetChat) {
      existingInterface.remove();
    } else {
      existingInterface.style.display = 'block';
      return;
    }
  }

  // Get the button position for proper positioning
  const iconButton = document.getElementById('gelolabs-yt-icon');
  const buttonRect = iconButton ? iconButton.getBoundingClientRect() : { top: 60, right: 20 };
  
  const interface_div = document.createElement('div');
  interface_div.id = 'gelolabs-ai-chat';
  interface_div.style.cssText = `
    position: fixed;
    top: ${buttonRect.top + 50}px;
    right: 20px;
    background: #1f1f23;
    border: 1px solid #333338;
    border-radius: 12px;
    width: 420px;
    max-height: 600px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    color: #e1e1e6;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    z-index: 10000;
    display: block;
  `;

  interface_div.innerHTML = `
    <div style="padding: 16px; border-bottom: 1px solid #333338; background: #1f1f23;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <h3 style="margin: 0; color: #fff; font-weight: 600; font-size: 16px;">Ask about this video</h3>
        <button id="close-ai-chat" style="background: none; border: none; color: #999; font-size: 18px; cursor: pointer; padding: 4px; transition: color 0.2s;">×</button>
      </div>
      <p style="margin: 0; color: #888; font-size: 12px; font-weight: 400;">Powered by Google Gemini AI</p>
    </div>
    
    <div id="llm-chat-container" style="height: 320px; overflow-y: auto; padding: 16px; background: #1a1a1e;">
      <div id="llm-messages">
        <div style="padding: 12px; background: #2a2a2e; border-radius: 8px; margin-bottom: 12px; line-height: 1.4;">
          <div style="display: flex; align-items: center; margin-bottom: 6px;">
            <span style="color: #4a9eff; font-weight: 600; font-size: 14px;">🤖 AI Assistant</span>
          </div>
          <div style="color: #e1e1e6; font-size: 14px; font-weight: 400;">
            Hi! I can help you understand this video. Ask me anything about its content, get a summary, or ask specific questions!
          </div>
        </div>
      </div>
    </div>
    
    <div style="padding: 16px; border-top: 1px solid #333338; background: #1f1f23;">
      <form id="llm-form" style="display: flex; gap: 8px; margin-bottom: 12px;">
        <input id="llm-input" type="text" placeholder="Ask about the video..." 
               style="flex: 1; padding: 10px 12px; background: #2a2a2e; border: 1px solid #333338; border-radius: 6px; color: #e1e1e6; outline: none; font-size: 14px; font-weight: 400;">
        <button id="llm-send" type="button" style="padding: 10px 16px; background: #4a9eff; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px; transition: background 0.2s;">
          Send
        </button>
      </form>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="quick-question" data-question="Summarize this video" style="padding: 6px 10px; background: #2a2a2e; border: 1px solid #333338; color: #bbb; border-radius: 12px; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s;">
          📝 Summarize
        </button>
        <button class="quick-question" data-question="What are the main points?" style="padding: 6px 10px; background: #2a2a2e; border: 1px solid #333338; color: #bbb; border-radius: 12px; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s;">
          🎯 Main Points
        </button>
        <button class="quick-question" data-question="Any actionable advice?" style="padding: 6px 10px; background: #2a2a2e; border: 1px solid #333338; color: #bbb; border-radius: 12px; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s;">
          ⚡ Action Items
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(interface_div);

  // Load cached chat if available
  if (currentVideoId && videoCache.has(currentVideoId)) {
    loadCachedChat(currentVideoId);
  }

  // Add event listeners for AI chat
  document.getElementById('close-ai-chat').addEventListener('click', () => {
    interface_div.style.display = 'none';
  });
  
  // Add hover effect to close button
  const closeBtn = document.getElementById('close-ai-chat');
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.color = '#fff';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.color = '#999';
  });

  const sendButton = document.getElementById('llm-send');
  sendButton.addEventListener('click', handleLLMQuery);
  
  // Handle form submission (Enter key)
  document.getElementById('llm-form').addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    handleLLMQuery();
    return false;
  });
  
  // Add hover effect to send button
  sendButton.addEventListener('mouseenter', () => {
    sendButton.style.background = '#357abd';
  });
  
  sendButton.addEventListener('mouseleave', () => {
    sendButton.style.background = '#4a9eff';
  });
  


  // Quick question buttons
  document.querySelectorAll('.quick-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const question = btn.dataset.question;
      document.getElementById('llm-input').value = question;
      handleLLMQuery();
    });
    
    // Add hover effects
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#333338';
      btn.style.color = '#fff';
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#2a2a2e';
      btn.style.color = '#bbb';
    });
  });

  // Click outside to close (but not on Enter key events)
  document.addEventListener('click', function closeAIChatOnClickOutside(e) {
    // Don't close if clicking inside the interface or on the icon
    if (!interface_div.contains(e.target) && e.target.id !== 'gelolabs-yt-icon') {
      interface_div.style.display = 'none';
      document.removeEventListener('click', closeAIChatOnClickOutside);
    }
  });
  
  // Prevent any form submission that might be triggered by Enter
  interface_div.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  });
}

// Handle LLM query
async function handleLLMQuery() {
  const input = document.getElementById('llm-input');
  const question = input.value.trim();
  
  if (!question) return;

  // Clear input immediately
  input.value = '';
  
  // Add user message to chat first
  const userMessageId = addMessageToChat('user', question);
  
  
  // Small delay to ensure user message is rendered
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Add loading message
  const loadingId = addMessageToChat('assistant', 'Analyzing video content...');
  
  
  try {
    // Get video subtitles
    const subtitles = await extractVideoSubtitles();
    
    if (!subtitles) {
      updateMessage(loadingId, '❌ Could not extract video subtitles. This video might not have captions available.');
      return;
    }

    // Process with LLM
    const response = await queryLLM(question, subtitles);
    
    updateMessage(loadingId, response);
    
  } catch (error) {
    
    updateMessage(loadingId, '❌ Sorry, there was an error processing your request. Please try again.');
  }
}

// Add message to chat
function addMessageToChat(sender, message) {
  const messagesContainer = document.getElementById('llm-messages');
  const messageDiv = document.createElement('div');
  const messageId = 'msg-' + Date.now();
  messageDiv.id = messageId;
  
  const senderIcon = sender === 'user' ? '👤' : '🤖';
  const senderName = sender === 'user' ? 'You' : 'AI Assistant';
  
  messageDiv.style.cssText = `
    padding: 12px;
    background: ${sender === 'user' ? '#4a9eff' : '#2a2a2e'};
    border-radius: 8px;
    margin-bottom: 12px;
    word-wrap: break-word;
    line-height: 1.4;
    color: ${sender === 'user' ? '#ffffff' : '#e1e1e6'};
  `;
  
  // Format message with proper structure
  const formattedMessage = formatMessage(message);
  
  messageDiv.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 6px;">
      <span style="color: ${sender === 'user' ? '#ffffff' : '#4a9eff'}; font-weight: 600; font-size: 14px;">${senderIcon} ${senderName}</span>
    </div>
    <div style="font-size: 14px; font-weight: 400;">
      ${formattedMessage}
    </div>
  `;
  
  messagesContainer.appendChild(messageDiv);
  
  // Scroll to bottom
  document.getElementById('llm-chat-container').scrollTop = document.getElementById('llm-chat-container').scrollHeight;
  
  return messageId;
}

// Format message with better structure
function formatMessage(message) {
  // Convert markdown-like formatting to HTML with better paragraph structure
  let formatted = message
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
    .replace(/^#{1,3}\s(.+)$/gm, '<strong style="display: block; margin: 8px 0 4px 0; font-size: 16px;">$1</strong>') // Headers
    .replace(/^\d+\.\s/gm, '<br>$&')                   // Numbered lists
    .replace(/^[\-\*]\s/gm, '<br>• ')                  // Bullet points
    .trim();
  
  // Split by double line breaks to create paragraphs
  const paragraphs = formatted.split(/\n\n+/);
  
  if (paragraphs.length > 1) {
    // Multiple paragraphs
    return paragraphs
      .map(p => p.replace(/\n/g, '<br>'))  // Single line breaks within paragraphs
      .map(p => `<p style="margin: 0 0 12px 0; line-height: 1.4;">${p}</p>`)
      .join('')
      .replace(/<\/p>$/, '</p>'); // Remove trailing margin from last paragraph
  } else {
    // Single paragraph
    return `<div style="line-height: 1.4;">${formatted.replace(/\n/g, '<br>')}</div>`;
  }
}

// Update existing message
function updateMessage(messageId, newText) {
  const messageDiv = document.getElementById(messageId);
  if (messageDiv) {
    const formattedMessage = formatMessage(newText);
    // Only update the message content, not the header
    const contentDiv = messageDiv.querySelector('div:last-child');
    if (contentDiv) {
      contentDiv.innerHTML = formattedMessage;
    } else {
      // Fallback: rebuild the entire message as AI Assistant
      messageDiv.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 6px;">
          <span style="color: #4a9eff; font-weight: 600; font-size: 14px;">🤖 AI Assistant</span>
        </div>
        <div style="font-size: 14px; font-weight: 400;">
          ${formattedMessage}
        </div>
      `;
    }
  }
}

// Test function to check subtitle coverage
async function testSubtitleExtraction() {

  
  // Add a message to chat showing the test
  const testMessageId = addMessageToChat('assistant', 'Testing subtitle extraction...');
  
  const subtitles = await extractVideoSubtitles();
  
  if (subtitles) {
    const wordCount = subtitles.split(' ').length;
    const charCount = subtitles.length;
    const estimatedMinutes = Math.round(wordCount / 150); // Average reading speed
    
    // Update the chat message with detailed results
    const testResults = `**📊 Subtitle Extraction Test Results:**

**Content Statistics:**
- **Characters:** ${charCount.toLocaleString()}
- **Words:** ${wordCount.toLocaleString()}
- **Estimated Duration:** ~${estimatedMinutes} minutes of content

**Sample Content:**
**First 200 characters:**
"${subtitles.substring(0, 200)}..."

**Last 200 characters:**
"...${subtitles.substring(subtitles.length - 200)}"

**Analysis:** ${wordCount > 500 ? '✅ Good coverage - AI should have sufficient context for detailed analysis.' : '⚠️ Limited content - AI responses may be less detailed.'}`;

    updateMessage(testMessageId, testResults);
    
    // Show notification with results
    showNotification(`Extracted ${wordCount.toLocaleString()} words (~${estimatedMinutes} min of content)`);
    return subtitles;
  } else {

    updateMessage(testMessageId, '❌ **No subtitles found for this video**\n\nThis could mean:\n- Video has no captions/subtitles\n- Captions are auto-generated and not accessible\n- Video is too new and captions haven\'t been processed\n- Technical issue with subtitle extraction\n\n**Recommendation:** Try videos with manual captions for best results.');
    showNotification('No subtitles found for this video');
    return null;
  }
}

// Extract video subtitles
async function extractVideoSubtitles() {
  try {
    // Method 1: Check for active captions in video player
    const captionTracks = document.querySelectorAll('.ytp-caption-segment');
    if (captionTracks.length > 0) {
      return Array.from(captionTracks).map(track => track.textContent).join(' ');
    }

    // Method 2: Check if transcript is already open (should be pre-opened)
    const segmentSelectors = [
      'ytd-transcript-segment-renderer',
      '.ytd-transcript-segment-renderer',
      '[data-segment-id]',
      '.segment-text',
      '.transcript-segment'
    ];

    for (const selector of segmentSelectors) {
      const segments = document.querySelectorAll(selector);
      if (segments.length > 0) {
        const transcriptText = Array.from(segments)
          .map(segment => {
            // Remove timestamps and clean text
            let text = segment.textContent || '';
            text = text.replace(/^\d+:\d+(?::\d+)?\s*/, ''); // Remove timestamps
            text = text.replace(/\s+/g, ' '); // Normalize whitespace
            return text.trim();
          })
          .filter(text => text.length > 0)
          .join(' ');
          
        if (transcriptText.length > 50) { // Only return if we got substantial content
          return transcriptText;
        }
      }
    }

    // Method 3: If transcript not found, try to open it (fallback)
    if (!transcriptOpened) {
      const videoId = new URLSearchParams(window.location.search).get('v');
      if (!videoId) return null;

      const transcriptSelectors = [
        '[aria-label*="transcript"]',
        '[aria-label*="Show transcript"]',
        '[aria-label*="Transcript"]',
        'button[aria-label*="transcript"]',
        '.ytd-video-description-transcript-section-renderer button',
        '#expand-transcript-button',
        '[data-target-id="engagement-panel-transcript"]'
      ];

      let transcriptButton = null;
      for (const selector of transcriptSelectors) {
        transcriptButton = document.querySelector(selector);
        if (transcriptButton) break;
      }

      if (transcriptButton) {

        transcriptButton.click();
        transcriptOpened = true;
        
        // Wait for transcript panel to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try again to get segments
        for (const selector of segmentSelectors) {
          const segments = document.querySelectorAll(selector);
          if (segments.length > 0) {
            const transcriptText = Array.from(segments)
              .map(segment => {
                let text = segment.textContent || '';
                text = text.replace(/^\d+:\d+(?::\d+)?\s*/, '');
                text = text.replace(/\s+/g, ' ');
                return text.trim();
              })
              .filter(text => text.length > 0)
              .join(' ');
              
            if (transcriptText.length > 50) {
              return transcriptText;
            }
          }
        }
      }
    }

    // Method 3: Try to extract from description if it contains transcript
    const description = document.querySelector('#description-text, .content.style-scope.ytd-video-secondary-info-renderer');
    if (description) {
      const descText = description.textContent || '';
      // Check if description contains what looks like a transcript
      if (descText.includes('transcript') || descText.includes('Transcript') || 
          (descText.match(/\d+:\d+/g) && descText.length > 500)) {
        return descText.substring(0, 8000); // Limit length
      }
    }

    // Method 4: Check for auto-generated captions in player
    const captionDisplayArea = document.querySelector('.ytp-caption-window-container');
    if (captionDisplayArea) {
      const captionText = captionDisplayArea.textContent;
      if (captionText && captionText.trim().length > 20) {
        return captionText.trim();
      }
    }

    return null;
  } catch (error) {

    return null;
  }
}

// Get conversation history for context
function getConversationHistory() {
  const messagesContainer = document.getElementById('llm-messages');
  if (!messagesContainer) return '';
  
  const messages = Array.from(messagesContainer.children);
  const history = [];
  
  messages.forEach(msg => {
    const text = msg.textContent || '';
    if (text.includes('AI Assistant:')) {
      const content = text.replace('🤖 AI Assistant:', '').trim();
      if (content && !content.includes('Hi! I can help you') && !content.includes('Analyzing video content')) {
        history.push(`Assistant: ${content}`);
      }
    } else if (text.includes('You:')) {
      const content = text.replace('👤 You:', '').trim();
      if (content) {
        history.push(`User: ${content}`);
      }
    }
  });
  
  // Return last 4 exchanges to keep context manageable
  return history.slice(-8).join('\n');
}

// Query LLM (using Google Gemini API)
async function queryLLM(question, subtitles) {
  // Get API key from storage, fallback to hardcoded key for testing
  const result = await chrome.storage.sync.get(['geminiApiKey']);
  const apiKey = result.geminiApiKey;
  
  if (!apiKey) {
    return `❌ Please set up your Google Gemini API key first. Go to the extension settings to add your API key. You can get a free API key at: https://makersuite.google.com/app/apikey`;
  }

  // Get conversation history for context
  const conversationHistory = getConversationHistory();
  
  let prompt = `Based on the following video transcript, please answer the user's question. Use the conversation history for context.

Video Transcript:
${subtitles.substring(0, 8000)} ${subtitles.length > 8000 ? '...(truncated)' : ''}`;

  if (conversationHistory.length > 0) {
    prompt += `\n\nConversation History:
${conversationHistory}`;
  }

  prompt += `\n\nUser Question: ${question}

Please provide a helpful, accurate answer based on the video content and conversation context. 

IMPORTANT FORMATTING INSTRUCTIONS:
- Use double line breaks (\\n\\n) to separate paragraphs
- Structure your response with clear sections when summarizing
- Use headers with # for main sections when appropriate
- Make your response well-organized and easy to read:`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        return '❌ Invalid API key. Please check your Gemini API key in the extension settings.';
      }
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text;
    } else {
      return '❌ No response received from AI. Please try again.';
    }
    
  } catch (error) {

    return '❌ Error connecting to AI service. Please check your internet connection and try again.';
  }
}

// Show notification
function showNotification(message) {
  // Calculate responsive size based on screen resolution
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  const is4K = screenWidth >= 3840 || screenHeight >= 2160;
  const isHighRes = screenWidth >= 2560 || screenHeight >= 1440;
  
  // Scale notification based on screen size
  let fontSize, padding, maxWidth, borderRadius;
  if (is4K) {
    fontSize = '24px';
    padding = '32px 40px';
    maxWidth = '800px';
    borderRadius = '16px';
  } else if (isHighRes) {
    fontSize = '18px';
    padding = '24px 30px';
    maxWidth = '500px';
    borderRadius = '12px';
  } else {
    fontSize = '16px';
    padding = '16px 20px';
    maxWidth = '350px';
    borderRadius = '8px';
  }

  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1f1f1f;
    color: white;
    padding: ${padding};
    border-radius: ${borderRadius};
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    z-index: 10000;
    max-width: ${maxWidth};
    font-family: 'Inter', 'Roboto', Arial, sans-serif;
    font-size: ${fontSize};
    font-weight: 500;
    border: 1px solid #333;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
} 