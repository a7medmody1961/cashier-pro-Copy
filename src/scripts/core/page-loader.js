import { showLoadingIndicator, hideLoadingIndicator } from '../renderer.js'; // Import the new functions
import { init as initManageProducts } from '../manage-products.js';
import { init as initPosView } from '../pos-view.js';
import { init as initManageUsers } from '../manage-users.js';
import { init as initManageCustomers } from '../manage-customers.js';
import { init as initManageExpenses } from '../manage-expenses.js';
import { init as initReports } from '../reports.js';
import { init as initSettings } from '../settings.js';
import { init as initManageSalespersons } from '../manage-salespersons.js';
import { init as initShiftHistory } from '../shift-history.js';

const pageScripts = {
    'pos': initPosView,
    'manage-products': initManageProducts,
    'manage-users': initManageUsers,
    'manage-customers': initManageCustomers,
    'manage-expenses': initManageExpenses,
    'reports': initReports,
    'settings': initSettings,
    'manage-salespersons': initManageSalespersons,
    'shift-history': initShiftHistory,
};

// Store current listeners to be cleaned up
let currentListeners = [];

export function initPageLoader(appSettings, currentUser) {
    const mainContent = document.getElementById('main-content');
    const navButtons = document.querySelectorAll('#main-nav .nav-btn');

    // ** New function to remove all current event listeners **
    function cleanupListeners() {
        if (currentListeners.length > 0) {
            console.log(`Cleaning up ${currentListeners.length} event listeners...`);
            currentListeners.forEach(({ channel, handler }) => {
                // Use the new removeListener function exposed by preload.js
                window.api.removeListener(channel, handler);
            });
            currentListeners = [];
        }
    }

    /**
     * Navigates to a specific page, loading its HTML and initializing its script.
     * @param {string} pageName - The name of the page to navigate to.
     */
    async function navigateTo(pageName) {
        try {
            showLoadingIndicator();

            if (!pageName || typeof pageName !== 'string') {
                throw new Error("Invalid page name provided.");
            }
            
            // Clean up old listeners before loading new page
            cleanupListeners();

            // Fetch HTML and load script
            const pageHtml = await window.api.getPageHtml(pageName);
            mainContent.innerHTML = pageHtml;

            if (pageScripts[pageName]) {
                const pageModule = pageScripts[pageName];
                const newListeners = [];
                // Pass a listener registration function to the init script
                pageModule(appSettings, currentUser, (channel, handler) => {
                    newListeners.push({ channel, handler });
                    window.api.on(channel, handler);
                });
                currentListeners = newListeners;
            }

            navButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === pageName);
            });

            setTimeout(() => {
                hideLoadingIndicator();
            }, 100);

        } catch (error) {
            console.error(`Failed to navigate to ${pageName}:`, error);
            mainContent.innerHTML = `
                <div class="error-message-container">
                    <h1>خطأ في تحميل الصفحة</h1>
                    <p>لم يتمكن النظام من تحميل صفحة ${pageName}.html.</p>
                    <p>الخطأ: ${error.message}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">إعادة تحميل التطبيق</button>
                </div>
            `;
            setTimeout(() => {
                hideLoadingIndicator();
            }, 100);

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'خطأ في التحميل',
                    text: `فشل تحميل صفحة ${pageName}: ${error.message}`,
                    confirmButtonText: 'حسناً'
                });
            }
        }
    }
    
    // Add event listeners to navigation buttons
    navButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            navigateTo(button.dataset.view);
        });
    });

    return { navigateTo };
}
