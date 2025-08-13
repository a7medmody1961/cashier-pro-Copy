// File: src/scripts/shift-history.js
let eventListeners = [];
let ipcListeners = [];
let shiftsTableBody;
let shiftDetailsModal;
let modalCloseButtons;
let detailUsername;
let detailStartTime;
let detailEndTime;
let detailStartingCash;
let detailEndingCash;
let detailTotalSales;
let modalShiftId;
let shiftSalesTableBody;
let shiftExpensesTableBody;

function setupShiftHistoryPage() {
    shiftsTableBody = document.getElementById('shifts-table-body');
    shiftDetailsModal = document.getElementById('shiftDetailsModal');
    
    // Crucial check: if elements are not found, log error and return
    if (!shiftsTableBody || !shiftDetailsModal) {
        console.error("Required DOM elements for Shift History page not found. Cannot set up listeners.");
        return; // Exit if elements are missing
    }

    modalCloseButtons = shiftDetailsModal.querySelectorAll('.close-button');

    detailUsername = document.getElementById('detailUsername');
    detailStartTime = document.getElementById('detailStartTime');
    detailEndTime = document.getElementById('detailEndTime');
    detailStartingCash = document.getElementById('detailStartingCash');
    detailEndingCash = document.getElementById('detailEndingCash');
    detailTotalSales = document.getElementById('detailTotalSales');
    modalShiftId = document.getElementById('modalShiftId');

    shiftSalesTableBody = document.getElementById('shift-sales-table-body');
    shiftExpensesTableBody = document.getElementById('shift-expenses-table-body');

    // Attach event listeners to close buttons in the modal
    modalCloseButtons.forEach(button => {
        const handler = () => {
            shiftDetailsModal.style.display = 'none';
        };
        button.addEventListener('click', handler);
        eventListeners.push({ target: button, type: 'click', handler: handler });
    });

    // Close modal when clicking outside of it
    const handleWindowClick = (event) => {
        if (event.target === shiftDetailsModal) {
            shiftDetailsModal.style.display = 'none';
        }
    };
    window.addEventListener('click', handleWindowClick);
    eventListeners.push({ target: window, type: 'click', handler: handleWindowClick });

    // Attach event listeners to the "View Details" buttons (delegated to the table body)
    const handleViewDetailsClick = (event) => {
        const button = event.target.closest('.view-details-btn');
        if (button) {
            const shiftId = button.dataset.shiftId;
            showShiftDetails(shiftId);
        }
    };
    shiftsTableBody.addEventListener('click', handleViewDetailsClick);
    eventListeners.push({ target: shiftsTableBody, type: 'click', handler: handleViewDetailsClick });
}

