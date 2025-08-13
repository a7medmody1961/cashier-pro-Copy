// src/scripts/ui/modal-helpers.js

/**
 * Shows a preview modal with custom HTML content.
 * @param {string} title - The title of the modal.
 * @param {string} htmlContent - The HTML content to display inside the modal.
 */
export function showPreviewModal(title, htmlContent) {
    Swal.fire({
        title: title,
        html: htmlContent,
        width: '800px',
        showCloseButton: true,
        confirmButtonText: '<i class="fa-solid fa-print"></i> طباعة',
        confirmButtonColor: '#2563eb',
        denyButtonText: 'إغلاق',
        showDenyButton: true,
    }).then((result) => {
        if (result.isConfirmed) {
            printModalContent(htmlContent);
        }
    });
}

/**
 * Prints the provided HTML content in a hidden iframe.
 * @param {string} htmlContent - The HTML content to be printed.
 */
function printModalContent(htmlContent) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;
    // Collect all existing CSS from the main document to apply to the iframe
    const allCSS = Array.from(document.styleSheets).map(sheet => {
        try {
            // If it's an external stylesheet, use its href
            return sheet.href ? `<link rel="stylesheet" href="${sheet.href}">` :
                   // If it's an inline stylesheet, get its rules
                   `<style>${Array.from(sheet.cssRules).map(rule => rule.cssText).join('')}</style>`;
        } catch (e) {
            // Handle cross-origin errors for external stylesheets
            if (sheet.href) return `<link rel="stylesheet" href="${sheet.href}">`;
            return '';
        }
    }).join('');

    iframeDoc.open();
    iframeDoc.write(`<html><head><title>طباعة</title>${allCSS}<style>@media print{body{-webkit-print-color-adjust: exact;}.receipt-box,.shift-summary-box{margin:0;border:none;box-shadow:none;}}</style></head><body dir="rtl" onload="window.focus();window.print();">${htmlContent}</body></html>`);
    iframeDoc.close();

    // Remove the iframe after a short delay
    setTimeout(() => { document.body.removeChild(iframe); }, 2000);
}

/**
 * Shows a full-screen loading overlay.
 * @param {string} message - The message to display (optional).
 */
export function showLoadingOverlay(message = 'جاري التحميل...') {
    let loadingOverlay = document.getElementById('global-loading-overlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'global-loading-overlay';
        loadingOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50 text-white';
        loadingOverlay.innerHTML = `
            <div class="loader-spinner mb-4"></div>
            <p id="loading-message" class="text-lg">${message}</p>
        `;
        document.body.appendChild(loadingOverlay);
    } else {
        document.getElementById('loading-message').textContent = message;
        loadingOverlay.style.display = 'flex';
    }
}

/**
 * Hides the full-screen loading overlay.
 */
export function hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('global-loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

/**
 * Shows a success toast notification using SweetAlert2.
 * @param {string} title - The title of the toast.
 * @param {string} text - The message body of the toast.
 */
export function showSuccessToast(title, text) {
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: title,
        text: text,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });
}

/**
 * Shows an error toast notification using SweetAlert2.
 * @param {string} title - The title of the toast.
 * @param {string} text - The message body of the toast.
 */
export function showErrorToast(title, text) {
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: title,
        text: text,
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });
}

/**
 * Shows a confirmation dialog using SweetAlert2.
 * @param {string} title - The title of the dialog.
 * @param {string} text - The message body of the dialog.
 * @param {string} icon - The icon for the dialog (e.g., 'warning', 'info', 'question').
 * @param {string} confirmButtonText - Text for the confirmation button.
 * @returns {Promise<SweetAlertResult>} - A promise that resolves with the result of the dialog.
 */
export function showConfirmationDialog(title, text, icon = 'warning', confirmButtonText = 'نعم') {
    return Swal.fire({
        title: title,
        text: text,
        icon: icon,
        showCancelButton: true,
        confirmButtonColor: '#dc3545', // Red color for danger actions
        cancelButtonText: 'إلغاء',
        confirmButtonText: confirmButtonText
    });
}