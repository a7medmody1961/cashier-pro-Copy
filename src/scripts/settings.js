const currencySymbols = {
    "USD": "$", "EUR": "€", "GBP": "£", "JPY": "¥", "CHF": "CHF", "CAD": "C$",
    "AUD": "A$", "CNY": "¥", "INR": "₹", "BRL": "R$", "RUB": "₽", "MXN": "Mex$",
    "SGD": "S$", "HKD": "HK$", "KRW": "₩", "ZAR": "R", "TRY": "₺", "SEK": "kr",
    "NOK": "kr", "DKK": "kr", "PLN": "zł", "HUF": "Ft", "CZK": "Kč", "NZD": "NZ$",
    "PHP": "₱", "THB": "฿", "IDR": "Rp", "MYR": "RM", "VND": "₫", "EGP": "ج.م",
    "SAR": "ر.س", "AED": "د.إ", "KWD": "د.ك", "BHD": "د.ب", "OMR": "ر.ع",
    "QAR": "QAR (ر.ق)", "JOD": "JOD (د.أ)", "LBP": "LBP (ل.ل)", "SYP": "SYP (ل.س)", "IQD": "IQD (ع.د)",
    "DZD": "DZD (د.ج)", "MAD": "MAD (د.م)", "TND": "TND (د.ت)",
};

export function init(appSettings, currentUser) { // currentUser is now used for permissions
    console.log("Settings script initialized.");

    const form = document.getElementById('settings-form');
    if (!form) return;

    const generalInputs = form.querySelectorAll('.general-settings input, .general-settings select');
    const loyaltyInputs = form.querySelectorAll('.loyalty-settings input');

    const permissionsContainer = document.getElementById('permissions-checkboxes');

    // Define all permissions that can be managed in settings
    const allPermissions = [
        { id: 'pos', label: 'نقطة البيع' },
        { id: 'manage-products', label: 'إدارة المنتجات' },
        { id: 'manage-customers', label: 'إدارة العملاء' },
        { id: 'manage-salespersons', label: 'إدارة البائعين' },
        { id: 'manage-expenses', label: 'إدارة المصروفات' },
        { id: 'reports', label: 'المبيعات والفواتير' },
        { id: 'manage-users', label: 'إدارة المستخدمين' },
        { id: 'shift-history', label: 'سجل الورديات' }, 
        { id: 'settings', label: 'الإعدادات' },
    ];

    // Function to dynamically build permissions section
    function buildPermissionsSection() {
        if (permissionsContainer) {
            permissionsContainer.innerHTML = ''; // Clear existing
            allPermissions.forEach(perm => {
                const div = document.createElement('div');
                div.className = 'form-group checkbox-group';
                div.innerHTML = `
                    <input type="checkbox" id="permission-${perm.id}" data-permission-id="${perm.id}">
                    <label for="permission-${perm.id}">${perm.label}</label>
                `;
                permissionsContainer.appendChild(div);
            });
        }
    }

    async function loadSettings() {
        try {
            const settings = await window.api.getSettings();
            
            generalInputs.forEach(input => {
                if (settings.hasOwnProperty(input.id)) {
                    if (input.tagName === 'SELECT') {
                        const optionExists = Array.from(input.options).some(option => option.value === settings[input.id]);
                        if (optionExists) {
                            input.value = settings[input.id];
                        } else {
                            console.warn(`Setting value "${settings[input.id]}" for ${input.id} not found in dropdown options. Defaulting to first option.`);
                        }
                    } else {
                        input.value = settings[input.id];
                    }
                }
            });

            loyaltyInputs.forEach(input => {
                if (settings.hasOwnProperty(input.id)) {
                    input.value = settings[input.id];
                }
            });

            if (currentUser && currentUser.role === 'Admin' && permissionsContainer) {
                const userPermissions = JSON.parse(currentUser.permissions || '{}');
                allPermissions.forEach(perm => {
                    const checkbox = permissionsContainer.querySelector(`#permission-${perm.id}`);
                    if (checkbox) {
                        checkbox.checked = userPermissions[perm.id] === true;
                    }
                });
            }

        } catch (error) {
            console.error('Failed to load settings:', error);
            Swal.fire('خطأ', 'فشل تحميل الإعدادات.', 'error');
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updatedSettings = {};

        generalInputs.forEach(input => {
            updatedSettings[input.id] = input.value;
        });
        loyaltyInputs.forEach(input => {
            updatedSettings[input.id] = input.value;
        });

        // Gather permissions if the section is active and current user is Admin
        const updatedPermissions = {};
        if (currentUser && currentUser.role === 'Admin' && permissionsContainer) {
            permissionsContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                updatedPermissions[checkbox.dataset.permissionId] = checkbox.checked;
            });
        }

        try {
            await window.api.updateSettings(updatedSettings);

            // If permissions were gathered, update the current user's permissions
            if (currentUser && currentUser.role === 'Admin' && permissionsContainer) {
                // Call an IPC handler to update the current user's permissions
                // This handler needs to be added in main-process/user-handlers.js and exposed in preload.js
                await window.api.updateUserPermissions(currentUser.id, updatedPermissions);
                
                // Fetch the updated user data and set it in AppState
                const updatedUser = await window.api.getCurrentUser();
                AppState.setCurrentUser(updatedUser);


            }

            Swal.fire({
                icon: 'success',
                title: 'تم الحفظ',
                text: 'تم تحديث الإعدادات بنجاح. قد يتطلب بعض التغييرات إعادة تشغيل البرنامج.',
                timer: 3000,
                showConfirmButton: false
            });

        } catch (error) {
            console.error('Failed to save settings:', error);
            Swal.fire('خطأ', 'فشل حفظ الإعدادات.', 'error');
        }
    });

    // Build permissions section when the page initializes
    buildPermissionsSection();
    // Load settings and permissions after building the section
    loadSettings(); 
}

export { currencySymbols };
