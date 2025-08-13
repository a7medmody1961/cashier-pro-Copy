const db = require('../../database');

module.exports = (ipcMain, getMainWindow) => {
    ipcMain.handle('sales:finalize', (event, saleData) => {
        // تحديث: استلام هيكل بيانات جديد من pos-view.js يتضمن خصومات المنتجات
        const { type, items, amounts, paymentMethod, userId, shiftId, customer, transactionRef, pointsUsed, pointsEarned, salespersonId, invoiceDiscount } = saleData; 
        
        try {
            const finalizeTransaction = db.transaction(() => {
                let customerId = null; 
                let existingCustomer = null;

                if (customer && customer.phone) {
                    existingCustomer = db.prepare("SELECT id, name, loyalty_points, total_earned_loyalty_points, total_redeemed_loyalty_points FROM customers WHERE phone = ?").get(customer.phone);
                    if (existingCustomer) {
                        customerId = existingCustomer.id;
                        if (customer.name && existingCustomer.name !== customer.name) {
                            db.prepare("UPDATE customers SET name = ? WHERE id = ?").run(customer.name, customerId);
                        }
                        if (type === 'delivery' && customer.address) {
                            const existingAddress = db.prepare("SELECT id FROM customer_addresses WHERE customer_id = ? AND address = ?").get(customerId, customer.address);
                            if (!existingAddress) {
                                db.prepare("INSERT INTO customer_addresses (customer_id, address) VALUES (?, ?)").run(customerId, customer.address);
                            }
                        }
                    } else {
                        const result = db.prepare("INSERT INTO customers (name, phone) VALUES (?, ?)").run(customer.name || null, customer.phone);
                        customerId = result.lastInsertRowid;
                        if (type === 'delivery' && customer.address) {
                            db.prepare("INSERT INTO customer_addresses (customer_id, address, is_default) VALUES (?, ?, 1)").run(customerId, customer.address);
                        }
                    }
                }

                const deliveryAddress = (type === 'delivery' && customer) ? customer.address : null;
                
                let invoiceDiscountAmount = 0;
                if (invoiceDiscount.type === 'fixed') {
                    invoiceDiscountAmount = invoiceDiscount.value;
                } else if (invoiceDiscount.type === 'percentage') {
                    // حساب الخصم بالنسبة المئوية بناءً على الإجمالي الفرعي قبل أي خصومات
                    const subTotalBeforeDiscount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    invoiceDiscountAmount = subTotalBeforeDiscount * (invoiceDiscount.value / 100);
                }

                const saleSql = `INSERT INTO sales (user_id, shift_id, customer_id, salesperson_id, order_type, total_amount, sub_total, vat_amount, service_amount, delivery_fee_amount, payment_method, transaction_ref, delivery_address, invoice_manual_discount_amount, invoice_manual_discount_type, loyalty_points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                
                const saleParams = [
                    userId, 
                    shiftId, 
                    customerId, 
                    salespersonId, 
                    type, 
                    amounts.total, 
                    amounts.subTotal, 
                    amounts.vat, 
                    amounts.service, 
                    amounts.delivery, 
                    paymentMethod, 
                    transactionRef, 
                    deliveryAddress, 
                    invoiceDiscountAmount,
                    invoiceDiscount.type, 
                    pointsEarned
                ]; 
                
                const saleResult = db.prepare(saleSql).run(saleParams);
                const saleId = saleResult.lastInsertRowid;

                const itemStmt = db.prepare("INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price_per_item, item_manual_discount_amount, item_manual_discount_type) VALUES (?, ?, ?, ?, ?, ?, ?)");
                const stockStmt = db.prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND stock IS NOT NULL");
                
                for (let item of items) {
                    let itemDiscountAmount = 0;
                    if (item.manual_discount.type === 'fixed') {
                        itemDiscountAmount = item.manual_discount.value;
                    } else if (item.manual_discount.type === 'percentage') {
                        itemDiscountAmount = (item.price * item.quantity) * (item.manual_discount.value / 100);
                    }
                    
                    itemStmt.run(
                        saleId, 
                        item.id, 
                        item.name, 
                        item.quantity, 
                        item.price,
                        itemDiscountAmount,
                        item.manual_discount.type
                    );
                    stockStmt.run(item.quantity, item.id);
                }

                if (customerId) {
                    db.prepare("UPDATE customers SET order_count = order_count + 1, total_spent = total_spent + ? WHERE id = ?").run(amounts.total, customerId);

                    let currentLoyaltyPoints = existingCustomer ? existingCustomer.loyalty_points : 0;
                    let currentTotalEarnedLoyaltyPoints = existingCustomer ? existingCustomer.total_earned_loyalty_points : 0;
                    let currentTotalRedeemedLoyaltyPoints = existingCustomer ? existingCustomer.total_redeemed_loyalty_points : 0;
                    
                    if (pointsUsed && pointsUsed > 0) {
                        currentLoyaltyPoints = Math.max(0, currentLoyaltyPoints - pointsUsed);
                        currentTotalRedeemedLoyaltyPoints += pointsUsed; 
                    }
                    currentLoyaltyPoints += pointsEarned;
                    currentTotalEarnedLoyaltyPoints += pointsEarned;

                    db.prepare("UPDATE customers SET loyalty_points = ?, total_earned_loyalty_points = ?, total_redeemed_loyalty_points = ? WHERE id = ?")
                        .run(currentLoyaltyPoints, currentTotalEarnedLoyaltyPoints, currentTotalRedeemedLoyaltyPoints, customerId);
                }
                
                getMainWindow()?.webContents.send('sales-updated'); 
                
                const baseSaleDetails = db.prepare(`
                    SELECT s.*, u.username, ru.username as refunded_by_username, sp.name as salesperson_name
                    FROM sales s 
                    LEFT JOIN users u ON s.user_id = u.id 
                    LEFT JOIN customers c ON s.customer_id = c.id
                    LEFT JOIN users ru ON s.refunded_by_user_id = ru.id
                    LEFT JOIN salespersons sp ON s.salesperson_id = sp.id 
                    WHERE s.id = ?
                `).get(saleId);

                const saleItems = db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(saleId);

                const saleDetails = {
                    ...baseSaleDetails,
                    customer_name: customer ? customer.name : null, 
                    customer_phone: customer ? customer.phone : null,
                    delivery_address: deliveryAddress,
                    invoice_manual_discount_amount: invoiceDiscountAmount,
                    invoice_manual_discount_type: invoiceDiscount.type,
                    loyalty_points: pointsEarned
                };
                
                return { success: true, saleId, saleDetails, saleItems };
            });

            return finalizeTransaction();

        } catch (err) {
            console.error("Error finalizing sale:", err);
            throw err;
        }
    });
    
    ipcMain.handle('sales:get', (event, dateRange) => db.prepare(
        `SELECT s.*, u.username, c.name as customer_name, sp.name as salesperson_name
         FROM sales s 
         LEFT JOIN users u ON s.user_id = u.id
         LEFT JOIN customers c ON s.customer_id = c.id
         LEFT JOIN salespersons sp ON s.salesperson_id = sp.id
         WHERE s.created_at BETWEEN ? AND ?
         ORDER BY s.created_at DESC`
    ).all(dateRange.start, dateRange.end));

    ipcMain.handle('sales:process-refund', (event, { saleId, userId }) => {
        try {
            const refundTransaction = db.transaction(() => {
                const originalSale = db.prepare("SELECT * FROM sales WHERE id = ?").get(saleId);
                if (!originalSale || originalSale.status !== 'completed') {
                    throw new Error("هذه الفاتورة غير صالحة للإرجاع.");
                }

                const originalItems = db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(saleId);
                
                const refundSaleSql = `INSERT INTO sales (user_id, shift_id, customer_id, salesperson_id, order_type, total_amount, sub_total, vat_amount, service_amount, delivery_fee_amount, payment_method, status, original_sale_id, refunded_by_user_id, refunded_at, invoice_manual_discount_amount, invoice_manual_discount_type, loyalty_points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`; 
                const refundResult = db.prepare(refundSaleSql).run(
                    originalSale.user_id,
                    originalSale.shift_id,
                    originalSale.customer_id,
                    originalSale.salesperson_id,
                    originalSale.order_type,
                    -originalSale.total_amount,
                    -originalSale.sub_total,
                    -originalSale.vat_amount,
                    -originalSale.service_amount,
                    -originalSale.delivery_fee_amount,
                    originalSale.payment_method,
                    'refunded', 
                    saleId,
                    userId,
                    new Date().toISOString().slice(0, 19).replace('T', ' '),
                    // استخدام قيم الخصم من الفاتورة الأصلية
                    -originalSale.invoice_manual_discount_amount, 
                    originalSale.invoice_manual_discount_type,
                    -originalSale.loyalty_points
                ); 
                const refundSaleId = refundResult.lastInsertRowid;

                const itemStmt = db.prepare("INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price_per_item, item_manual_discount_amount, item_manual_discount_type) VALUES (?, ?, ?, ?, ?, ?, ?)");
                const stockStmt = db.prepare("UPDATE products SET stock = stock + ? WHERE id = ? AND stock IS NOT NULL");
                
                for (const item of originalItems) {
                    itemStmt.run(
                        refundSaleId, 
                        item.product_id, 
                        item.product_name, 
                        -item.quantity, 
                        item.price_per_item,
                        -item.item_manual_discount_amount,
                        item.item_manual_discount_type
                    );
                    stockStmt.run(item.quantity, item.product_id);
                }
                
                db.prepare("UPDATE sales SET status = 'refunded' WHERE id = ?").run(saleId);
                
                if (originalSale.customer_id) {
                    db.prepare("UPDATE customers SET total_spent = total_spent - ? WHERE id = ?").run(originalSale.total_amount, originalSale.customer_id);

                    if (originalSale.loyalty_points > 0) { 
                        db.prepare("UPDATE customers SET loyalty_points = loyalty_points - ?, total_earned_loyalty_points = total_earned_loyalty_points - ? WHERE id = ?").run(originalSale.loyalty_points, originalSale.loyalty_points, originalSale.customer_id);
                    }
                }

                getMainWindow()?.webContents.send('products-updated');
                return { success: true };
            });

            return refundTransaction();
        } catch (err) {
            console.error("Error processing refund:", err);
            throw err;
        }
    });

    ipcMain.handle('sales:process-partial-refund', (event, { saleId, userId, itemsToRefund, totalRefundAmount, invoiceDiscountToDeduct, pointsToDeduct, originalSaleTotal }) => {
        try {
            const partialRefundTransaction = db.transaction(() => {
                const originalSale = db.prepare("SELECT * FROM sales WHERE id = ?").get(saleId);
                if (!originalSale) {
                    throw new Error("لم يتم العثور على الفاتورة الأصلية.");
                }
                
                const refundPercentage = totalRefundAmount / originalSaleTotal;
                const refundSubTotal = originalSale.sub_total * refundPercentage;
                const refundVatAmount = originalSale.vat_amount * refundPercentage;
                const refundServiceAmount = originalSale.service_amount * refundPercentage;
                const refundDeliveryFee = originalSale.delivery_fee_amount * refundPercentage;
                
                const refundSaleSql = `
                    INSERT INTO sales (
                        user_id, shift_id, customer_id, salesperson_id, order_type, total_amount, sub_total, 
                        vat_amount, service_amount, delivery_fee_amount, payment_method, status, 
                        original_sale_id, refunded_by_user_id, refunded_at, invoice_manual_discount_amount, 
                        invoice_manual_discount_type, loyalty_points
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const refundResult = db.prepare(refundSaleSql).run(
                    originalSale.user_id,
                    originalSale.shift_id,
                    originalSale.customer_id,
                    originalSale.salesperson_id,
                    originalSale.order_type,
                    -totalRefundAmount,
                    -refundSubTotal,
                    -refundVatAmount,
                    -refundServiceAmount,
                    -refundDeliveryFee,
                    originalSale.payment_method,
                    'refunded', 
                    saleId,
                    userId,
                    new Date().toISOString().slice(0, 19).replace('T', ' '),
                    -invoiceDiscountToDeduct,
                    originalSale.invoice_manual_discount_type,
                    -pointsToDeduct
                );
                const refundSaleId = refundResult.lastInsertRowid;
                
                const itemStmt = db.prepare("INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price_per_item, item_manual_discount_amount, item_manual_discount_type) VALUES (?, ?, ?, ?, ?, ?, ?)");
                const stockStmt = db.prepare("UPDATE products SET stock = stock + ? WHERE id = ? AND stock IS NOT NULL");
                
                for (const item of itemsToRefund) {
                    itemStmt.run(
                        refundSaleId, 
                        item.product_id, 
                        item.product_name, 
                        -item.quantity, 
                        item.price_per_item,
                        -item.item_manual_discount_amount,
                        item.item_manual_discount_type
                    );
                    stockStmt.run(item.quantity, item.product_id);
                }

                if (originalSale.customer_id) {
                    db.prepare("UPDATE customers SET total_spent = total_spent - ? WHERE id = ?").run(totalRefundAmount, originalSale.customer_id);
                    db.prepare("UPDATE customers SET loyalty_points = loyalty_points - ?, total_earned_loyalty_points = total_earned_loyalty_points - ? WHERE id = ?").run(pointsToDeduct, pointsToDeduct, originalSale.customer_id);
                }
                
                getMainWindow()?.webContents.send('products-updated');
                getMainWindow()?.webContents.send('sales-updated');

                return { success: true };
            });
            return partialRefundTransaction();
        } catch (err) {
            console.error("Error processing partial refund:", err);
            throw err;
        }
    });

    ipcMain.handle('sales:get-details', (event, saleId) => {
        try {
            const saleDetails = db.prepare(`
                SELECT s.*, u.username, c.name as customer_name, c.phone as customer_phone, ru.username as refunded_by_username, sp.name as salesperson_name
                FROM sales s 
                LEFT JOIN users u ON s.user_id = u.id 
                LEFT JOIN customers c ON s.customer_id = c.id
                LEFT JOIN users ru ON s.refunded_by_user_id = ru.id
                LEFT JOIN salespersons sp ON s.salesperson_id = sp.id
                WHERE s.id = ?`).get(saleId);
            
            const partialRefunds = db.prepare(`
                SELECT * FROM sales WHERE original_sale_id = ?
            `).all(saleId);
            
            const refundsWithItems = partialRefunds.map(refund => {
                const saleItems = db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(refund.id);
                return {
                    ...refund,
                    saleItems
                };
            });
            
            const saleItems = db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(saleId);

            if (!saleDetails) {
                throw new Error("لم يتم العثور على الفاتورة.");
            }

            return { success: true, saleDetails, saleItems, partialRefunds: refundsWithItems };
        } catch (error) {
            console.error(`Error getting details for sale ${saleId}:`, error);
            throw error;
        }
    });
};
