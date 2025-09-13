// GeloLabs Logo Spinner Content Script
// Only runs on gelolabs.com to spin the logo during Copilot activity

(function() {
    'use strict';
    
    // Configuration
    const CONFIG = {
        LOGO_SELECTORS: [
            'img.logo[alt="GeloLabs Logo"]',
            'img[alt="GeloLabs Logo"]',
            '.logo[alt*="GeloLabs"]',
            'img[src*="logo"]'
        ],
        RETRY_DELAYS: [100, 200, 400, 800, 1600], // Exponential backoff
        MAX_RETRY_TIME: 5000,
        FAILSAFE_TIMEOUT: 30000,
        ANIMATION_CLASS: 'gelolabs-copilot-spinning',
        REDUCED_MOTION_CLASS: 'gelolabs-copilot-progress'
    };
    
    // State management
    let state = {
        logoElement: null,
        isSpinning: false,
        hasSpunOnce: false, // Track if we've already spun once
        currentTabId: null,
        failsafeTimer: null,
        mutationObserver: null,
        retryCount: 0,
        prefersReducedMotion: false,
        animationEndHandler: null,
        // Physics system
        physics: {
            enabled: false,
            isDragging: false,
            isPhysicsActive: false,
            position: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            originalPosition: { x: 0, y: 0 },
            dragStart: { x: 0, y: 0 },
            lastMousePos: { x: 0, y: 0 },
            animationFrame: null,
            gravity: 0.1,
            bounce: 0.68,
            friction: 0.995,
            magneticRange: 50,
            magneticStrength: 0.15,
            rotation: 0,
            rotationVelocity: 0
        }
    };
    
    // Check for reduced motion preference
    function checkReducedMotion() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            state.prefersReducedMotion = mediaQuery.matches;
            
            // Listen for changes
            mediaQuery.addEventListener('change', (e) => {
                state.prefersReducedMotion = e.matches;
                if (state.isSpinning) {
                    // Reapply animation with new preference
                    stopSpinning();
                    startSpinning();
                }
            });
        }
    }
    
    // Inject CSS styles for animations
    function injectStyles() {
        const styleId = 'gelolabs-copilot-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Realistic spinning animation with inertia - ONE TIME ONLY */
            @keyframes gelolabs-spin-once {
                0% { transform: rotate(0deg); }
                70% { transform: rotate(378deg); } /* Overshoot by 18 degrees */
                85% { transform: rotate(354deg); } /* Swing back */
                95% { transform: rotate(366deg); } /* Small overshoot */
                100% { transform: rotate(360deg); } /* Settle to position */
            }
            
            .${CONFIG.ANIMATION_CLASS} {
                animation: gelolabs-spin-once 1.2s ease-out forwards;
                transform-origin: center;
            }
            
            /* Physics-enabled logo styles */
            .gelolabs-physics-enabled {
                /* DON'T change position - keep it as it is */
                z-index: 9999 !important;
                cursor: grab !important;
                transition: none !important;
                user-select: none !important;
                pointer-events: auto !important;
                transform-origin: center !important;
            }
            
            .gelolabs-physics-enabled:hover {
                /* No glow effects */
            }
            
            .gelolabs-physics-enabled.dragging {
                cursor: grabbing !important;
                /* No glow effects */
            }
            
            .gelolabs-physics-enabled.magnetic-snap {
                transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
                /* No glow effects */
            }
            
            /* Alternative for reduced motion - subtle glow pulse */
            .${CONFIG.REDUCED_MOTION_CLASS} {
                position: relative;
            }
            
            .${CONFIG.REDUCED_MOTION_CLASS}::after {
                content: '';
                position: absolute;
                bottom: -2px;
                left: 0;
                height: 2px;
                background: linear-gradient(90deg, #00d4ff, #0099cc);
                border-radius: 1px;
                animation: gelolabs-progress 2s ease-in-out infinite;
            }
            
            @keyframes gelolabs-progress {
                0%, 100% { width: 0%; opacity: 0.6; }
                50% { width: 100%; opacity: 1; }
            }
            
            /* Respect reduced motion preference */
            @media (prefers-reduced-motion: reduce) {
                .${CONFIG.ANIMATION_CLASS} {
                    animation: none;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Find logo element using multiple selectors
    function findLogo() {
        console.log('🔍 Searching for GeloLabs logo...');
        console.log('📋 Available selectors:', CONFIG.LOGO_SELECTORS);
        
        for (const selector of CONFIG.LOGO_SELECTORS) {
            console.log(`🎯 Trying selector: ${selector}`);
            const element = document.querySelector(selector);
            if (element) {
                console.log('✅ GeloLabs logo found with selector:', selector);
                console.log('🖼️ Logo element:', element);
                return element;
            } else {
                console.log(`❌ No match for: ${selector}`);
            }
        }
        
        // Let's also see what's actually in the DOM
        console.log('🔍 Looking for any img elements...');
        const allImages = document.querySelectorAll('img');
        console.log(`📸 Found ${allImages.length} img elements:`, allImages);
        
        console.log('🔍 Looking for elements with "logo" class...');
        const logoClasses = document.querySelectorAll('.logo');
        console.log(`🏷️ Found ${logoClasses.length} .logo elements:`, logoClasses);
        
        return null;
    }
    
    // Retry finding logo with exponential backoff
    function retryFindLogo() {
        if (state.retryCount >= CONFIG.RETRY_DELAYS.length) {
            console.log('GeloLabs logo not found after maximum retries');
            return;
        }
        
        const delay = CONFIG.RETRY_DELAYS[state.retryCount];
        state.retryCount++;
        
        setTimeout(() => {
            state.logoElement = findLogo();
            if (state.logoElement) {
                setupMutationObserver();
                // If we were supposed to be spinning, start now
                if (state.isSpinning) {
                    applySpinning();
                } else {
                    // Auto-start spinning when logo is found (demo mode)
                    console.log('Logo found after retry - auto-starting spinner');
                    startSpinning('logo-found-demo');
                }
            } else {
                retryFindLogo();
            }
        }, delay);
    }
    
    // Setup MutationObserver to watch for logo changes
    function setupMutationObserver() {
        if (state.mutationObserver) {
            state.mutationObserver.disconnect();
        }
        
        state.mutationObserver = new MutationObserver((mutations) => {
            let shouldRecheck = false;
            
            mutations.forEach((mutation) => {
                // Check if logo element was removed
                if (mutation.type === 'childList' && state.logoElement) {
                    mutation.removedNodes.forEach((node) => {
                        if (node === state.logoElement || 
                            (node.contains && node.contains(state.logoElement))) {
                            shouldRecheck = true;
                        }
                    });
                }
                
                // Check if new nodes might contain logo
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const foundLogo = node.querySelector ? 
                                CONFIG.LOGO_SELECTORS.find(sel => node.querySelector(sel)) : null;
                            if (foundLogo || CONFIG.LOGO_SELECTORS.some(sel => node.matches && node.matches(sel))) {
                                shouldRecheck = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldRecheck) {
                const newLogo = findLogo();
                if (newLogo && newLogo !== state.logoElement) {
                    console.log('GeloLabs logo element changed, updating reference');
                    state.logoElement = newLogo;
                    if (state.isSpinning) {
                        applySpinning();
                    }
                }
            }
        });
        
        // Observe the entire document for changes
        state.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Apply spinning animation to logo
    function applySpinning() {
        if (!state.logoElement) return;
        
        // Remove any existing classes first
        state.logoElement.classList.remove(CONFIG.ANIMATION_CLASS, CONFIG.REDUCED_MOTION_CLASS);
        
        // Remove any existing animation end listener
        if (state.animationEndHandler) {
            state.logoElement.removeEventListener('animationend', state.animationEndHandler);
        }
        
        if (state.prefersReducedMotion) {
            state.logoElement.classList.add(CONFIG.REDUCED_MOTION_CLASS);
            // For reduced motion, also auto-remove after animation
            setTimeout(() => {
                removeSpinning();
            }, 2000); // Match the progress animation duration
        } else {
            state.logoElement.classList.add(CONFIG.ANIMATION_CLASS);
            
            // Listen for animation end to clean up
            state.animationEndHandler = function(event) {
                if (event.animationName === 'gelolabs-spin-once') {
                    console.log('🎯 Logo spin animation completed - enabling physics');
                    removeSpinning();
                    // Enable physics after spin animation completes
                    setTimeout(() => {
                        enablePhysics();
                    }, 100);
                }
            };
            
            state.logoElement.addEventListener('animationend', state.animationEndHandler);
        }
    }
    
    // Remove spinning animation from logo
    function removeSpinning() {
        if (!state.logoElement) return;
        
        // Remove animation classes
        state.logoElement.classList.remove(CONFIG.ANIMATION_CLASS, CONFIG.REDUCED_MOTION_CLASS);
        
        // Clean up animation end listener
        if (state.animationEndHandler) {
            state.logoElement.removeEventListener('animationend', state.animationEndHandler);
            state.animationEndHandler = null;
        }
    }
    
    // Start spinning animation
    function startSpinning(reason = 'unknown') {
        // Check if we've already spun once (unless it's a manual override)
        if (state.hasSpunOnce && !reason.includes('manual') && !reason.includes('force')) {
            console.log('🚫 Logo has already spun once - skipping:', reason);
            return;
        }
        
        console.log('🌟 GeloLabs logo spinning started:', reason);
        state.isSpinning = true;
        state.hasSpunOnce = true; // Mark that we've spun
        
        if (state.logoElement) {
            applySpinning();
        } else {
            // Try to find logo if not found yet
            state.logoElement = findLogo();
            if (state.logoElement) {
                applySpinning();
                setupMutationObserver();
            } else {
                // Start retry process
                state.retryCount = 0;
                retryFindLogo();
            }
        }
        
        // No failsafe timeout for physics mode - let it run naturally
    }
    
    // Stop spinning animation
    function stopSpinning() {
        console.log('GeloLabs logo spinning stopped');
        state.isSpinning = false;
        
        removeSpinning();
    }
    
    // Handle SPA navigation
    function setupNavigationHandlers() {
        // Override pushState and replaceState
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function() {
            originalPushState.apply(this, arguments);
            handleRouteChange();
        };
        
        history.replaceState = function() {
            originalReplaceState.apply(this, arguments);
            handleRouteChange();
        };
        
        // Listen for popstate
        window.addEventListener('popstate', handleRouteChange);
        
        // Also listen for hashchange
        window.addEventListener('hashchange', handleRouteChange);
    }
    
    // Handle route changes
    function handleRouteChange() {
        console.log('🔄 GeloLabs route change detected - resetting spin state');
        
        // Clean up physics
        disablePhysics();
        
        // Reset all state for new page
        state.logoElement = null;
        state.retryCount = 0;
        state.hasSpunOnce = false; // Reset spin flag for new page
        state.isSpinning = false;
        
        // Clean up any existing timers (removed failsafe timer)
        
        // Wait a bit for the new content to render
        setTimeout(() => {
            state.logoElement = findLogo();
            if (state.logoElement) {
                setupMutationObserver();
                // Auto-start spinning for new page
                console.log('🆕 New page loaded - auto-starting spinner');
                startSpinning('route-change-demo');
            } else {
                retryFindLogo();
            }
        }, 100);
    }
    
    // ============ PHYSICS SYSTEM ============
    
    // Enable physics mode for the logo
    function enablePhysics() {
        if (!state.logoElement || state.physics.enabled) return;
        
        console.log('🚀 Enabling physics for logo - KEEPING CURRENT POSITION');
        
        // Get the logo's CURRENT visual position (where it is right now)
        const rect = state.logoElement.getBoundingClientRect();
        const currentPosition = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        
        console.log('📍 Logo current visual position:', currentPosition);
        
        // Use the CURRENT position as both original and physics position
        state.physics.originalPosition = currentPosition;
        state.physics.position = { ...currentPosition };
        state.physics.enabled = true;
        
        // Apply physics styles but DON'T change the transform
        state.logoElement.classList.add('gelolabs-physics-enabled');
        
        // DON'T touch the transform at all - leave it exactly as it is
        console.log('🔒 Transform left untouched:', state.logoElement.style.transform);
        
        // Add event listeners
        setupPhysicsEventListeners();
        
        // CRITICAL: Don't call updateLogoPosition() here - it would move the logo
        console.log('✅ Physics enabled - logo position PRESERVED');
        console.log('🎯 Using current position as baseline:', state.physics.originalPosition);
        console.log('⚠️ NOT calling updateLogoPosition() to avoid movement');
    }
    
    // Disable physics mode
    function disablePhysics() {
        if (!state.physics.enabled) return;
        
        console.log('🛑 Disabling physics');
        
        // Stop animation loop
        if (state.physics.animationFrame) {
            cancelAnimationFrame(state.physics.animationFrame);
            state.physics.animationFrame = null;
        }
        
        // Remove physics styles
        if (state.logoElement) {
            state.logoElement.classList.remove('gelolabs-physics-enabled', 'dragging', 'magnetic-snap');
            state.logoElement.style.transform = '';
            state.logoElement.style.left = '';
            state.logoElement.style.top = '';
        }
        
        // Remove event listeners
        removePhysicsEventListeners();
        
        // Reset physics state
        state.physics.enabled = false;
        state.physics.isDragging = false;
        state.physics.isPhysicsActive = false;
        state.physics.velocity = { x: 0, y: 0 };
    }
    
    // Setup physics event listeners
    function setupPhysicsEventListeners() {
        if (!state.logoElement) return;
        
        // Mouse events
        state.logoElement.addEventListener('mousedown', handlePhysicsMouseDown);
        document.addEventListener('mousemove', handlePhysicsMouseMove);
        document.addEventListener('mouseup', handlePhysicsMouseUp);
        
        // Touch events for mobile
        state.logoElement.addEventListener('touchstart', handlePhysicsTouchStart, { passive: false });
        document.addEventListener('touchmove', handlePhysicsTouchMove, { passive: false });
        document.addEventListener('touchend', handlePhysicsTouchEnd);
        
        // Double-click to reset position (disabled to prevent auto-centering)
        // state.logoElement.addEventListener('dblclick', resetLogoPosition);
    }
    
    // Remove physics event listeners
    function removePhysicsEventListeners() {
        if (!state.logoElement) return;
        
        state.logoElement.removeEventListener('mousedown', handlePhysicsMouseDown);
        document.removeEventListener('mousemove', handlePhysicsMouseMove);
        document.removeEventListener('mouseup', handlePhysicsMouseUp);
        
        state.logoElement.removeEventListener('touchstart', handlePhysicsTouchStart);
        document.removeEventListener('touchmove', handlePhysicsTouchMove);
        document.removeEventListener('touchend', handlePhysicsTouchEnd);
        
        // state.logoElement.removeEventListener('dblclick', resetLogoPosition);
    }
    
    // Mouse down handler
    function handlePhysicsMouseDown(event) {
        event.preventDefault();
        startDragging(event.clientX, event.clientY);
    }
    
    // Mouse move handler
    function handlePhysicsMouseMove(event) {
        if (!state.physics.isDragging) return;
        event.preventDefault();
        updateDragging(event.clientX, event.clientY);
    }
    
    // Mouse up handler
    function handlePhysicsMouseUp(event) {
        if (!state.physics.isDragging) return;
        event.preventDefault();
        stopDragging();
    }
    
    // Touch start handler
    function handlePhysicsTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        startDragging(touch.clientX, touch.clientY);
    }
    
    // Touch move handler
    function handlePhysicsTouchMove(event) {
        if (!state.physics.isDragging) return;
        event.preventDefault();
        const touch = event.touches[0];
        updateDragging(touch.clientX, touch.clientY);
    }
    
    // Touch end handler
    function handlePhysicsTouchEnd(event) {
        if (!state.physics.isDragging) return;
        event.preventDefault();
        stopDragging();
    }
    
    // Start dragging
    function startDragging(x, y) {
        console.log('🖱️ Started dragging logo');
        
        state.physics.isDragging = true;
        state.physics.dragStart = { x, y };
        state.physics.lastMousePos = { x, y };
        state.physics.velocity = { x: 0, y: 0 };
        
        // DON'T teleport logo to cursor - keep it where it is
        // The logo will follow the cursor from its current position
        
        // Add dragging class for visual feedback
        state.logoElement.classList.add('dragging');
        state.logoElement.classList.remove('magnetic-snap');
        
        // Stop physics animation while dragging
        if (state.physics.animationFrame) {
            cancelAnimationFrame(state.physics.animationFrame);
            state.physics.animationFrame = null;
        }
        
        console.log('🎯 Started dragging from current position - no teleporting');
    }
    
    // Update dragging
    function updateDragging(x, y) {
        if (!state.physics.isDragging) return;
        
        // Calculate how much the cursor moved
        const deltaX = x - state.physics.lastMousePos.x;
        const deltaY = y - state.physics.lastMousePos.y;
        
        // Move the logo by the same amount the cursor moved
        state.physics.position.x += deltaX;
        state.physics.position.y += deltaY;
        
        // Apply some smoothing to velocity for throwing
        state.physics.velocity.x = state.physics.velocity.x * 0.5 + deltaX * 0.5;
        state.physics.velocity.y = state.physics.velocity.y * 0.5 + deltaY * 0.5;
        
        updateLogoPosition();
        
        state.physics.lastMousePos = { x, y };
    }
    
    // Stop dragging and apply physics
    function stopDragging() {
        if (!state.physics.isDragging) return;
        
        console.log('🚀 Released logo - starting physics simulation');
        console.log('Initial velocity:', state.physics.velocity);
        
        state.physics.isDragging = false;
        state.physics.isPhysicsActive = true;
        
        // Remove dragging class
        state.logoElement.classList.remove('dragging');
        
        // Start physics simulation
        startPhysicsSimulation();
    }
    
    // Start physics simulation loop
    function startPhysicsSimulation() {
        if (state.physics.animationFrame) {
            cancelAnimationFrame(state.physics.animationFrame);
        }
        
        const simulate = () => {
            if (!state.physics.isPhysicsActive) return;
            
            // Apply gravity
            state.physics.velocity.y += state.physics.gravity;
            
            // Apply friction
            state.physics.velocity.x *= state.physics.friction;
            state.physics.velocity.y *= state.physics.friction;
            
            // Update rotation based on horizontal velocity
            state.physics.rotationVelocity = state.physics.velocity.x * 2; // Spin based on horizontal movement
            state.physics.rotation += state.physics.rotationVelocity;
            
            // Apply rotation friction
            state.physics.rotationVelocity *= 0.98;
            
            // Update position
            state.physics.position.x += state.physics.velocity.x;
            state.physics.position.y += state.physics.velocity.y;
            
            // Check for collisions
            handleCollisions();
            
            // Check for magnetic snap (re-enabled with stronger force)
            checkMagneticSnap();
            
            // Update logo position
            updateLogoPosition();
            
            // Continue simulation if object is still moving
            const speed = Math.sqrt(state.physics.velocity.x ** 2 + state.physics.velocity.y ** 2);
            if (speed > 0.05 && state.physics.isPhysicsActive) {
                state.physics.animationFrame = requestAnimationFrame(simulate);
            } else {
                // Stop simulation when object comes to rest
                state.physics.isPhysicsActive = false;
                console.log('🛑 Physics simulation stopped - final speed:', speed.toFixed(3));
            }
        };
        
        state.physics.animationFrame = requestAnimationFrame(simulate);
    }
    
    // Handle collisions with screen boundaries and elements
    function handleCollisions() {
        const logoSize = 48; // Approximate logo size
        const margin = logoSize / 2;
        
        // Screen boundaries - use viewport dimensions
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // Only log when we're near boundaries for debugging
        const nearBoundary = state.physics.position.x <= margin + 10 || 
                            state.physics.position.x >= screenWidth - margin - 10 ||
                            state.physics.position.y <= margin + 10 || 
                            state.physics.position.y >= screenHeight - margin - 10;
        
        if (nearBoundary) {
            console.log('🖥️ Screen dimensions:', { width: screenWidth, height: screenHeight });
            console.log('📍 Logo position:', { x: state.physics.position.x, y: state.physics.position.y });
            console.log('🎯 Margins - Left:', margin, 'Right:', screenWidth - margin);
        }
        
        // Left wall collision - logo center hits left edge
        if (state.physics.position.x <= margin) {
            state.physics.position.x = margin + 1; // Just inside the boundary
            state.physics.velocity.x = Math.abs(state.physics.velocity.x) * state.physics.bounce;
            console.log('💥 Bounced off LEFT wall at x =', state.physics.position.x);
        }
        
        // Right wall collision - logo center hits right edge
        if (state.physics.position.x >= screenWidth - margin) {
            state.physics.position.x = screenWidth - margin - 1; // Just inside the boundary
            state.physics.velocity.x = -Math.abs(state.physics.velocity.x) * state.physics.bounce;
            console.log('💥 Bounced off RIGHT wall at x =', state.physics.position.x);
        }
        
        // Top wall collision
        if (state.physics.position.y <= margin) {
            state.physics.position.y = margin + 1;
            state.physics.velocity.y = Math.abs(state.physics.velocity.y) * state.physics.bounce;
            console.log('💥 Bounced off TOP wall at y =', state.physics.position.y);
        }
        
        // Bottom wall collision
        if (state.physics.position.y >= screenHeight - margin) {
            state.physics.position.y = screenHeight - margin - 1;
            state.physics.velocity.y = -Math.abs(state.physics.velocity.y) * state.physics.bounce;
            console.log('💥 Bounced off BOTTOM wall at y =', state.physics.position.y);
        }
        
        // Check collision with chatbox elements only
        checkChatboxCollision();
    }
    
    // Check collision with chatbox elements only
    function checkChatboxCollision() {
        // Only look for .chatbox elements (user specified)
        const chatboxElements = document.querySelectorAll('.chatbox');
        
        chatboxElements.forEach(element => {
            // Make sure element is visible and has dimensions
            const rect = element.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && isColliding(state.physics.position, rect)) {
                console.log('💥 Colliding with chatbox element:', element);
                handleElementCollision(rect);
            }
        });
    }
    
    // Check if logo collides with an element
    function isColliding(position, rect) {
        const logoSize = 48;
        const margin = logoSize / 2;
        
        return position.x + margin > rect.left &&
               position.x - margin < rect.right &&
               position.y + margin > rect.top &&
               position.y - margin < rect.bottom;
    }
    
    // Handle collision with an element
    function handleElementCollision(rect) {
        const logoSize = 48;
        const margin = logoSize / 2;
        
        // Get current position
        const logoX = state.physics.position.x;
        const logoY = state.physics.position.y;
        
        // Calculate overlap on each side
        const overlapLeft = (logoX + margin) - rect.left;
        const overlapRight = rect.right - (logoX - margin);
        const overlapTop = (logoY + margin) - rect.top;
        const overlapBottom = rect.bottom - (logoY - margin);
        
        // Find the smallest overlap (closest edge)
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
        
        // Bounce off the closest edge with minimal position adjustment
        if (minOverlap === overlapLeft) {
            // Left edge collision
            state.physics.position.x = rect.left - margin - 1;
            state.physics.velocity.x = -Math.abs(state.physics.velocity.x) * state.physics.bounce;
            console.log('💥 Bounced off LEFT edge of chatbox');
        } else if (minOverlap === overlapRight) {
            // Right edge collision
            state.physics.position.x = rect.right + margin + 1;
            state.physics.velocity.x = Math.abs(state.physics.velocity.x) * state.physics.bounce;
            console.log('💥 Bounced off RIGHT edge of chatbox');
        } else if (minOverlap === overlapTop) {
            // Top edge collision
            state.physics.position.y = rect.top - margin - 1;
            state.physics.velocity.y = -Math.abs(state.physics.velocity.y) * state.physics.bounce;
            console.log('💥 Bounced off TOP edge of chatbox');
        } else if (minOverlap === overlapBottom) {
            // Bottom edge collision
            state.physics.position.y = rect.bottom + margin + 1;
            state.physics.velocity.y = Math.abs(state.physics.velocity.y) * state.physics.bounce;
            console.log('💥 Bounced off BOTTOM edge of chatbox');
        }
    }
    
    // Check for magnetic snap to original position
    function checkMagneticSnap() {
        const distance = Math.sqrt(
            (state.physics.position.x - state.physics.originalPosition.x) ** 2 +
            (state.physics.position.y - state.physics.originalPosition.y) ** 2
        );
        
        // Stronger magnetic field - attracts from further away
        if (distance < 80) { // Increased from 50 to 80
            const magneticForce = (80 - distance) / 80; // Stronger force when closer
            const pullStrength = magneticForce * 0.3; // Increased pull strength
            
            // Apply magnetic pull towards original position
            const pullX = (state.physics.originalPosition.x - state.physics.position.x) * pullStrength;
            const pullY = (state.physics.originalPosition.y - state.physics.position.y) * pullStrength;
            
            // Override user velocity with magnetic pull when close enough
            if (distance < 30) {
                state.physics.velocity.x = pullX * 3; // Strong override
                state.physics.velocity.y = pullY * 3;
                console.log('🧲 Strong magnetic pull - overriding velocity');
            } else {
                // Add magnetic pull to existing velocity
                state.physics.velocity.x += pullX;
                state.physics.velocity.y += pullY;
            }
            
            // Snap when very close
            if (distance < 10) {
                console.log('🧲 Magnetic snap activated!');
                snapToOriginalPosition();
            }
        }
    }
    
    // Snap logo back to original position
    function snapToOriginalPosition() {
        state.physics.isPhysicsActive = false;
        
        // Add magnetic snap class for visual feedback
        state.logoElement.classList.add('magnetic-snap');
        
        // Smoothly move back to original position and reset rotation
        state.physics.position.x = state.physics.originalPosition.x;
        state.physics.position.y = state.physics.originalPosition.y;
        state.physics.velocity.x = 0;
        state.physics.velocity.y = 0;
        state.physics.rotation = 0;
        state.physics.rotationVelocity = 0;
        
        updateLogoPosition();
        
        // Remove snap class and keep physics enabled
        setTimeout(() => {
            state.logoElement.classList.remove('magnetic-snap');
            console.log('✅ Logo snapped back to original position with rotation reset');
        }, 300);
    }
    
    // Reset logo to original position (double-click)
    function resetLogoPosition() {
        console.log('🔄 Resetting logo position');
        snapToOriginalPosition();
    }
    
    // Update logo visual position
    function updateLogoPosition() {
        if (!state.logoElement) return;
        
        // Calculate offset from original position
        const offsetX = state.physics.position.x - state.physics.originalPosition.x;
        const offsetY = state.physics.position.y - state.physics.originalPosition.y;
        
        // Only apply transform if there's actual movement or rotation
        const hasMovement = Math.abs(offsetX) > 0.1 || Math.abs(offsetY) > 0.1;
        const hasRotation = Math.abs(state.physics.rotation) > 0.1;
        
        if (hasMovement || hasRotation) {
            const transform = `translate(${offsetX}px, ${offsetY}px) rotate(${state.physics.rotation}deg)`;
            state.logoElement.style.transform = transform;
            console.log('🎯 Applied transform:', transform);
        } else {
            // If no movement and no rotation, don't apply any transform
            console.log('🔒 No transform applied - logo stays in natural position');
        }
        
        // Debug logging for position updates
        if (state.physics.isDragging) {
            console.log('🎯 Logo updated - offset:', { 
                offsetX: offsetX.toFixed(2), 
                offsetY: offsetY.toFixed(2),
                rotation: state.physics.rotation.toFixed(1)
            });
        }
    }
    
    // Message handler
    function handleMessage(request, sender, sendResponse) {
        // Tab affinity check (optional)
        if (request.tabId && state.currentTabId && request.tabId !== state.currentTabId) {
            return; // Ignore messages for other tabs
        }
        
        if (request.action === 'copilot:busy') {
            const reason = request.reason || 'copilot-active';
            startSpinning(reason);
            sendResponse({ success: true, spinning: true });
        } else if (request.action === 'copilot:idle') {
            stopSpinning();
            sendResponse({ success: true, spinning: false });
        } else if (request.action === 'gelolabs:getStatus') {
            sendResponse({ 
                spinning: state.isSpinning, 
                logoFound: !!state.logoElement,
                reducedMotion: state.prefersReducedMotion,
                physicsEnabled: state.physics.enabled,
                physicsActive: state.physics.isPhysicsActive,
                isDragging: state.physics.isDragging
            });
        } else if (request.action === 'gelolabs:enablePhysics') {
            enablePhysics();
            sendResponse({ success: true, physicsEnabled: state.physics.enabled });
        } else if (request.action === 'gelolabs:disablePhysics') {
            disablePhysics();
            sendResponse({ success: true, physicsEnabled: state.physics.enabled });
        } else if (request.action === 'gelolabs:resetPosition') {
            resetLogoPosition();
            sendResponse({ success: true });
        } else if (request.action === 'gelolabs:setPosition') {
            // Allow manual position setting for debugging
            if (request.x && request.y) {
                state.physics.originalPosition.x = request.x;
                state.physics.originalPosition.y = request.y;
                state.physics.position.x = request.x;
                state.physics.position.y = request.y;
                updateLogoPosition();
                console.log('🎯 Position manually set to:', request.x, request.y);
                sendResponse({ success: true, position: state.physics.originalPosition });
            }
        }
    }
    
    // Get current tab ID
    function getCurrentTabId() {
        chrome.runtime.sendMessage({ action: 'getCurrentTabId' }, (response) => {
            if (response && response.tabId) {
                state.currentTabId = response.tabId;
            }
        });
    }
    
    // Initialize the script
    function initialize() {
        console.log('🚀 GeloLabs logo spinner initialized on:', window.location.hostname);
        console.log('🔍 Current URL:', window.location.href);
        console.log('📍 Script location: gelolabs-content.js');
        
        // Check if we're actually on gelolabs.com
        if (!window.location.hostname.includes('gelolabs.com')) {
            console.warn('⚠️ GeloLabs logo spinner loaded on wrong domain:', window.location.hostname);
            return;
        }
        
        console.log('✅ Domain check passed - proceeding with initialization');
        
        // Initialize components
        checkReducedMotion();
        injectStyles();
        setupNavigationHandlers();
        
        // Get current tab ID
        getCurrentTabId();
        
        // Find initial logo
        state.logoElement = findLogo();
        if (state.logoElement) {
            setupMutationObserver();
            // Auto-start spinning when page loads (demo mode)
            console.log('Auto-starting logo spinner for demo');
            startSpinning('page-load-demo');
        } else {
            // Start retry process
            retryFindLogo();
        }
        
        // Set up message listener
        chrome.runtime.onMessage.addListener(handleMessage);
        
        console.log('GeloLabs logo spinner ready');
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // Cleanup on unload
    window.addEventListener('beforeunload', () => {
        if (state.mutationObserver) {
            state.mutationObserver.disconnect();
        }
        if (state.failsafeTimer) {
            clearTimeout(state.failsafeTimer);
        }
    });
    
})();
