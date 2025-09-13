// Test script for GeloLabs Logo Spinner
// This script demonstrates how to trigger the logo spinning from other parts of the extension

// Function to start logo spinning (call when Copilot becomes busy)
function startGeloLabsLogoSpinner(reason = 'copilot-active') {
    console.log('Starting GeloLabs logo spinner:', reason);
    
    // Send message to background script which forwards to gelolabs.com tabs
    chrome.runtime.sendMessage({
        action: 'copilot:busy',
        reason: reason
    }, (response) => {
        if (response && response.success) {
            console.log('Logo spinner started successfully');
        } else {
            console.log('Failed to start logo spinner');
        }
    });
}

// Function to force start logo spinning (ignores one-time restriction)
function forceStartGeloLabsLogoSpinner(reason = 'force-manual') {
    console.log('Force starting GeloLabs logo spinner:', reason);
    
    chrome.runtime.sendMessage({
        action: 'copilot:busy',
        reason: 'force-' + reason
    }, (response) => {
        if (response && response.success) {
            console.log('Logo spinner force started successfully');
        } else {
            console.log('Failed to force start logo spinner');
        }
    });
}

// Function to stop logo spinning (call when Copilot becomes idle)
function stopGeloLabsLogoSpinner() {
    console.log('Stopping GeloLabs logo spinner');
    
    // Send message to background script which forwards to gelolabs.com tabs
    chrome.runtime.sendMessage({
        action: 'copilot:idle'
    }, (response) => {
        if (response && response.success) {
            console.log('Logo spinner stopped successfully');
        } else {
            console.log('Failed to stop logo spinner');
        }
    });
}

// Test functions
function testLogoSpinner() {
    console.log('Testing GeloLabs logo spinner...');
    
    // Start spinning
    startGeloLabsLogoSpinner('test-mode');
    
    // Stop after 5 seconds
    setTimeout(() => {
        stopGeloLabsLogoSpinner();
    }, 5000);
    
    // Test different reasons
    setTimeout(() => {
        startGeloLabsLogoSpinner('ai-analysis');
        setTimeout(() => stopGeloLabsLogoSpinner(), 3000);
    }, 7000);
    
    setTimeout(() => {
        startGeloLabsLogoSpinner('video-processing');
        setTimeout(() => stopGeloLabsLogoSpinner(), 2000);
    }, 12000);
}

// Integration example for AI Assistant
class GeloLabsSpinnerIntegration {
    constructor() {
        this.isSpinning = false;
    }
    
    // Call when starting AI analysis
    startAIAnalysis() {
        if (!this.isSpinning) {
            startGeloLabsLogoSpinner('ai-analysis');
            this.isSpinning = true;
        }
    }
    
    // Call when AI analysis completes
    stopAIAnalysis() {
        if (this.isSpinning) {
            stopGeloLabsLogoSpinner();
            this.isSpinning = false;
        }
    }
    
    // Call when starting video processing
    startVideoProcessing() {
        if (!this.isSpinning) {
            startGeloLabsLogoSpinner('video-processing');
            this.isSpinning = true;
        }
    }
    
    // Call when video processing completes
    stopVideoProcessing() {
        if (this.isSpinning) {
            stopGeloLabsLogoSpinner();
            this.isSpinning = false;
        }
    }
    
    // Call for any generic copilot activity
    startCopilotActivity(reason = 'copilot-busy') {
        if (!this.isSpinning) {
            startGeloLabsLogoSpinner(reason);
            this.isSpinning = true;
        }
    }
    
    // Call when copilot activity ends
    stopCopilotActivity() {
        if (this.isSpinning) {
            stopGeloLabsLogoSpinner();
            this.isSpinning = false;
        }
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        startGeloLabsLogoSpinner,
        stopGeloLabsLogoSpinner,
        testLogoSpinner,
        GeloLabsSpinnerIntegration
    };
}

// Physics control functions
function enableGeloLabsPhysics() {
    console.log('Enabling GeloLabs physics');
    chrome.runtime.sendMessage({ action: 'gelolabs:enablePhysics' }, (response) => {
        console.log('Physics enabled:', response);
    });
}

function disableGeloLabsPhysics() {
    console.log('Disabling GeloLabs physics');
    chrome.runtime.sendMessage({ action: 'gelolabs:disablePhysics' }, (response) => {
        console.log('Physics disabled:', response);
    });
}

function resetGeloLabsPosition() {
    console.log('Resetting GeloLabs logo position');
    chrome.runtime.sendMessage({ action: 'gelolabs:resetPosition' }, (response) => {
        console.log('Position reset:', response);
    });
}

function setGeloLabsPosition(x, y) {
    console.log('Setting GeloLabs logo position to:', x, y);
    chrome.runtime.sendMessage({ action: 'gelolabs:setPosition', x: x, y: y }, (response) => {
        console.log('Position set:', response);
    });
}

function debugGeloLabsPosition() {
    console.log('=== GELOLABS LOGO POSITION DEBUG ===');
    
    // Find the logo element
    const logo = document.querySelector('img.logo[alt="GeloLabs Logo"]') || 
                 document.querySelector('img[alt="GeloLabs Logo"]') ||
                 document.querySelector('.logo');
    
    if (!logo) {
        console.log('❌ Logo not found!');
        return;
    }
    
    console.log('✅ Logo found:', logo);
    
    // Get various position measurements
    const rect = logo.getBoundingClientRect();
    const computed = window.getComputedStyle(logo);
    
    console.log('📍 getBoundingClientRect():', rect);
    console.log('🎨 Computed styles:', {
        position: computed.position,
        top: computed.top,
        left: computed.left,
        transform: computed.transform,
        margin: computed.margin
    });
    
    // Check parent
    const parent = logo.parentElement;
    if (parent) {
        const parentRect = parent.getBoundingClientRect();
        console.log('📦 Parent element:', parent.tagName, parent.className);
        console.log('📦 Parent rect:', parentRect);
    }
    
    // Calculate center
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    console.log('🎯 Logo center should be:', { x: centerX, y: centerY });
    
    console.log('=== USE THIS COMMAND TO SET CORRECT POSITION ===');
    console.log(`GeloLabsSpinner.setPosition(${centerX}, ${centerY})`);
}

// Enhanced test function with physics
function testLogoPhysics() {
    console.log('Testing GeloLabs logo physics...');
    
    // First do a normal spin
    startGeloLabsLogoSpinner('physics-test');
    
    // After spin completes, physics should be enabled automatically
    setTimeout(() => {
        console.log('Physics should now be enabled - try dragging the logo!');
        console.log('Double-click the logo to reset position');
        console.log('Or use: GeloLabsSpinner.resetPosition()');
    }, 2000);
}

// Make available globally for testing
window.GeloLabsSpinner = {
    start: startGeloLabsLogoSpinner,
    forceStart: forceStartGeloLabsLogoSpinner,
    stop: stopGeloLabsLogoSpinner,
    test: testLogoSpinner,
    testPhysics: testLogoPhysics,
    enablePhysics: enableGeloLabsPhysics,
    disablePhysics: disableGeloLabsPhysics,
    resetPosition: resetGeloLabsPosition,
    setPosition: setGeloLabsPosition,
    debugPosition: debugGeloLabsPosition,
    Integration: GeloLabsSpinnerIntegration
};
