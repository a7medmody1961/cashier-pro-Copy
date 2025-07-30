const db = require('../../database');

module.exports = (ipcMain, getMainWindow) => {
    // Handler to start a new shift
    ipcMain.handle('shift:start', (event, { startingCash, userId }) => {
        try {
            const sql = `INSERT INTO shifts (user_id, start_time, starting_cash, status) VALUES (?, datetime('now', 'localtime'), ?, ?)`;
            const result = db.prepare(sql).run(userId, startingCash, 'open');
            // Fetch the newly started shift with the username
            const shift = db.prepare("SELECT s.*, u.username FROM shifts s JOIN users u ON s.user_id = u.id WHERE s.id = ?").get(result.lastInsertRowid);
            getMainWindow()?.webContents.send('shift-updated', shift);
            return shift;
        } catch (error) {
            console.error("Error starting shift:", error);
            throw error;
        }
    });

    // Handler to get the currently active (open) shift
    ipcMain.handle('shift:getActive', () => {
        try {
            // Fetch the active shift with the username
            return db.prepare("SELECT s.*, u.username FROM shifts s JOIN users u ON s.user_id = u.id WHERE s.status = 'open' LIMIT 1").get();
        } catch (error) {
            console.error("Error getting active shift:", error);
            return null;
        }
    });

    // Handler to end an active shift
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

    // NEW: Handler to get all closed shifts for review
    ipcMain.handle('shift:getAllClosed', () => {
        try {
            console.log("Attempting to fetch all closed shifts (Actual Handler)..."); // ADDED/MODIFIED LINE
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
            const shifts = db.prepare(sql).all(); 
            console.log("Fetched closed shifts (Actual Handler):", shifts); // ADDED/MODIFIED LINE
            return shifts;
        } catch (error) {
            console.error("Error getting all closed shifts:", error);
            throw error;
        }
    });

    // NEW: Handler to get details of a specific shift (e.g., sales within that shift)
    ipcMain.handle('shift:getDetails', (event, shiftId) => {
        try {
            // Get the shift details
            const shift = db.prepare("SELECT s.*, u.username FROM shifts s JOIN users u ON s.user_id = u.id WHERE s.id = ?").get(shiftId);
            if (!shift) throw new Error("Shift not found.");

            // Get sales associated with this shift
            const sales = db.prepare("SELECT * FROM sales WHERE shift_id = ? ORDER BY created_at DESC").all(shiftId); // Changed to created_at from sale_date

            // Get expenses associated with this shift (assuming expenses also have a shift_id)
            const expenses = db.prepare("SELECT * FROM expenses WHERE shift_id = ? ORDER BY created_at DESC").all(shiftId); 

            return {
                shift,
                sales,
                expenses 
            };
        } catch (error) {
            console.error(`Error getting details for shift ID ${shiftId}:`, error);
            throw error;
        }
    });

    // ADD THIS NEW TEST HANDLER
    ipcMain.handle('shift:testConnection', () => {
        console.log("shift:testConnection handler called!");
        return "Test connection successful from main process!";
    });
};