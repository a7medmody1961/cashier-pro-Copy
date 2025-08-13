const db = require('../../database');

module.exports = (ipcMain, getMainWindow) => {
    ipcMain.handle('shift:start', (event, { startingCash, userId }) => {
        try {
            const sql = `INSERT INTO shifts (user_id, start_time, starting_cash, status) VALUES (?, datetime('now', 'localtime'), ?, ?)`;
            const result = db.prepare(sql).run(userId, startingCash, 'open');
            const shift = db.prepare("SELECT s.*, u.username FROM shifts s JOIN users u ON s.user_id = u.id WHERE s.id = ?").get(result.lastInsertRowid);
            getMainWindow()?.webContents.send('shift-updated', shift);
            return shift;
        } catch (error) {
            console.error("Error starting shift:", error);
            throw error;
        }
    });

    ipcMain.handle('shift:getActive', () => {
        try {
            return db.prepare("SELECT s.*, u.username FROM shifts s JOIN users u ON s.user_id = u.id WHERE s.status = 'open' LIMIT 1").get();
        } catch (error) {
            console.error("Error getting active shift:", error);
            return null;
        }
    });

    ipcMain.handle('shift:end', (event, { shiftId, endingCash }) => {
        try {
            const shift = db.prepare("SELECT * FROM shifts WHERE id = ?").get(shiftId);
            if (!shift) throw new Error("Shift not found.");

            const sales = db.prepare("SELECT total_amount, payment_method, manual_discount_amount FROM sales WHERE shift_id = ? AND status = 'completed'").all(shiftId);
            const refunds = db.prepare("SELECT total_amount FROM sales WHERE shift_id = ? AND status = 'refunded'").all(shiftId);

            const totalSales = sales.reduce((sum, s) => sum + s.total_amount, 0);
            const totalRefunds = refunds.reduce((sum, r) => sum + r.total_amount, 0);
            const netSales = totalSales + totalRefunds; 
            const totalCashSales = sales.filter(s => s.payment_method === 'Cash').reduce((sum, s) => sum + s.total_amount, 0);
            const totalCardSales = sales.filter(s => s.payment_method === 'Card').reduce((sum, s) => sum + s.total_amount, 0);
            
            const totalManualDiscount = sales.reduce((sum, s) => sum + (s.manual_discount_amount || 0), 0);

            const updateQuery = `UPDATE shifts SET end_time = datetime('now', 'localtime'), ending_cash = ?, total_sales = ?, status = 'closed' WHERE id = ?`;
            db.prepare(updateQuery).run(endingCash, netSales, shiftId);

            return {
                success: true,
                summary: {
                    shiftId: shift.id, startTime: shift.start_time, endTime: new Date().toISOString(),
                    startingCash: shift.starting_cash, endingCash: endingCash, totalSales: totalSales,
                    totalRefunds: Math.abs(totalRefunds), netSales: netSales, totalCashSales: totalCashSales,
                    totalCardSales: totalCardSales,
                    cashDifference: endingCash - (shift.starting_cash + totalCashSales + totalRefunds),
                    totalManualDiscount: totalManualDiscount 
                }
            };
        } catch (error) {
            console.error("Error ending shift:", error);
            throw error;
        }
    });

    ipcMain.handle('shift:getAllClosed', () => {
        try {
            const sql = `
                SELECT 
                    s.id, 
                    s.user_id, 
                    u.username, 
                    s.start_time, 
                    s.end_time, 
                    s.starting_cash, 
                    s.ending_cash, 
                    s.total_sales, 
                    s.status
                FROM shifts s
                JOIN users u ON s.user_id = u.id
                WHERE s.status = 'closed'
                ORDER BY s.end_time DESC
            `;
            return db.prepare(sql).all();
        } catch (error) {
            console.error("Error getting all closed shifts:", error);
            throw error;
        }
    });

    ipcMain.handle('shift:getDetails', (event, shiftId) => {
        try {
            // Get the shift details
            const shift = db.prepare("SELECT s.*, u.username FROM shifts s JOIN users u ON s.user_id = u.id WHERE s.id = ?").get(shiftId);
            if (!shift) throw new Error("Shift not found.");

            // Get sales associated with this shift
            const sales = db.prepare("SELECT * FROM sales WHERE shift_id = ? ORDER BY created_at DESC").all(shiftId);

            const expenses = []; // Or fetch all expenses if not tied to shifts, e.g., db.prepare("SELECT * FROM expenses ORDER BY created_at DESC").all();
            // ** END: Removed the expenses query **

            return {
                shift,
                sales,
                expenses // Now this will be an empty array, preventing the error
            };
        } catch (error) {
            console.error(`Error getting details for shift ID ${shiftId}:`, error);
            throw error;
        }
    });
};