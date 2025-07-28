// Ensure the DOM is fully loaded before running scripts
document.addEventListener('DOMContentLoaded', async () => {
    // Get references to the HTML elements where data will be displayed
    const shiftsTableBody = document.getElementById('shifts-table-body');
    const shiftDetailsModal = document.getElementById('shiftDetailsModal');
    const modalCloseButtons = shiftDetailsModal.querySelectorAll('.close-button');

    // Get references for the shift summary details in the modal
    const detailUsername = document.getElementById('detailUsername');
    const detailStartTime = document.getElementById('detailStartTime');
    const detailEndTime = document.getElementById('detailEndTime');
    const detailStartingCash = document.getElementById('detailStartingCash');
    const detailEndingCash = document.getElementById('detailEndingCash');
    const detailTotalSales = document.getElementById('detailTotalSales');
    const modalShiftId = document.getElementById('modalShiftId');

    // Get references for the sales and expenses tables in the modal
    const shiftSalesTableBody = document.getElementById('shift-sales-table-body');
    const shiftExpensesTableBody = document.getElementById('shift-expenses-table-body');

    /**
     * Fetches and displays all closed shifts.
     */
    async function loadClosedShifts() {
        shiftsTableBody.innerHTML = '<tr><td colspan="9" class="text-center">جارٍ تحميل الورديات...</td></tr>'; // Loading message
        try {
            // Call the main process to get all closed shifts
            // Ensure 'getAllClosedShifts' is exposed in preload.js
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
                // Attach event listeners to the "View Details" buttons
                document.querySelectorAll('.view-details-btn').forEach(button => {
                    button.addEventListener('click', (event) => {
                        const shiftId = event.currentTarget.dataset.shiftId;
                        showShiftDetails(shiftId);
                    });
                });
            } else {
                shiftsTableBody.innerHTML = '<tr><td colspan="9" class="text-center">لا توجد ورديات مغلقة لعرضها.</td></tr>';
            }
        } catch (error) {
            console.error('Failed to load closed shifts:', error);
            shiftsTableBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">حدث خطأ أثناء تحميل الورديات.</td></tr>';
            // Display an error message to the user using a custom modal or SweetAlert2 if available
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
        try {
            // Call the main process to get details for the specific shift
            // Ensure 'getShiftDetails' is exposed in preload.js
            const { shift, sales, expenses } = await window.api.getShiftDetails(shiftId);

            if (shift) {
                // Populate shift summary details
                modalShiftId.textContent = shift.id;
                detailUsername.textContent = shift.username || 'غير معروف';
                detailStartTime.textContent = new Date(shift.start_time).toLocaleString('ar-EG');
                detailEndTime.textContent = shift.end_time ? new Date(shift.end_time).toLocaleString('ar-EG') : 'قيد العمل';
                detailStartingCash.textContent = shift.starting_cash.toFixed(2);
                detailEndingCash.textContent = shift.ending_cash ? shift.ending_cash.toFixed(2) : 'N/A';
                detailTotalSales.textContent = shift.total_sales ? shift.total_sales.toFixed(2) : 'N/A';

                // Populate sales table
                shiftSalesTableBody.innerHTML = ''; // Clear previous sales
                if (sales && sales.length > 0) {
                    sales.forEach(sale => {
                        const row = shiftSalesTableBody.insertRow();
                        row.innerHTML = `
                            <td>${sale.id}</td>
                            <td>${sale.customer_id ? `ID: ${sale.customer_id}` : 'لا يوجد'}</td> <!-- You might want to fetch customer name here -->
                            <td>${sale.total_amount.toFixed(2)}</td>
                            <td>${sale.payment_method}</td>
                            <td>${new Date(sale.created_at).toLocaleString('ar-EG')}</td>
                        `;
                    });
                } else {
                    shiftSalesTableBody.innerHTML = '<tr><td colspan="5" class="text-center">لا توجد مبيعات لهذه الوردية.</td></tr>';
                }

                // Populate expenses table
                shiftExpensesTableBody.innerHTML = ''; // Clear previous expenses
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

                // Display the modal
                shiftDetailsModal.style.display = 'block';
            } else {
                // Handle case where shift details are not found
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

    // Attach event listeners to close buttons in the modal
    modalCloseButtons.forEach(button => {
        button.addEventListener('click', () => {
            shiftDetailsModal.style.display = 'none';
        });
    });

    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === shiftDetailsModal) {
            shiftDetailsModal.style.display = 'none';
        }
    });

    // Initial load of closed shifts when the page loads
    // This function will be called by page-loader.js if it has an init method
    // If not, it will be called when DOMContentLoaded fires.
    loadClosedShifts(); 
});

// Export an init function if page-loader.js expects it (good practice for modular scripts)
export function init(appSettings, currentUser) {
    console.log("Shift History page initialized.");
    // You can use appSettings or currentUser here if needed for this page
    // For example, to filter shifts by current user role or display user-specific info.
}
