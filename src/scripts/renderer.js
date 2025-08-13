import AppState from './core/app-state.js';
import { initClock } from './ui/clock.js';
import { initTheme } from './ui/theme.js';
import { initPageLoader } from './core/page-loader.js';
import { initSidebar } from './ui/sidebar.js';


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

/**
 * Formats a number as a currency string.
 * @param {number} amount - The number to format.
 * @returns {string} The formatted currency string.
 */
export function formatCurrency(amount) {
    const appSettings = AppState.getSettings();
    const currency = appSettings?.currency || 'EGP';
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: currency }).format(amount || 0);
}


document.addEventListener('DOMContentLoaded', () => {
    let clickSynth = null; // Initialize to null
    let isSoundEnabled = localStorage.getItem('isSoundEnabled') !== 'false';

    async function main() {
        console.log("Starting main application initialization...");
        
        showLoadingIndicator(); 
        const appSettings = await window.api.getSettings();
        AppState.setSettings(appSettings); 

        initClock();
        initTheme(); 

        const currentUser = await window.api.getCurrentUser();

        if (!currentUser) {
            console.error("No logged-in user found. Forcing logout.");
            window.api.logout();
            return;
        }

        AppState.setCurrentUser(currentUser);
        
        // **التعديل هنا: استدعاء الدالة الجديدة لتحديث الهيدر**
        updateUserInfoHeader(currentUser); 

        buildSidebarNav(JSON.parse(currentUser.permissions));

        const pageLoader = initPageLoader(appSettings, currentUser);
        
        initSidebar(appSettings, currentUser);

        await pageLoader.navigateTo('pos');
        console.log("Application initialization complete.");
    }

    /**
     * Dynamically builds the sidebar navigation based on user permissions.
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
            { id: 'reports', icon: 'fa-chart-line', label: 'المبيعات والفواتير' },
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

    /**
     * **الدالة الجديدة: تحديث معلومات المستخدم في الهيدر**
     * @param {object} user - The logged-in user object.
     */
    function updateUserInfoHeader(user) {
        const userInfoContainer = document.getElementById('user-info');
        if (!userInfoContainer || !user) {
            console.warn('User info container or user object not found.');
            return;
        }

        const avatarPath = user.avatar ? `../assets/avatars/${user.avatar}` : '../assets/avatars/default-avatar.png';
        const roleText = user.role === 'Admin' ? 'مدير' : 'كاشير';
        const roleClass = user.role === 'Admin' ? 'admin' : 'cashier';

        userInfoContainer.innerHTML = `
            <div class="user-details">
                <span class="user-name">${user.username}</span>
                <span class="role-badge ${roleClass}">${roleText}</span>
            </div>
            <img src="${avatarPath}" alt="${user.username}" class="header-avatar" onerror="this.onerror=null;this.src='../assets/avatars/default-avatar.png';">
        `;
    }

    main().then(() => {
        document.getElementById('app-loader').style.display = 'none';
        document.querySelector('.app-layout').style.display = 'flex';
        initializeAudio();
        hideLoadingIndicator();
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
        hideLoadingIndicator();
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
            isSoundEnabled = false;
            updateSoundToggleButton();
        }
    }

    function playSoundEffect(soundName) {
        if (!isSoundEnabled || !clickSynth) return;
        switch (soundName) {
            case 'add-to-cart': clickSynth.triggerAttackRelease("C5", "8n"); break;
            case 'sale-complete': clickSynth.triggerAttackRelease(["C4", "E4", "G4"], "4n"); break;
            case 'error': clickSynth.triggerAttackRelease("C3", "8n"); break;
            case 'shift-start': clickSynth.triggerAttackRelease("C4", "16n"); break;
            case 'shift-end': clickSynth.triggerAttackRelease("G3", "16n"); break;
            default: console.warn("Unknown sound effect:", soundName);
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
        if (event.target.closest('#sound-toggle-btn')) {
            isSoundEnabled = !isSoundEnabled;
            localStorage.setItem('isSoundEnabled', isSoundEnabled);
            updateSoundToggleButton();
            if (isSoundEnabled) initializeAudio();
        }
    });
    
    updateSoundToggleButton();
});
