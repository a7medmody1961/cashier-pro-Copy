const db = require('../../database');

module.exports = (ipcMain) => {
    // تم تعديل هذا السطر: إضافة total_earned_loyalty_points و total_redeemed_loyalty_points
    ipcMain.handle('customers:get', () => db.prepare("SELECT c.*, ca.address as default_address, c.loyalty_points, c.total_earned_loyalty_points, c.total_redeemed_loyalty_points FROM customers c LEFT JOIN customer_addresses ca ON c.id = ca.customer_id AND ca.is_default = 1 ORDER BY c.id DESC").all());
    ipcMain.handle('customers:search', (e, q) => db.prepare("SELECT id, name, phone, loyalty_points FROM customers WHERE name LIKE ? OR phone LIKE ?").all(`%${q}%`, `%${q}%`));

    ipcMain.handle('customers:add', (e, c) => {
        const addCustomer = db.transaction(() => {
            const info = db.prepare("INSERT INTO customers (name, phone) VALUES (?, ?)").run(c.name, c.phone);
            if (c.address) {
                db.prepare("INSERT INTO customer_addresses (customer_id, address, is_default) VALUES (?, ?, 1)").run(info.lastInsertRowid, c.address);
            }
            return info;
        });
        const result = addCustomer();
        return { success: true, id: result.lastInsertRowid };
    });

    ipcMain.handle('customers:update', (e, c) => db.prepare("UPDATE customers SET name = ?, phone = ? WHERE id = ?").run(c.name, c.phone, c.id));
    ipcMain.handle('customers:delete', (e, id) => db.prepare("DELETE FROM customers WHERE id = ?").run(id));
    ipcMain.handle('customers:get-addresses', (e, id) => db.prepare("SELECT * FROM customer_addresses WHERE customer_id = ?").all(id));
    ipcMain.handle('customers:add-address', (e, d) => db.prepare("INSERT INTO customer_addresses (customer_id, address) VALUES (?, ?)").run(d.customerId, d.address));
    ipcMain.handle('customers:update-address', (e, d) => {
        db.prepare("UPDATE customer_addresses SET address = ? WHERE id = ?").run(d.address, d.id);
        // تحديث العنوان الافتراضي للعميل في حالة تعديل العنوان الأساسي
        // (إذا كان هذا العنوان هو العنوان الافتراضي، يجب تحديثه في جدول العملاء)
        // هذا المنطق يمكن أن يتم تحسينه بناءً على طريقة إدارة العناوين الافتراضية
        const customer = db.prepare("SELECT customer_id FROM customer_addresses WHERE id = ?").get(d.id);
        if (customer) {
            const defaultAddress = db.prepare("SELECT address FROM customer_addresses WHERE customer_id = ? AND is_default = 1").get(customer.customer_id);
            if (defaultAddress && defaultAddress.address === d.address) {
                db.prepare("UPDATE customers SET default_address = ? WHERE id = ?").run(d.address, customer.customer_id);
            }
        }
        return { success: true };
    });
    ipcMain.handle('customers:delete-address', (e, id) => {
        const info = db.prepare("DELETE FROM customer_addresses WHERE id = ?").run(id);
        return { success: true };
    });

    // إضافة جديدة: جلب جميع المعاملات (المبيعات) لعميل معين مع تفاصيل المنتجات
    ipcMain.handle('customers:get-transactions', (e, customerId) => {
        const sales = db.prepare(`
            SELECT 
                s.id AS sale_id, 
                s.total_amount, 
                s.created_at, 
                s.payment_method, 
                s.order_type,
                s.manual_discount_amount,
                s.manual_discount_type,
                s.loyalty_points
            FROM sales s
            WHERE s.customer_id = ?
            ORDER BY s.created_at DESC
        `).all(customerId);

        // لكل عملية بيع، جلب تفاصيل المنتجات
        const salesWithItems = sales.map(sale => {
            const items = db.prepare(`
                SELECT 
                    si.product_name, 
                    si.quantity, 
                    si.price_per_item
                FROM sale_items si
                WHERE si.sale_id = ?
            `).all(sale.sale_id);
            return { ...sale, items };
        });
        return salesWithItems;
    });

    // إضافة IPC handler جديد لحساب نقاط الولاء
    ipcMain.handle('customers:update-loyalty-points', (e, { customerId, pointsToAdd }) => {
        const updatePoints = db.transaction(() => {
            const customer = db.prepare("SELECT loyalty_points, total_earned_loyalty_points FROM customers WHERE id = ?").get(customerId);
            if (customer) {
                const newTotalPoints = customer.loyalty_points + pointsToAdd;
                const newTotalEarned = customer.total_earned_loyalty_points + pointsToAdd;
                db.prepare("UPDATE customers SET loyalty_points = ?, total_earned_loyalty_points = ? WHERE id = ?").run(newTotalPoints, newTotalEarned, customerId);
            }
        });
        updatePoints();
        return { success: true };
    });
};
