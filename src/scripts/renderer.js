import AppState from './core/app-state.js';
import { initClock } from './ui/clock.js';
import { initTheme } from './ui/theme.js';
import { initPageLoader } from './core/page-loader.js';
import { initSidebar } from './ui/sidebar.js';
// Tone.js is loaded globally via <script> tag in index.html, no import needed here.

document.addEventListener('DOMContentLoaded', () => {
    let clickSynth = null; // Initialize to null
    // Load sound preference, default to true if not set
    let isSoundEnabled = localStorage.getItem('isSoundEnabled') !== 'false'; 

    async function main() {
        console.log("Starting main application initialization...");

        const appSettings = await window.api.getSettings();
        
        initClock();
        initTheme(); // Initialize theme, which also handles language switcher

        const currentUser = await window.api.getCurrentUser();

        if (!currentUser) {
            console.error("No logged-in user found. Forcing logout.");
            window.api.logout();
            return;
        }

        AppState.setCurrentUser(currentUser);

        // Build the sidebar navigation based on user permissions
        buildSidebarNav(JSON.parse(currentUser.permissions));

        // Initialize the page loader (now correctly configured to handle data-view)
        const pageLoader = initPageLoader(appSettings, currentUser);
        
        // Initialize the sidebar (if it has specific functionalities beyond navigation)
        initSidebar(appSettings, currentUser);

        // Navigate to the default page (e.g., 'pos') after everything is set up
        await pageLoader.navigateTo('pos'); 
        console.log("Application initialization complete.");
    }

    /**
     * Dynamically builds the sidebar navigation based on user permissions.
     * It creates <a> tags with data-view attributes for page loading.
     * @param {object} permissions - The permissions object for the current user.
     */
    function buildSidebarNav(permissions) {
        const navContainer = document.getElementById('main-nav');
        // Define all available pages and their properties
        const availablePages = [
            { id: 'pos', icon: 'fa-cash-register', label: 'نقطة البيع' },
            { id: 'manage-products', icon: 'fa-boxes-stacked', label: 'المنتجات' },
            { id: 'manage-customers', icon: 'fa-users', label: 'العملاء' },
            // UPDATED: Changed label to "البائعين" for consistency
            { id: 'manage-salespersons', icon: 'fa-user-tie', label: 'البائعين' }, 
            { id: 'manage-expenses', icon: 'fa-file-invoice-dollar', label: 'المصروفات' },
            { id: 'reports', icon: 'fa-chart-line', label: 'التقارير' },
            { id: 'manage-users', icon: 'fa-user-gear', label: 'المستخدمين' },
            { id: 'shift-history', icon: 'fa-history', label: 'سجل الورديات' }, 
            { id: 'settings', icon: 'fa-gear', label: 'الإعدادات' },
        ];

        if (!navContainer) {
            console.error("Navigation container #main-nav not found.");
            return;
        }
        navContainer.innerHTML = ''; // Clear existing navigation items

        // Create navigation links based on permissions
        availablePages.forEach(page => {
            // Check if the user has permission for this page
            if (permissions && permissions[page.id]) { 
                const link = document.createElement('a'); // Create <a> tag
                link.className = 'nav-btn';
                link.dataset.view = page.id; // Use data-view to match page-loader.js
                link.innerHTML = `<i class="fa-solid ${page.icon} icon"></i> <span>${page.label}</span>`;
                navContainer.appendChild(link);
            }
        });
    }

    // Call main initialization function
    main().then(() => {
        // Hide loader and show app layout after successful initialization
        document.getElementById('app-loader').style.display = 'none';
        document.querySelector('.app-layout').style.display = 'flex';
        // Initialize audio after the main app is loaded and visible
        initializeAudio(); 
    }).catch(error => {
        console.error("Fatal error during application startup:", error);
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.innerHTML = `
                <div class="error-message-container">
                    <h1>حدث خطأ فادح</h1>
                    <p>لا يمكن تشغيل التطبيق. يرجى إعادة المحاولة.</p>
                    <p style="color: red; text-align: left; direction: ltr;">${error.message}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">إعادة تحميل التطبيق</button>
                </div>
            `;
            loader.style.display = 'flex'; // Ensure loader is visible to show error
        }
    });

    // Audio initialization and sound effects
    async function initializeAudio() {
        try {
            // Check if Tone.js is loaded and context is not already running
            if (typeof Tone !== 'undefined') {
                if (Tone.context.state !== 'running') {
                    await Tone.start();
                    console.log("Audio context started.");
                } else {
                    console.log("Audio context already running.");
                }

                if (!clickSynth) { // Only create synth if it doesn't exist
                    clickSynth = new Tone.PolySynth(Tone.Synth, {
                        oscillator: { type: "triangle" },
                        envelope: { attack: 0.005, decay: 0.1, sustain: 0.05, release: 0.2 }
                    }).toDestination();
                    console.log("clickSynth initialized.");
                }
            } else {
                console.warn("Tone.js is not loaded. Sound effects will be disabled.");
                isSoundEnabled = false; // Disable sound if Tone.js is not available
            }

            // Set initial state of the sound toggle button
            updateSoundToggleButton();

        } catch (error) {
            console.error("Error initializing Tone.js:", error);
            isSoundEnabled = false; // Disable sound on error
            updateSoundToggleButton();
        }
    }

    /**
     * Plays a specific sound effect if sound is enabled.
     * @param {string} soundName - The name of the sound to play (e.g., 'add-to-cart', 'sale-complete').
     */
    function playSoundEffect(soundName) {
        if (!isSoundEnabled) {
            // console.log("Sound is disabled. Not playing:", soundName);
            return;
        }
        if (!clickSynth) {
            console.warn("Audio not initialized (clickSynth is null). Cannot play sound:", soundName);
            return;
        }

        switch (soundName) {
            case 'add-to-cart':
                clickSynth.triggerAttackRelease("C5", "8n"); // صوت قصير عند إضافة منتج
                break;
            case 'sale-complete':
                clickSynth.triggerAttackRelease(["C4", "E4", "G4"], "4n"); // وتر عند إتمام البيع
                break;
            case 'error':
                clickSynth.triggerAttackRelease("C3", "8n"); // صوت خطأ
                break;
            case 'shift-start':
                clickSynth.triggerAttackRelease("C4", "16n"); // صوت عند بدء الوردية (يمكنك تغيير النغمة أو المدة)
                break;
            case 'shift-end':
                clickSynth.triggerAttackRelease("G3", "16n"); // صوت عند إنهاء الوردية (يمكنك تغيير النغمة أو المدة)
                break;
            default:
                console.warn("Unknown sound effect:", soundName);
        }
    }

    // Function to update the sound toggle button's icon
    function updateSoundToggleButton() {
        const soundToggleButton = document.getElementById('sound-toggle-btn');
        if (soundToggleButton) {
            soundToggleButton.innerHTML = isSoundEnabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
        }
    }

    // Listen for 'trigger-sound' event from the main process
    window.api.onTriggerSound((soundName) => {
        playSoundEffect(soundName);
    });

    // Event listener for the sound toggle button
    // Using a delegated event listener on document to catch clicks on dynamically loaded content
    document.addEventListener('click', (event) => {
        const targetButton = event.target.closest('#sound-toggle-btn');
        if (targetButton) {
            isSoundEnabled = !isSoundEnabled;
            localStorage.setItem('isSoundEnabled', isSoundEnabled);
            updateSoundToggleButton();
            if (isSoundEnabled) {
                // If sound is enabled, try to initialize audio if not already
                initializeAudio(); 
                console.log("Sound enabled.");
            } else {
                console.log("Sound disabled.");
            }
        }
    });

    // Initial call to update button state when DOM is ready (before main() finishes)
    // This ensures the button icon is correct on load even if main() takes time.
    updateSoundToggleButton(); 
    // No need for DOMContentLoaded listener here, as main() is already wrapped in it.
    // The main() function will call initializeAudio() at the end.
});
