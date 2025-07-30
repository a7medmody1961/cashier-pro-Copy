const pageScripts = {
    'pos': () => import('../pos-view.js'),
    'manage-products': () => import('../manage-products.js'),
    'manage-users': () => import('../manage-users.js'),
    'manage-customers': () => import('../manage-customers.js'),
    'manage-expenses': () => import('../manage-expenses.js'),
    'reports': () => import('../reports.js'),
    'settings': () => import('../settings.js'),
    'manage-salespersons': () => import('../manage-salespersons.js'),
    // NEW: Add the shift-history page script
    'shift-history': () => import('../shift-history.js'), 
};

export function initPageLoader(appSettings, currentUser) { // Added currentUser parameter
    const mainContent = document.getElementById('main-content');
    const navButtons = document.querySelectorAll('#main-nav .nav-btn');

    /**
     * Navigates to a specific page, loading its HTML and initializing its script.
     * @param {string} pageName - The name of the page to navigate to.
     */
    async function navigateTo(pageName) {
        try {
            // Show loader before fetching new content
            document.getElementById('app-loader').style.display = 'flex';
            document.querySelector('.app-layout').style.display = 'none'; // Hide layout during loading

            // Check if pageName is valid before attempting to load
            if (!pageName || typeof pageName !== 'string') {
                throw new Error("Invalid page name provided.");
            }

            const pageHtml = await window.api.getPageHtml(pageName);
            mainContent.innerHTML = pageHtml;

            // Check if a script needs to be initialized for the page
            if (pageScripts[pageName]) {
                const pageModule = await pageScripts[pageName]();
                if (pageModule.init) {
                    // Pass appSettings and currentUser if the page script needs it
                    pageModule.init(appSettings, currentUser); 
                }
            }

            // Update active state for navigation buttons
            navButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === pageName); 
            });

            // Hide loader after content is loaded and script initialized
            document.getElementById('app-loader').style.display = 'none';
            document.querySelector('.app-layout').style.display = 'flex'; // Show layout after loading

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
            // Hide loader even on error, and show the main layout to display the error message
            document.getElementById('app-loader').style.display = 'none';
            document.querySelector('.app-layout').style.display = 'flex'; 

            // Display an error message to the user using SweetAlert2 if available
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
            // Prevent default link behavior
            event.preventDefault(); 
            // Use dataset.view to get the page name
            navigateTo(button.dataset.view); 
        });
    });

    // Return the navigateTo function for initial navigation
    return { navigateTo };
}
