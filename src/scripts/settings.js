const currencySymbols = {
    "USD": "$",
    "EUR": "€",
    "GBP": "£",
    "JPY": "¥",
    "CHF": "CHF",
    "CAD": "C$",
    "AUD": "A$",
    "CNY": "¥",
    "INR": "₹",
    "BRL": "R$",
    "RUB": "₽",
    "MXN": "Mex$",
    "SGD": "S$",
    "HKD": "HK$",
    "KRW": "₩",
    "ZAR": "R",
    "TRY": "₺",
    "SEK": "kr",
    "NOK": "kr",
    "DKK": "kr",
    "PLN": "zł",
    "HUF": "Ft",
    "CZK": "Kč",
    "NZD": "NZ$",
    "PHP": "₱",
    "THB": "฿",
    "IDR": "Rp",
    "MYR": "RM",
    "VND": "₫",
    "EGP": "ج.م",
    "SAR": "ر.س",
    "AED": "د.إ",
    "KWD": "د.ك",
    "BHD": "د.ب",
    "OMR": "ر.ع",
    "QAR": "ر.ق",
    "JOD": "د.أ",
    "LBP": "ل.ل",
    "SYP": "ل.س",
    "IQD": "ع.د",
    "DZD": "د.ج",
    "MAD": "د.م",
    "TND": "د.ت",

};

export function init() {
    console.log("Settings script initialized.");

    const form = document.getElementById('settings-form');
    if (!form) return;

    const inputs = form.querySelectorAll('input, select');
    let settings = {};

    async function loadSettings() {
        try {
            settings = await window.api.getSettings();
            inputs.forEach(input => {
                if (settings.hasOwnProperty(input.id)) {
                    // تأكد من تعيين القيمة بشكل صحيح لعناصر select
                    if (input.tagName === 'SELECT') {
                        // تحقق مما إذا كانت القيمة موجودة كخيار قبل التعيين
                        const optionExists = Array.from(input.options).some(option => option.value === settings[input.id]);
                        if (optionExists) {
                            input.value = settings[input.id];
                        } else {
                            // إذا كانت القيمة المحفوظة غير موجودة كخيار، يمكن تعيين قيمة افتراضية
                            // أو تركها كما هي (عادة ما تكون أول خيار في القائمة)
                            console.warn(`Currency value "${settings[input.id]}" not found in dropdown options. Defaulting to first option.`);
                        }
                    } else {
                        input.value = settings[input.id];
                    }
                }
            });
        } catch (error) {
            console.error('Failed to load settings:', error);
            Swal.fire('خطأ', 'فشل تحميل الإعدادات.', 'error');
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updatedSettings = {};

        inputs.forEach(input => {
            updatedSettings[input.id] = input.value;
        });

        try {
            await window.api.updateSettings(updatedSettings);
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

    loadSettings();
}

// تصدير كائن currencySymbols ليتم استخدامه في ملفات أخرى
export { currencySymbols };
