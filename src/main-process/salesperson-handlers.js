const db = require('../../database'); // تأكد من المسار الصحيح لقاعدة البيانات

/**
 * تهيئة معالجات IPC للبائعين (Salespersons).
 * هذه الدوال تتفاعل مع قاعدة البيانات لإدارة بيانات البائعين.
 * @param {Electron.IpcMain} ipcMain - كائن IPC الرئيسي من Electron.
 */
function initializeSalespersonHandlers(ipcMain) {
    console.log("Initializing Salesperson IPC handlers...");

    ipcMain.handle('get-all-salespersons', async (event) => {
        try {
            // جلب جميع البائعين أولاً
            const salespersons = db.prepare("SELECT * FROM salespersons ORDER BY name ASC").all();

            // لكل بائع، جلب إحصائيات المبيعات
            const salespersonsWithStats = salespersons.map(salesperson => {
                const stats = db.prepare(`
                    SELECT 
                        COUNT(id) AS total_sales_count,
                        COALESCE(SUM(total_amount), 0) AS total_sales_amount -- استخدام COALESCE لضمان 0 بدلاً من NULL
                    FROM sales
                    WHERE salesperson_id = ? AND status = 'completed'
                `).get(salesperson.id);

                // سجل الإحصائيات التي تم جلبها لكل بائع
                console.log(`Sales stats for ${salesperson.name} (ID: ${salesperson.id}):`, stats);

                // إضافة الإحصائيات إلى كائن البائع
                return {
                    ...salesperson,
                    total_sales_count: stats.total_sales_count || 0, // التأكد من 0 إذا كان null
                    total_sales_amount: stats.total_sales_amount || 0 // التأكد من 0 إذا كان null
                };
            });

            // سجل البيانات النهائية التي سيتم إرسالها إلى الواجهة الأمامية
            console.log("Salespersons data sent to renderer:", salespersonsWithStats);

            return { success: true, data: salespersonsWithStats };
        } catch (error) {
            console.error('Failed to get all salespersons with stats:', error.message);
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('add-salesperson', async (event, salespersonData) => {
        try {
            const { name, phone } = salespersonData;
            if (!name) {
                return { success: false, message: 'Salesperson name is required.' };
            }
            const stmt = db.prepare("INSERT INTO salespersons (name, phone) VALUES (?, ?)");
            const info = stmt.run(name, phone || null);
            return { success: true, data: { id: info.lastInsertRowid, ...salespersonData } };
        } catch (error) {
            console.error('Failed to add salesperson:', error.message);
            if (error.message.includes('UNIQUE constraint failed')) {
                return { success: false, message: 'Salesperson with this name or phone already exists.' };
            }
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('update-salesperson', async (event, salespersonData) => {
        try {
            const { id, name, phone, is_active } = salespersonData;
            if (!id || !name) {
                return { success: false, message: 'Salesperson ID and name are required for update.' };
            }
            const stmt = db.prepare("UPDATE salespersons SET name = ?, phone = ?, is_active = ? WHERE id = ?");
            const info = stmt.run(name, phone || null, is_active, id);
            if (info.changes === 0) {
                return { success: false, message: 'Salesperson not found or no changes made.' };
            }
            return { success: true, data: salespersonData };
        } catch (error) {
            console.error('Failed to update salesperson:', error.message);
            if (error.message.includes('UNIQUE constraint failed')) {
                return { success: false, message: 'Salesperson with this name or phone already exists.' }; // تم إزالة الفاصلة المنقوطة الزائدة هنا
            }
            return { success: false, message: error.message };
        }
    });


    ipcMain.handle('delete-salesperson', async (event, salespersonId) => {
        try {
            const stmt = db.prepare("DELETE FROM salespersons WHERE id = ?");
            const info = stmt.run(salespersonId);
            if (info.changes === 0) {
                return { success: false, message: 'Salesperson not found.' };
            }
            return { success: true, message: 'Salesperson deleted successfully.' };
        } catch (error) {
            console.error('Failed to delete salesperson:', error.message);
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('get-salesperson-by-id', async (event, id) => {
        try {
            const salesperson = db.prepare("SELECT * FROM salespersons WHERE id = ?").get(id);
            if (!salesperson) {
                return { success: false, message: 'Salesperson not found.' };
            }
            return { success: true, data: salesperson };
        } catch (error) {
            console.error('Failed to get salesperson by ID:', error.message);
            return { success: false, message: error.message };
        }
    });

    console.log("...Salesperson IPC handlers initialized.");
}

module.exports = initializeSalespersonHandlers;
