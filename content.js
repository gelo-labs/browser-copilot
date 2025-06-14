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
  },
  instagram: {
    isMatch: (url) => url.includes('instagram.com'),
    isReels: (url) => url.includes('/reels'),
    selectors: {
      reels: [
        'div[role="presentation"]:has(div[data-media-type="video"])',
        'a[href*="/reels/"]',
        'div[data-media-type="video"]'
      ],
      feedNavigation: [
        '.ReelsContainer',
        'div[style*="transform: translateX"]'
      ]
    }
  },
  tiktok: {
    isMatch: (url) => url.includes('tiktok.com'),
    isForyou: (url) => url.includes('/foryou') || url === 'https://www.tiktok.com/',
    selectors: {
      feed: [
        'div[data-e2e="recommend-list-item-container"]',
        '.video-feed-item'
      ],
      feedNavigation: [
        '.swiper-wrapper',
        '.video-feed-container'
      ]
    }
  }
};

// State management
let currentState = { blockingState: 'active' };
let observer = null;

// Initialize and listen for state changes
chrome.storage.sync.get(['blockingState'], (result) => {
  // Default to 'active' if no state is stored yet
  currentState.blockingState = result.blockingState || 'active';
  applyBlockingRules();
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
  
  if (!platform) return; // Only proceed if on a configured platform

  // Inject styles and set up observer unconditionally when active
  injectBlockingStyles(platform);
  setupMutationObserver(platform); 

  // JS-based centering for direct Shorts
  if (platform.name === 'youtube' && platform.isShorts(currentUrl)) {
    centerShortsContainerJS(true);
  } else {
    centerShortsContainerJS(false);
  }

  if (platform.name === 'tiktok') {
    setTikTokScrollBlocked(true);
  } else {
    setTikTokScrollBlocked(false);
  }

  // Remove YouTube games from recommendations  
  if (platform && platform.name === 'youtube') {
    removeYouTubeGamesPreview();
  }
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
  const isDirectContent = (
    (platform.name === 'youtube' && platform.isShorts(currentUrl)) ||
    (platform.name === 'instagram' && platform.isReels(currentUrl)) ||
    (platform.name === 'tiktok' && !platform.isForyou(currentUrl))
  );

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
  if (platform.name === 'youtube' && isDirectContent) {
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
  if (platform.name === 'youtube' && ytAlwaysHideSelectors.length > 0) {
      cssText += `
          /* Always Hide These YT Elements */
          ${ytAlwaysHideSelectors.join(',\n          ')} {
              display: none !important;
          }
      `;
  }

  // 2. Handle non-direct pages
  if (!isDirectContent) {
      let selectorsToHide = [];
      if (platform.name === 'youtube') {
          selectorsToHide = ytGeneralHideSelectors;
      } else if (platform.name === 'instagram') {
          selectorsToHide = [
              ...(platform.selectors.reels || []),
              ...(platform.selectors.feedNavigation || [])
          ];
      } else if (platform.name === 'tiktok') {
          selectorsToHide = [
              ...(platform.selectors.feed || []),
              ...(platform.selectors.feedNavigation || [])
          ];
      }

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
  if (isDirectContent && platform.name === 'youtube') {
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
  console.log("GeloTools: Removing blocking styles.");
  const style = document.getElementById('gelotools-blocking-styles');
  if (style) {
    style.remove();
  }
}

function setupMutationObserver(platform) {
  disconnectObserver();

  observer = new MutationObserver(() => {
    if (currentState.blockingState === 'active') {
      injectBlockingStyles(platform);
      // Always remove YouTube games when blocking is active
      if (platform.name === 'youtube') {
        removeYouTubeGamesPreview();
      }
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

// --- TikTok scroll and tab bar blocking ---
function setTikTokScrollBlocked(enable) {
    // Main feed containers
    const feedContainers = [
        ...document.querySelectorAll('.DivContentContainer'),
        ...document.querySelectorAll('.DivContentFlexLayout')
    ];
    // Related videos sidebar/tab bar
    const tabBars = [
        ...document.querySelectorAll('.TUXTabBar'),
        ...document.querySelectorAll('.TUXTabBar-tabs'),
        ...document.querySelectorAll('.TUXTabBar-content'),
        ...document.querySelectorAll('.css-892n0s-DivVideoList-DivVideoListTabBarWrapper')
    ];

    if (enable) {
        document.documentElement.style.setProperty('overflow', 'hidden', 'important');
        document.body.style.setProperty('overflow', 'hidden', 'important');
        feedContainers.forEach(el => el.style.setProperty('overflow', 'hidden', 'important'));
        tabBars.forEach(el => el.style.display = 'none');
    } else {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        feedContainers.forEach(el => el.style.overflow = '');
        tabBars.forEach(el => el.style.display = '');
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

// Handle URL changes (for single-page apps)
let lastUrl = window.location.href;
new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    applyBlockingRules();
  }
}).observe(document, { subtree: true, childList: true }); 