async function loadClosedShifts() {
    // Ensure shiftsTableBody is defined before trying to use it
    if (!shiftsTableBody) {
        console.error("shiftsTableBody is not defined in loadClosedShifts. Ensure setupShiftHistoryPage() was called first.");
        return;
    }
    shiftsTableBody.innerHTML = '<tr><td colspan="9" class="text-center">جارٍ تحميل الورديات...</td></tr>'; // Loading message
    try {
        // Call the main process to get all closed shifts
        const shifts = await window.api.getAllClosedShifts(); 
        shiftsTableBody.innerHTML = ''; // Clear loading message

        if (shifts && shifts.length > 0) {
            shifts.forEach((shift, index) => {
                const row = shiftsTableBody.insertRow();
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${shift.username || 'غير معروف'}</td>
                    <td>${new Date(shift.start_time).toLocaleString('ar-EG')}</td>
                    <td>${shift.end_time ? new Date(shift.end_time).toLocaleString('ar-EG') : 'قيد العمل'}</td>
                    <td>${shift.starting_cash.toFixed(2)}</td>
                    <td>${shift.ending_cash ? shift.ending_cash.toFixed(2) : 'N/A'}</td>
                    <td>${shift.total_sales ? shift.total_sales.toFixed(2) : 'N/A'}</td>
                    <td><span class="status-badge ${shift.status === 'closed' ? 'status-closed' : 'status-open'}">${shift.status === 'closed' ? 'مغلقة' : 'مفتوحة'}</span></td>
                    <td>
                        <button class="btn btn-primary btn-sm view-details-btn" data-shift-id="${shift.id}">
                            <i class="fas fa-eye"></i> عرض التفاصيل
                        </button>
                    </td>
                `;
            });
        } else {
            shiftsTableBody.innerHTML = '<tr><td colspan="9" class="text-center">لا توجد ورديات مغلقة لعرضها.</td></tr>';
        }
    } catch (error) {
        console.error('Failed to load closed shifts:', error);
        shiftsTableBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">حدث خطأ أثناء تحميل الورديات.</td></tr>';
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'فشل تحميل سجل الورديات: ' + error.message,
                confirmButtonText: 'حسناً'
            });
        }
    }
}

/**
 * Fetches and displays details for a specific shift in a modal.
 * @param {number} shiftId - The ID of the shift to display.
 */
async function showShiftDetails(shiftId) {
    // Ensure modal elements are defined
    if (!detailUsername) { // Check any of the modal elements
        console.error("Modal detail elements are not defined. Ensure setupShiftHistoryPage() was called first.");
        return;
    }
    try {
        const { shift, sales, expenses } = await window.api.getShiftDetails(shiftId);

        if (shift) {
            modalShiftId.textContent = shift.id;
            detailUsername.textContent = shift.username || 'غير معروف';
            detailStartTime.textContent = new Date(shift.start_time).toLocaleString('ar-EG');
            detailEndTime.textContent = shift.end_time ? new Date(shift.end_time).toLocaleString('ar-EG') : 'قيد العمل';
            detailStartingCash.textContent = shift.starting_cash.toFixed(2);
            detailEndingCash.textContent = shift.ending_cash ? shift.ending_cash.toFixed(2) : 'N/A';
            detailTotalSales.textContent = shift.total_sales ? shift.total_sales.toFixed(2) : 'N/A';

            shiftSalesTableBody.innerHTML = '';
            if (sales && sales.length > 0) {
                sales.forEach(sale => {
                    const row = shiftSalesTableBody.insertRow();
                    row.innerHTML = `
                        <td>${sale.id}</td>
                        <td>${sale.customer_id ? `ID: ${sale.customer_id}` : 'لا يوجد'}</td>
                        <td>${sale.total_amount.toFixed(2)}</td>
                        <td>${sale.payment_method}</td>
                        <td>${new Date(sale.created_at).toLocaleString('ar-EG')}</td>
                    `;
                });
            } else {
                shiftSalesTableBody.innerHTML = '<tr><td colspan="5" class="text-center">لا توجد مبيعات لهذه الوردية.</td></tr>';
            }

            shiftExpensesTableBody.innerHTML = '';
            if (expenses && expenses.length > 0) {
                expenses.forEach(expense => {
                    const row = shiftExpensesTableBody.insertRow();
                    row.innerHTML = `
                        <td>${expense.description}</td>
                        <td>${expense.amount.toFixed(2)}</td>
                        <td>${expense.category || 'عام'}</td>
                        <td>${new Date(expense.created_at).toLocaleString('ar-EG')}</td>
                    `;
                });
            } else {
                shiftExpensesTableBody.innerHTML = '<tr><td colspan="4" class="text-center">لا توجد مصروفات لهذه الوردية.</td></tr>';
            }

            shiftDetailsModal.style.display = 'block';
        } else {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'warning',
                    title: 'لم يتم العثور على الوردية',
                    text: 'لم يتم العثور على تفاصيل الوردية المطلوبة.',
                    confirmButtonText: 'حسناً'
                });
            }
        }
    } catch (error) {
        console.error(`Failed to load shift details for ID ${shiftId}:`, error);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'فشل تحميل تفاصيل الوردية: ' + error.message,
                confirmButtonText: 'حسناً'
            });
        }
    }
}


// Export an init function if page-loader.js expects it (good practice for modular scripts)
export function init(appSettings, currentUser) {
    console.log("Shift History page initialized.");
    // Call cleanup function to remove any old event listeners from previous page loads
    cleanup(); 
    // IMPORTANT: Call setupShiftHistoryPage() BEFORE loadClosedShifts()
    setupShiftHistoryPage();
    // Now call the function to load and display shifts
    loadClosedShifts();
}

export function cleanup() {
    // Remove DOM event listeners
    eventListeners.forEach(({ target, type, handler }) => {
        if (target && typeof target.removeEventListener === 'function') {
            target.removeEventListener(type, handler);
        }
    });
    eventListeners = []; // Clear the array

    // Remove IPC listeners (currently none for this file, but good practice)
    ipcListeners.forEach(({ channel, handler }) => {
        if (window.api && typeof window.api.removeListener === 'function') {
            window.api.removeListener(channel, handler);
        }
    });
    ipcListeners = []; // Clear the array
    console.log("shift-history.js cleanup completed.");
}