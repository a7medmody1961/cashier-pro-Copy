const db = require('../../database');

module.exports = (ipcMain) => {
    ipcMain.handle('reports:get-analytics', (event, dateRange) => {
        try {
            if (!dateRange || typeof dateRange.start === 'undefined' || typeof dateRange.end === 'undefined') {
                console.error("Invalid dateRange received for reports:get-analytics:", dateRange);
                return { success: false, error: "Invalid date range provided to analytics handler." };
            }

            const params = [dateRange.start, dateRange.end];
            
            // تم تعديل الاستعلام لحساب إجمالي الإيرادات من جميع الفواتير المكتملة والمرتجعة
            const totalRevenueResult = db.prepare(`SELECT SUM(total_amount) as total_revenue FROM sales WHERE created_at BETWEEN ? AND ? AND (status = 'completed' OR status = 'refunded')`).get(params);
            
            // تم تعديل الاستعلام لحساب تكلفة المنتجات المباعة من جميع الفواتير المكتملة والمرتجعة
            const costOfGoodsSold = db.prepare(`
                SELECT SUM(si.quantity * p.cost_price) as total_cogs
                FROM sale_items si
                JOIN sales s ON si.sale_id = s.id
                JOIN products p ON si.product_id = p.id
                WHERE s.created_at BETWEEN ? AND ? AND (s.status = 'completed' OR s.status = 'refunded')
            `).get(params);

            // الاستعلامات الأخرى لا تزال كما هي
            const sales = db.prepare(`SELECT COUNT(id) as order_count, SUM(total_amount) as total_revenue FROM sales WHERE status = 'completed' AND original_sale_id IS NULL AND created_at BETWEEN ? AND ?`).get(params);
            const expenses = db.prepare(`SELECT SUM(amount) as total_expenses FROM expenses WHERE created_at BETWEEN ? AND ?`).get(params);
            const top_products = db.prepare(`
                SELECT product_name, SUM(quantity) as total_quantity
                FROM sale_items si
                JOIN sales s ON si.sale_id = s.id
                WHERE s.created_at BETWEEN ? AND ?
                GROUP BY product_name
                ORDER BY total_quantity DESC LIMIT 5
            `).all(params);
            const cashier_performance = db.prepare(`SELECT u.username, COUNT(s.id) as invoice_count, SUM(s.total_amount) as total_sales FROM sales s JOIN users u ON s.user_id = u.id WHERE s.created_at BETWEEN ? AND ? AND s.status = 'completed' GROUP BY u.username ORDER BY total_sales DESC`).all(params);
            const peak_hours = db.prepare(`SELECT strftime('%H', created_at) as hour, COUNT(id) as sales_count FROM sales WHERE created_at BETWEEN ? AND ? AND status = 'completed' GROUP BY hour ORDER BY hour ASC`).all(params);
            const manualDiscounts = db.prepare(`SELECT SUM(manual_discount_amount) as total_manual_discount FROM sales WHERE status = 'completed' AND created_at BETWEEN ? AND ?`).get(params);

            const revenue = totalRevenueResult.total_revenue || 0; // استخدام الإيراد المحسوب الجديد
            const totalExpenses = expenses.total_expenses || 0;
            const totalManualDiscount = manualDiscounts.total_manual_discount || 0;
            const cogs = costOfGoodsSold.total_cogs || 0;

            return {
                success: true,
                order_count: sales.order_count || 0,
                total_revenue: revenue,
                totalExpenses: totalExpenses,
                bestSellers: top_products,
                cashierPerformance: cashier_performance,
                peakHours: peak_hours,
                totalManualDiscount: totalManualDiscount,
                totalCostOfGoodsSold: cogs
            };
        } catch (error) {
            console.error("Failed to get analytics:", error);
            return { success: false, error: error.message };
        }
    });

    // إضافة IPC handler جديد لجلب فواتير الإرجاع الجزئية لفاتورة معينة
    ipcMain.handle('reports:get-partial-refunds', (event, originalSaleId) => {
        try {
            // جلب فواتير الإرجاع الجزئية المرتبطة بالفاتورة الأصلية
            const partialRefunds = db.prepare(`
                SELECT * FROM sales WHERE original_sale_id = ?
            `).all(originalSaleId);

            // جلب تفاصيل المنتجات لكل فاتورة إرجاع
            const refundsWithItems = partialRefunds.map(refund => {
                const saleItems = db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(refund.id);
                return {
                    ...refund,
                    saleItems
                };
            });

            return { success: true, refunds: refundsWithItems };
        } catch (error) {
            console.error("Failed to get partial refunds:", error);
            return { success: false, error: error.message };
        }
    });
};
