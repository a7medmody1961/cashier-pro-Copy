import { showLoadingIndicator, hideLoadingIndicator } from '../renderer.js'; // Import the new functions

const pageScripts = {
    'pos': () => import('../pos-view.js'),
    'manage-products': () => import('../manage-products.js'),
    'manage-users': () => import('../manage-users.js'),
    'manage-customers': () => import('../manage-customers.js'),
    'manage-expenses': () => import('../manage-expenses.js'),
    'reports': () => import('../reports.js'),
    'settings': () => import('../settings.js'),
    'manage-salespersons': () => import('../manage-salespersons.js'),
    'shift-history': () => import('../shift-history.js'), 
};

export function initPageLoader(appSettings, currentUser) { 
    const mainContent = document.getElementById('main-content');
    const navButtons = document.querySelectorAll('#main-nav .nav-btn');

    /**
     * Navigates to a specific page, loading its HTML and initializing its script.
     * @param {string} pageName - The name of the page to navigate to.
     */
    async function navigateTo(pageName) {
        try {
            // Show the loading indicator immediately.
            showLoadingIndicator(); 

            if (!pageName || typeof pageName !== 'string') {
                throw new Error("Invalid page name provided.");
            }

            // Fetch HTML and load script
            const pageHtml = await window.api.getPageHtml(pageName);
            mainContent.innerHTML = pageHtml; // Update content *behind* the overlay

            if (pageScripts[pageName]) {
                const pageModule = await pageScripts[pageName]();
                if (pageModule.init) {
                    pageModule.init(appSettings, currentUser); 
                }
            }

            // Update active state for navigation buttons
            navButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === pageName); 
            });

            // Add a small delay before hiding the loading indicator
            // This ensures the new content has time to render and paint
            setTimeout(() => {
                hideLoadingIndicator(); 
            }, 100); // 100ms delay, adjust if needed for smoother feel

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
            // Hide the loading indicator even on error
            setTimeout(() => {
                hideLoadingIndicator(); 
            }, 100); // 100ms delay, adjust if needed

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
