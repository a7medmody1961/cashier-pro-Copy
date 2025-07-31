// cashier-pro-Copy/src/scripts/reports.js
import { generateInvoiceHTML } from './invoice-template.js';
import { showPreviewModal } from './ui/modal-helpers.js';

export function init(appSettings) {
    let peakHoursChartInstance = null;
    const filterButtons = document.querySelectorAll('.filter-btn');
    const totalRevenueEl = document.getElementById('total-revenue');
    const totalInvoicesEl = document.getElementById('total-invoices');
    const totalExpensesEl = document.getElementById('total-expenses');
    const costOfGoodsSoldEl = document.getElementById('cost-of-goods-sold');
    const grossProfitEl = document.getElementById('gross-profit');
    const netProfitAfterExpensesEl = document.getElementById('net-profit-after-expenses');

    const salesTableBody = document.querySelector('#sales-table tbody');
    const bestSellersTableBody = document.querySelector('#best-sellers-table tbody');
    const cashierPerformanceTableBody = document.querySelector('#cashier-performance-table tbody');
    const peakHoursChartCanvas = document.getElementById('peak-hours-chart')?.getContext('2d');

    const invoiceSearchInput = document.getElementById('invoice-search-input'); // New
    const searchInvoiceBtn = document.getElementById('search-invoice-btn');     // New
    const clearInvoiceSearchBtn = document.getElementById('clear-invoice-search-btn'); // New


    if (!filterButtons.length || !peakHoursChartCanvas) return;

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            invoiceSearchInput.value = ''; // Clear search input when filter changes
            loadAllReports(button.dataset.filter);
        });
    });

    // New Event Listeners for search
    searchInvoiceBtn.addEventListener('click', () => {
        const invoiceId = invoiceSearchInput.value.trim();
        if (invoiceId) {
            // Deactivate all filter buttons when searching by invoice ID
            filterButtons.forEach(btn => btn.classList.remove('active'));
            loadAllReports(null, invoiceId); // Pass null for filter, and invoiceId
        } else {
            // If search input is empty, reload reports based on active filter
            loadAllReports(document.querySelector('.filter-btn.active')?.dataset.filter || 'today');
        }
    });

    clearInvoiceSearchBtn.addEventListener('click', () => {
        invoiceSearchInput.value = '';
        // Reload reports based on active filter
        loadAllReports(document.querySelector('.filter-btn.active')?.dataset.filter || 'today');
    });

    salesTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const saleId = parseInt(target.dataset.id);

        if (target.classList.contains('refund-btn')) {
            const result = await Swal.fire({
                title: 'هل أنت متأكد؟',
                text: "سيتم إرجاع هذه الفاتورة بالكامل!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonText: 'إلغاء',
                confirmButtonText: 'نعم، قم بالإرجاع'
            });
            if (result.isConfirmed) {
                try {
                    const currentUser = window.AppState.getCurrentUser();
                    await window.api.processRefund({ saleId, userId: currentUser.id });
                    Swal.fire('تم!', 'تمت عملية الإرجاع بنجاح.', 'success');
                    // Reload reports after refund, considering current search/filter
                    const currentFilter = document.querySelector('.filter-btn.active')?.dataset.filter;
                    const currentInvoiceSearch = invoiceSearchInput.value.trim();
                    loadAllReports(currentFilter, currentInvoiceSearch);
                } catch (error) {
                    Swal.fire('خطأ!', error.message || 'فشلت عملية الإرجاع.', 'error');
                }
            }
        }

        if (target.classList.contains('details-btn')) {
            try {
                const { saleDetails, saleItems } = await window.api.getSaleDetails(saleId);
                const invoiceHtml = generateInvoiceHTML(saleDetails, saleItems, appSettings);
                showPreviewModal(`تفاصيل الفاتورة رقم ${saleId}`, invoiceHtml);
            } catch (error) {
                console.error('Failed to get sale details or generate invoice:', error);
                Swal.fire('خطأ!', 'فشل عرض تفاصيل الفاتورة.', 'error');
            }
        }
    });

    // Updated loadAllReports to accept invoiceId
    async function loadAllReports(filter = 'today', invoiceId = null) {
        try {
            let salesData;
            let analyticsData;

            if (invoiceId) {
                // If an invoice ID is provided, fetch only that specific sale
                // Note: The backend getSales function needs to be updated to support fetching by ID
                salesData = await window.api.getSalesById(parseInt(invoiceId));
                // For analytics, if searching by single invoice, KPIs will be based on this invoice
                // For simplicity, we'll run analytics for today if searching by invoice to avoid empty analytics
                // Or you can create a specific analytics endpoint for single sale
                const todayRange = getDateRange('today');
                analyticsData = await window.api.getAnalytics(todayRange);
            } else {
                const range = getDateRange(filter);
                [salesData, analyticsData] = await Promise.all([
                    window.api.getSales(range),
                    window.api.getAnalytics(range)
                ]);
            }
            
            renderKpis(salesData, analyticsData); // analyticsData now contains totalCostOfGoodsSold
            renderSalesTable(salesData);

            // Analytics data (best sellers, peak hours, cashier performance)
            // will always be based on the general time filter, not single invoice search
            // unless you create specific backend logic for single invoice analytics.
            // For now, if searching by ID, these might not make sense or will show for the 'today' range.
            if (analyticsData.success && !invoiceId) { // Only render if not searching by invoice ID
                renderBestSellers(analyticsData.bestSellers);
                renderCashierPerformance(analyticsData.cashierPerformance);
                renderPeakHoursChart(analyticsData.peakHours);
            } else if (invoiceId) { // Clear these sections if searching by ID
                bestSellersTableBody.innerHTML = '';
                cashierPerformanceTableBody.innerHTML = '';
                if (peakHoursChartInstance) peakHoursChartInstance.destroy();
                peakHoursChartInstance = null;
            }

        } catch (error) {
            console.error("Failed to load reports:", error);
            Swal.fire('خطأ', 'فشل تحميل بيانات التقارير.', 'error');
        }
    }

    // Updated renderKpis function
    function renderKpis(sales, analyticsData) {
        const completedSales = sales.filter(s => s.status === 'completed');
        const refundedSales = sales.filter(s => s.status === 'refunded');

        const totalRevenueGross = completedSales.reduce((sum, s) => sum + s.total_amount, 0);
        const totalRefundsAmount = refundedSales.reduce((sum, s) => sum + s.total_amount, 0); // Assuming positive amount for refunds
        
        // Net Revenue (Gross Sales - Refunds)
        const netSales = totalRevenueGross - totalRefundsAmount;

        const totalExpenses = analyticsData.totalExpenses || 0; // From backend
        const totalCostOfGoodsSold = analyticsData.totalCostOfGoodsSold || 0; // From backend

        const grossProfit = netSales - totalCostOfGoodsSold; // صافي الربح (الإيرادات بعد المرتجعات - تكلفة المنتجات)
        const netProfitAfterExpenses = grossProfit - totalExpenses; // صافي الربح بعد المصروفات

        totalInvoicesEl.textContent = completedSales.length;
        totalRevenueEl.textContent = formatCurrency(totalRevenueGross); // إجمالي المبيعات (الخام قبل خصم المرتجعات)
        costOfGoodsSoldEl.textContent = formatCurrency(totalCostOfGoodsSold);
        grossProfitEl.textContent = formatCurrency(grossProfit);
        totalExpensesEl.textContent = formatCurrency(totalExpenses);
        netProfitAfterExpensesEl.textContent = formatCurrency(netProfitAfterExpenses);
    }

    function renderSalesTable(sales) {
        salesTableBody.innerHTML = sales.map(s => `
            <tr>
                <td>${s.id}</td>
                <td>${s.username || 'N/A'}</td>
                <td>${s.customer_name || 'بدون اسم'}</td>
                <td><span class="status ${s.status}">${s.status === 'completed' ? 'مكتملة' : 'مرتجع'}</span></td>
                <td>${formatCurrency(s.total_amount)}</td>
                <td>${s.payment_method}</td>
                <td>${new Date(s.created_at).toLocaleString('ar-EG')}</td>
                <td class="actions-cell">
                    <button class="btn btn-secondary details-btn" data-id="${s.id}">التفاصيل</button>
                    ${s.status === 'completed' ? `<button class="btn btn-danger refund-btn" data-id="${s.id}">إرجاع</button>` : ''}
                </td>
            </tr>
        `).join('');
    }

    function renderBestSellers(data) {
        bestSellersTableBody.innerHTML = data.map(item => `
            <tr><td>${item.product_name}</td><td>${item.total_quantity}</td></tr> `).join('');
    }

    function renderCashierPerformance(data) {
        cashierPerformanceTableBody.innerHTML = data.map(item => `
            <tr><td>${item.username}</td><td>${item.invoice_count}</td><td>${formatCurrency(item.total_sales)}</td></tr>
        `).join('');
    }

    function renderPeakHoursChart(peakHours) {
        const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
        const data = Array(24).fill(0);
        if (peakHours) {
            peakHours.forEach(h => {
                data[parseInt(h.hour, 10)] = h.sales_count;
            });
        }

        if (peakHoursChartInstance) peakHoursChartInstance.destroy();

        peakHoursChartInstance = new Chart(peakHoursChartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'عدد الفواتير',
                    data: data,
                    backgroundColor: 'rgba(37, 99, 235, 0.6)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 1,
                    borderRadius: 5,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                plugins: { legend: { display: false } }
            }
        });
    }

    function getDateRange(filter) {
        const end = new Date();
        const start = new Date();
        end.setHours(23, 59, 59, 999);
        start.setHours(0, 0, 0, 0);

        if (filter === 'week') {
            const dayOfWeek = start.getDay();
            start.setDate(start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
        } else if (filter === 'month') {
            start.setDate(1);
        }
        const toSQLiteString = (date) => {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        };

        return { start: toSQLiteString(start), end: toSQLiteString(end) };
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: appSettings.currency || 'EGP' }).format(amount || 0);
    }

    window.api.onSalesUpdate(loadAllReports);

    loadAllReports('today');
}