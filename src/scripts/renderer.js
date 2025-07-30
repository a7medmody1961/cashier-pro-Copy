import AppState from './core/app-state.js';
import { initClock } from './ui/clock.js';
import { initTheme } from './ui/theme.js';
import { initPageLoader } from './core/page-loader.js';
import { initSidebar } from './ui/sidebar.js';

// ** START: Modified functions for loading indicator **
/**
 * Shows the global loading overlay.
 * Adds 'visible' and 'opaque' classes for smooth transition and full coverage.
 */
export function showLoadingIndicator() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('visible'); // Make it display: flex and allow transition
        // Add a slight delay before making it opaque to ensure it's rendered
        setTimeout(() => {
            loadingOverlay.classList.add('opaque'); // Make it fully opaque
        }, 10); // Small delay, adjust if needed
    }
}

/**
 * Hides the global loading overlay.
 * Removes 'opaque' and 'visible' classes.
 */
export function hideLoadingIndicator() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('opaque'); // Start fading out
        // Wait for the fade-out transition to complete before setting display: none
        loadingOverlay.addEventListener('transitionend', function handler() {
            loadingOverlay.classList.remove('visible'); // Hide it completely
            loadingOverlay.removeEventListener('transitionend', handler);
        }, { once: true });
    }
}
// ** END: Modified functions for loading indicator **

document.addEventListener('DOMContentLoaded', () => {
    let clickSynth = null; // Initialize to null
    let isSoundEnabled = localStorage.getItem('isSoundEnabled') !== 'false'; 

    async function main() {
        console.log("Starting main application initialization...");
        
        showLoadingIndicator(); // Use the exported function
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

        buildSidebarNav(JSON.parse(currentUser.permissions));

        // Pass showLoadingIndicator and hideLoadingIndicator to initPageLoader
        const pageLoader = initPageLoader(appSettings, currentUser); 
        
        initSidebar(appSettings, currentUser);

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
        const availablePages = [
            { id: 'pos', icon: 'fa-cash-register', label: 'نقطة البيع' },
            { id: 'manage-products', icon: 'fa-boxes-stacked', label: 'المنتجات' },
            { id: 'manage-customers', icon: 'fa-users', label: 'العملاء' },
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
        navContainer.innerHTML = ''; 

        availablePages.forEach(page => {
            if (permissions && permissions[page.id]) { 
                const link = document.createElement('a'); 
                link.className = 'nav-btn';
                link.dataset.view = page.id; 
                link.innerHTML = `<i class="fa-solid ${page.icon} icon"></i> <span>${page.label}</span>`;
                navContainer.appendChild(link);
            }
        });
    }

    main().then(() => {
        document.getElementById('app-loader').style.display = 'none';
        document.querySelector('.app-layout').style.display = 'flex';
        initializeAudio(); 
        hideLoadingIndicator(); // Use the exported function
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
            loader.style.display = 'flex';
        }
        hideLoadingIndicator(); // Use the exported function
    });

    async function initializeAudio() {
        try {
            if (typeof Tone !== 'undefined') {
                if (Tone.context.state !== 'running') {
                    await Tone.start();
                    console.log("Audio context started.");
                } else {
                    console.log("Audio context already running.");
                }

                if (!clickSynth) {
                    clickSynth = new Tone.PolySynth(Tone.Synth, {
                        oscillator: { type: "triangle" },
                        envelope: { attack: 0.005, decay: 0.1, sustain: 0.05, release: 0.2 }
                    }).toDestination();
                    console.log("clickSynth initialized.");
                }
            } else {
                console.warn("Tone.js is not loaded. Sound effects will be disabled.");
                isSoundEnabled = false; 
            }

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

    function updateSoundToggleButton() {
        const soundToggleButton = document.getElementById('sound-toggle-btn');
        if (soundToggleButton) {
            soundToggleButton.innerHTML = isSoundEnabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
        }
    }

    window.api.onTriggerSound((soundName) => {
        playSoundEffect(soundName);
    });

    document.addEventListener('click', (event) => {
        const targetButton = event.target.closest('#sound-toggle-btn');
        if (targetButton) {
            isSoundEnabled = !isSoundEnabled;
            localStorage.setItem('isSoundEnabled', isSoundEnabled);
            updateSoundToggleButton();
            if (isSoundEnabled) {
                initializeAudio(); 
                console.log("Sound enabled.");
            } else {
                console.log("Sound disabled.");
            }
        }
    });
    updateSoundToggleButton(); 

});
