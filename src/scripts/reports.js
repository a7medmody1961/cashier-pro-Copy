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

    const invoiceSearchInput = document.getElementById('invoice-search-input');
    const searchInvoiceBtn = document.getElementById('search-invoice-btn');
    const clearInvoiceSearchBtn = document.getElementById('clear-invoice-search-btn');

    // العناصر الجديدة للـ Modal الخاص بالإرجاع الجزئي
    const partialRefundModal = document.getElementById('partial-refund-modal');
    const closeRefundModalBtn = document.getElementById('close-refund-modal');
    const cancelPartialRefundBtn = document.getElementById('cancel-partial-refund-btn');
    const confirmPartialRefundBtn = document.getElementById('confirm-partial-refund-btn');
    const confirmFullRefundBtn = document.getElementById('confirm-full-refund-btn'); // زر الإرجاع الكامل الجديد
    const refundModalInvoiceIdEl = document.getElementById('refund-modal-invoice-id');
    const refundModalTotalAmountEl = document.getElementById('refund-modal-total-amount');
    const refundModalRefundAmountEl = document.getElementById('refund-modal-refund-amount');
    const refundItemsTableBody = document.getElementById('refund-items-table-body');
    let currentSaleDetails = null; // لتخزين تفاصيل الفاتورة الحالية

    if (!filterButtons.length || !peakHoursChartCanvas) return;

    // ----- إدارة أزرار الفلاتر والبحث -----
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            invoiceSearchInput.value = '';
            loadAllReports(button.dataset.filter);
        });
    });

    searchInvoiceBtn.addEventListener('click', () => {
        const invoiceId = invoiceSearchInput.value.trim();
        if (invoiceId) {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            loadAllReports(null, invoiceId);
        } else {
            loadAllReports(document.querySelector('.filter-btn.active')?.dataset.filter || 'today');
        }
    });

    clearInvoiceSearchBtn.addEventListener('click', () => {
        invoiceSearchInput.value = '';
        loadAllReports(document.querySelector('.filter-btn.active')?.dataset.filter || 'today');
    });

    // ----- إدارة أحداث جدول المبيعات -----
    salesTableBody.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const saleId = parseInt(target.dataset.id);

        if (target.classList.contains('refund-btn')) {
            try {
                const { saleDetails, saleItems, partialRefunds } = await window.api.getSaleDetails(saleId);
                openPartialRefundModal(saleDetails, saleItems, partialRefunds);
            } catch (error) {
                console.error('Failed to get sale details for refund:', error);
                Swal.fire('خطأ!', error.message || 'فشل جلب تفاصيل الفاتورة.', 'error');
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

    // ----- إدارة أحداث الـ Modal الخاص بالإرجاع الجزئي -----
    function closePartialRefundModal() {
        partialRefundModal.style.display = 'none';
        refundItemsTableBody.innerHTML = '';
        currentSaleDetails = null;
    }

    closeRefundModalBtn.addEventListener('click', closePartialRefundModal);
    cancelPartialRefundBtn.addEventListener('click', closePartialRefundModal);

    // حدث جديد لزر "إرجاع كامل"
    confirmFullRefundBtn.addEventListener('click', async () => {
        const saleId = currentSaleDetails.id;
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
                closePartialRefundModal();
                loadAllReports(document.querySelector('.filter-btn.active')?.dataset.filter || 'today');
            } catch (error) {
                Swal.fire('خطأ!', error.message || 'فشلت عملية الإرجاع.', 'error');
            }
        }
    });


    confirmPartialRefundBtn.addEventListener('click', async () => {
        const itemsToRefund = [];
        let totalRefundAmount = 0;
        let isInputValid = true;

        refundItemsTableBody.querySelectorAll('tr').forEach(row => {
            const quantityInput = row.querySelector('input[type="number"]');
            const originalQuantity = parseFloat(quantityInput.dataset.originalQuantity);
            const returnedQuantity = parseFloat(quantityInput.dataset.returnedQuantity || 0);
            const refundQuantity = parseFloat(quantityInput.value);
            const pricePerItem = parseFloat(quantityInput.dataset.price);

            if (refundQuantity > 0) {
                if (refundQuantity + returnedQuantity > originalQuantity) {
                    isInputValid = false;
                    Swal.fire('خطأ!', `الكمية المرتجعة لمنتج ${row.dataset.productName} لا يمكن أن تتجاوز الكمية المتبقية (${originalQuantity - returnedQuantity}).`, 'error');
                    return;
                }
                itemsToRefund.push({
                    product_id: parseInt(row.dataset.productId),
                    quantity: refundQuantity,
                    price_per_item: pricePerItem,
                    product_name: row.dataset.productName,
                    original_sale_item_id: parseInt(row.dataset.originalSaleItemId)
                });
                totalRefundAmount += refundQuantity * pricePerItem;
            }
        });

        if (!isInputValid) return;

        if (itemsToRefund.length === 0) {
            Swal.fire('تنبيه!', 'الرجاء إدخال كمية واحدة على الأقل للإرجاع.', 'warning');
            return;
        }

        const originalSaleTotal = currentSaleDetails.total_amount;
        const refundPercentage = totalRefundAmount / originalSaleTotal;
        const manualDiscountAmount = (currentSaleDetails.manual_discount_amount || 0) * refundPercentage;
        const pointsToDeduct = (currentSaleDetails.loyalty_points || 0) * refundPercentage;

        const result = await Swal.fire({
            title: 'هل أنت متأكد؟',
            html: `سيتم إرجاع منتجات بقيمة إجمالية قدرها <span class="text-danger font-weight-bold">${formatCurrency(totalRefundAmount)}</span>.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonText: 'إلغاء',
            confirmButtonText: 'نعم، قم بالإرجاع'
        });

        if (result.isConfirmed) {
            try {
                const currentUser = window.AppState.getCurrentUser();
                await window.api.processPartialRefund({
                    saleId: currentSaleDetails.id,
                    userId: currentUser.id,
                    itemsToRefund,
                    totalRefundAmount,
                    manualDiscountAmount,
                    pointsToDeduct,
                    originalSaleTotal
                });
                Swal.fire('تم!', 'تمت عملية الإرجاع بنجاح.', 'success');
                closePartialRefundModal();
                loadAllReports(document.querySelector('.filter-btn.active')?.dataset.filter || 'today');
            } catch (error) {
                Swal.fire('خطأ!', error.message || 'فشلت عملية الإرجاع.', 'error');
            }
        }
    });

    // ----- وظائف الـ Modal المساعدة -----
    function openPartialRefundModal(saleDetails, saleItems, existingRefunds) {
        currentSaleDetails = saleDetails;
        refundModalInvoiceIdEl.textContent = saleDetails.id;
        refundModalTotalAmountEl.textContent = formatCurrency(saleDetails.total_amount);
        refundModalRefundAmountEl.textContent = formatCurrency(0);
        refundItemsTableBody.innerHTML = '';
        renderRefundItems(saleItems, existingRefunds);
        partialRefundModal.style.display = 'block';
    }

    function renderRefundItems(saleItems, existingRefunds) {
        const returnedQuantities = {};
        existingRefunds.forEach(refund => {
            if (refund.original_sale_id === currentSaleDetails.id) {
                refund.saleItems.forEach(item => {
                    returnedQuantities[item.product_id] = (returnedQuantities[item.product_id] || 0) + Math.abs(item.quantity);
                });
            }
        });
        
        refundItemsTableBody.innerHTML = saleItems.map(item => {
            const returnedQuantity = returnedQuantities[item.product_id] || 0;
            const remainingQuantity = item.quantity - returnedQuantity;

            if (remainingQuantity <= 0) return '';
            
            return `
                <tr data-product-id="${item.product_id}" data-original-sale-item-id="${item.id}" data-product-name="${item.product_name}">
                    <td>${item.product_name}</td>
                    <td>${item.quantity}</td>
                    <td>${formatCurrency(item.price_per_item)}</td>
                    <td>
                        <input type="number" class="form-control" style="width: 80px; text-align: center; border-radius: 5px; padding: 5px;" min="0" max="${remainingQuantity}" value="0"
                               data-price="${item.price_per_item}" data-original-quantity="${item.quantity}" data-returned-quantity="${returnedQuantity}">
                    </td>
                </tr>
            `;
        }).join('');

        refundItemsTableBody.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', calculateRefundAmount);
        });
    }

    function calculateRefundAmount() {
        let total = 0;
        refundItemsTableBody.querySelectorAll('tr').forEach(row => {
            const quantityInput = row.querySelector('input[type="number"]');
            const refundQuantity = parseFloat(quantityInput.value);
            const pricePerItem = parseFloat(quantityInput.dataset.price);
            if (refundQuantity > 0) {
                total += refundQuantity * pricePerItem;
            }
        });
        refundModalRefundAmountEl.textContent = formatCurrency(total);
    }
    
    async function loadAllReports(filter = 'today', invoiceId = null) {
        try {
            let salesData;
            let analyticsData;

            if (invoiceId) {
                salesData = await window.api.getSalesById(parseInt(invoiceId));
                const todayRange = getDateRange('today');
                analyticsData = await window.api.getAnalytics(todayRange);
            } else {
                const range = getDateRange(filter);
                [salesData, analyticsData] = await Promise.all([
                    window.api.getSales(range),
                    window.api.getAnalytics(range)
                ]);
            }
            
            renderKpis(salesData, analyticsData);
            renderSalesTable(salesData);

            if (analyticsData.success && !invoiceId) {
                renderBestSellers(analyticsData.bestSellers);
                renderCashierPerformance(analyticsData.cashierPerformance);
                renderPeakHoursChart(analyticsData.peakHours);
            } else if (invoiceId) {
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
    
    function renderKpis(sales, analyticsData) {

        const totalRevenueGross = sales.filter(s => s.status === 'completed' || s.status === 'refunded')
                                       .reduce((sum, s) => sum + s.total_amount, 0);

        const completedInvoicesCount = sales.filter(s => s.status === 'completed' && s.original_sale_id === null).length;
        
        const totalExpenses = analyticsData.totalExpenses || 0;
        const totalCostOfGoodsSold = analyticsData.totalCostOfGoodsSold || 0;

        const grossProfit = totalRevenueGross - totalCostOfGoodsSold;
        const netProfitAfterExpenses = grossProfit - totalExpenses;

        totalInvoicesEl.textContent = completedInvoicesCount;
        totalRevenueEl.textContent = formatCurrency(totalRevenueGross);
        costOfGoodsSoldEl.textContent = formatCurrency(totalCostOfGoodsSold);
        grossProfitEl.textContent = formatCurrency(grossProfit);
        totalExpensesEl.textContent = formatCurrency(totalExpenses);
        netProfitAfterExpensesEl.textContent = formatCurrency(netProfitAfterExpenses);
    }


    function renderSalesTable(sales) {
        // فلترة فواتير الإرجاع الكاملة من العرض
        const salesToDisplay = sales.filter(s => !(s.status === 'refunded' && s.original_sale_id === null));

        salesTableBody.innerHTML = salesToDisplay.map(s => {
            let rowClass = '';
            let statusText = 'مكتملة';
            let refundButton = '';
            let detailsButton = `<button class="btn btn-secondary details-btn" data-id="${s.id}">التفاصيل</button>`;

            // تعديل منطق عرض الحالة وزر الإرجاع بناءً على وجود فواتير إرجاع جزئي
            const relatedRefunds = sales.filter(refund => refund.original_sale_id === s.id);
            if (relatedRefunds.length > 0) {
                if (s.status === 'refunded') {
                    rowClass = 'refunded-original-sale';
                    statusText = 'مرتجع بالكامل';
                    refundButton = '';
                } else {
                    rowClass = 'partial-refund-sale';
                    statusText = 'مرتجع جزئي';
                    refundButton = `<button class="btn btn-danger refund-btn" data-id="${s.id}">إرجاع</button>`;
                }
            } else {
                if (s.status === 'refunded') {
                    rowClass = 'refunded-original-sale';
                    statusText = 'مرتجع بالكامل';
                    refundButton = '';
                } else {
                    statusText = 'مكتملة';
                    refundButton = `<button class="btn btn-danger refund-btn" data-id="${s.id}">إرجاع</button>`;
                }
            }


            return `
                <tr class="${rowClass}">
                    <td>${s.id}</td>
                    <td>${s.username || 'N/A'}</td>
                    <td>${s.customer_name || 'بدون اسم'}</td>
                    <td><span class="status ${s.status}">${statusText}</span></td>
                    <td>${formatCurrency(s.total_amount)}</td>
                    <td>${s.payment_method}</td>
                    <td>${new Date(s.created_at).toLocaleString('ar-EG')}</td>
                    <td class="actions-cell">
                        ${detailsButton}
                        ${refundButton}
                    </td>
                </tr>
            `;
        }).join('');
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
