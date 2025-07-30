import { generateInvoiceHTML } from './invoice-template.js';
// استيراد دالة showPreviewModal من modal-helpers.js
import { showPreviewModal } from './ui/modal-helpers.js'; 

export function init(appSettings) {
    let peakHoursChartInstance = null;
    const filterButtons = document.querySelectorAll('.filter-btn');
    const totalRevenueEl = document.getElementById('total-revenue');
    const totalInvoicesEl = document.getElementById('total-invoices');
    const totalExpensesEl = document.getElementById('total-expenses');
    const netProfitEl = document.getElementById('net-profit');
    const salesTableBody = document.querySelector('#sales-table tbody');
    const bestSellersTableBody = document.querySelector('#best-sellers-table tbody');
    const cashierPerformanceTableBody = document.querySelector('#cashier-performance-table tbody');
    const peakHoursChartCanvas = document.getElementById('peak-hours-chart')?.getContext('2d');

    if (!filterButtons.length || !peakHoursChartCanvas) return;

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            loadAllReports(button.dataset.filter);
        });
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
                    loadAllReports(document.querySelector('.filter-btn.active').dataset.filter);
                } catch (error) {
                    Swal.fire('خطأ!', error.message || 'فشلت عملية الإرجاع.', 'error');
                }
            }
        }
        
        if (target.classList.contains('details-btn')) {
            try {
                const { saleDetails, saleItems } = await window.api.getSaleDetails(saleId);
                // تمرير appSettings إلى generateInvoiceHTML
                const invoiceHtml = generateInvoiceHTML(saleDetails, saleItems, appSettings); 
                // استخدام showPreviewModal بدلاً من window.api.openPreviewWindow
                showPreviewModal(`تفاصيل الفاتورة رقم ${saleId}`, invoiceHtml);
            } catch (error) {
                console.error('Failed to get sale details or generate invoice:', error); // سجل الخطأ للمطور
                Swal.fire('خطأ!', 'فشل عرض تفاصيل الفاتورة.', 'error');
            }
        }
    });

    async function loadAllReports(filter) {
        try {
            const range = getDateRange(filter);
            const [salesData, analyticsData] = await Promise.all([
                window.api.getSales(range),
                window.api.getAnalytics(range)
            ]);

            renderKpis(salesData, analyticsData.totalExpenses);
            renderSalesTable(salesData);
            if (analyticsData.success) {
                renderBestSellers(analyticsData.bestSellers);
                renderCashierPerformance(analyticsData.cashierPerformance);
                renderPeakHoursChart(analyticsData.peakHours);
            }
        } catch (error) {
            console.error("Failed to load reports:", error);
            Swal.fire('خطأ', 'فشل تحميل بيانات التقارير.', 'error');
        }
    }
    
    function renderKpis(sales, expenses) {
        const completedSales = sales.filter(s => s.status === 'completed');
        const refundedSales = sales.filter(s => s.status === 'refunded');
        const totalRevenue = completedSales.reduce((sum, s) => sum + s.total_amount, 0);
        const totalRefunds = refundedSales.reduce((sum, s) => sum + s.total_amount, 0);
        const netRevenue = totalRevenue + totalRefunds; // يجب أن تكون المرتجعات بقيمة سالبة لخصمها

        totalRevenueEl.textContent = formatCurrency(netRevenue);
        totalInvoicesEl.textContent = completedSales.length;
        totalExpensesEl.textContent = formatCurrency(expenses);
        netProfitEl.textContent = formatCurrency(netRevenue - expenses);
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
            <tr><td>${item.product_name}</td><td>${item.total_quantity_sold}</td></tr>
        `).join('');
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
        // استخدام appSettings.currency بدلاً من 'EGP' الثابت
        return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: appSettings.currency || 'EGP' }).format(amount || 0);
    }

    window.api.onSalesUpdate(loadAllReports);

    loadAllReports('today');
}
