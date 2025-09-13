# GeloLabs Logo Spinner

A content script that spins the GeloLabs logo on gelolabs.com when Copilot work is active, providing visual feedback to users.

## 🎯 Features

- **Realistic Animation**: Logo spins with inertia effects (overshoots and settles back)
- **Accessibility Support**: Respects `prefers-reduced-motion` with alternative progress bar
- **SPA Compatible**: Works with single-page applications and route changes
- **Performance Optimized**: Zero polling, minimal resource usage
- **Tab Affinity**: Optional tab-specific spinning
- **Failsafe Protection**: Automatically stops after 30 seconds if no idle message

## 🔧 Implementation

### Files Created/Modified

1. **`gelolabs-content.js`** - Main content script for logo spinning
2. **`manifest.json`** - Added content script and host permissions for gelolabs.com
3. **`background.js`** - Added message forwarding for copilot:busy/idle
4. **`gelolabs-test.html`** - Test page for development and debugging
5. **`test-logo-spinner.js`** - Helper functions and integration examples

### Logo Detection

The script looks for the logo using these selectors (in priority order):
1. `img.logo[alt="GeloLabs Logo"]` ✅ (matches your provided structure)
2. `img[alt="GeloLabs Logo"]`
3. `.logo[alt*="GeloLabs"]`
4. `img[src*="logo"]` (fallback)

### Animation Details

**Normal Animation:**
```css
@keyframes gelolabs-spin-realistic {
    0% { transform: rotate(0deg); }
    70% { transform: rotate(378deg); } /* Overshoot by 18° */
    85% { transform: rotate(354deg); } /* Swing back */
    95% { transform: rotate(366deg); } /* Small overshoot */
    100% { transform: rotate(360deg); } /* Settle */
}
```

**Reduced Motion Alternative:**
- 2px bottom border progress bar
- Animated width from 0% to 100%
- Gentle blue gradient color

## 🚀 Usage

### From Background Script or Content Scripts

```javascript
// Start spinning
chrome.runtime.sendMessage({
    action: 'copilot:busy',
    reason: 'ai-analysis'  // Optional reason
});

// Stop spinning
chrome.runtime.sendMessage({
    action: 'copilot:idle'
});
```

### Using the Integration Helper

```javascript
// Include test-logo-spinner.js in your script
const spinner = new GeloLabsSpinnerIntegration();

// Start AI analysis
spinner.startAIAnalysis();

// Stop when done
spinner.stopAIAnalysis();

// Or use generic methods
spinner.startCopilotActivity('video-processing');
spinner.stopCopilotActivity();
```

### Quick Testing

```javascript
// Test in browser console on gelolabs.com
GeloLabsSpinner.test();

// Manual control
GeloLabsSpinner.start('test-mode');
GeloLabsSpinner.stop();
```

## 🔄 Message Protocol

### copilot:busy
Starts logo spinning animation.

**Parameters:**
- `reason` (string, optional): Description of why Copilot is busy
- `tabId` (number, optional): Specific tab ID for tab affinity

**Example:**
```javascript
{
    action: 'copilot:busy',
    reason: 'ai-video-analysis',
    tabId: 123456
}
```

### copilot:idle
Stops logo spinning animation.

**Parameters:**
- `tabId` (number, optional): Specific tab ID for tab affinity

**Example:**
```javascript
{
    action: 'copilot:idle',
    tabId: 123456
}
```

### gelolabs:getStatus
Gets current spinner status (for debugging).

**Response:**
```javascript
{
    spinning: boolean,
    logoFound: boolean,
    reducedMotion: boolean
}
```

## 🛡️ Safety Features

### Retry Logic
- Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
- Maximum retry time: 5 seconds
- Silent failure if logo not found

### Failsafe Timer
- Automatically stops spinning after 30 seconds
- Prevents stuck animations if idle message is lost
- Logs failsafe activation for debugging

### Performance
- Zero polling after logo is found
- MutationObserver only watches for DOM changes
- Minimal CPU usage when idle
- No network requests

### Error Handling
- Graceful degradation if extension context unavailable
- Safe cleanup on page unload
- Console logging for debugging (non-intrusive)

## 🧪 Testing

### Development Testing

1. **Open Test Page:**
   ```
   file:///path/to/gelolabs-test.html
   ```

2. **Load Extension:**
   - Open Chrome Extensions (chrome://extensions/)
   - Enable Developer Mode
   - Load Unpacked: Select project folder

3. **Test on gelolabs.com:**
   - Open gelolabs.com
   - Open Developer Console
   - Run: `GeloLabsSpinner.test()`

### Manual Testing Commands

```javascript
// Start spinning with different reasons
GeloLabsSpinner.start('ai-analysis');
GeloLabsSpinner.start('video-processing');
GeloLabsSpinner.start('copilot-thinking');

// Stop spinning
GeloLabsSpinner.stop();

// Test reduced motion
// (Enable in browser accessibility settings first)
GeloLabsSpinner.start('reduced-motion-test');
```

## 🎨 Customization

### Animation Timing
Modify the CSS keyframes in `gelolabs-content.js`:

```javascript
// Current: 1.2s ease-out with inertia
animation: gelolabs-spin-realistic 1.2s ease-out infinite;

// Faster: 0.8s
animation: gelolabs-spin-realistic 0.8s ease-out infinite;

// Smoother: 2s with different easing
animation: gelolabs-spin-realistic 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
```

### Alternative Indicators
Modify the reduced motion animation:

```css
/* Current: Progress bar */
.gelolabs-copilot-progress::after {
    /* ... progress bar styles ... */
}

/* Alternative: Gentle glow */
.gelolabs-copilot-progress {
    box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
    animation: gelolabs-glow 2s ease-in-out infinite;
}
```

## 🐛 Troubleshooting

### Logo Not Found
1. Check if logo element exists: `document.querySelector('img.logo[alt="GeloLabs Logo"]')`
2. Verify selector matches actual HTML structure
3. Check browser console for retry attempts

### Animation Not Working
1. Verify CSS is injected: Check for `#gelolabs-copilot-styles` in DOM
2. Check for CSS conflicts with site styles
3. Verify reduced motion preference: `window.matchMedia('(prefers-reduced-motion: reduce)').matches`

### Messages Not Received
1. Check extension is loaded and active
2. Verify host permissions for gelolabs.com
3. Check browser console for message errors
4. Test with `GeloLabsSpinner.test()`

### Performance Issues
1. Check MutationObserver is not over-triggering
2. Verify no memory leaks in long-running pages
3. Monitor CPU usage during animation

## 🔮 Future Enhancements

- **Multiple Animation Styles**: Different animations for different reasons
- **Progress Indicators**: Show progress for long-running tasks
- **Sound Effects**: Optional audio feedback (with user permission)
- **Custom Triggers**: User-configurable activation conditions
- **Analytics**: Track usage patterns (with privacy protection)

## 📝 Notes

- Only runs on gelolabs.com domains
- Respects user accessibility preferences
- No data collection or external network calls
- Designed for minimal performance impact
- Compatible with Chrome Manifest V3
