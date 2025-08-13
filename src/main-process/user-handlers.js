const { ipcMain } = require('electron');
const db = require('../../database');

function initializeUserHandlers() {
    ipcMain.handle('users:get', () => {
        try {
            // استبعاد كلمة المرور من النتائج، وإضافة حقل الصورة الرمزية
            const users = db.prepare('SELECT id, username, role, permissions, avatar FROM users').all();
            return users;
        } catch (error) {
            console.error('Failed to get users:', error);
            return [];
        }
    });

    // دالة جديدة لجلب المستخدمين المحفوظين (الذين لديهم صور رمزية)
    ipcMain.handle('users:getSaved', () => {
        try {
            // جلب المستخدمين الذين لديهم قيمة في حقل الصورة الرمزية (avatar is NOT NULL)
            const savedUsers = db.prepare('SELECT id, username, avatar FROM users WHERE avatar IS NOT NULL').all();
            return savedUsers;
        } catch (error) {
            console.error('Failed to get saved users:', error);
            return [];
        }
    });

    ipcMain.handle('users:add', (event, user) => {
        try {
            // تخزين كلمة المرور والصورة الرمزية كنص عادي
            const query = 'INSERT INTO users (username, password, role, permissions, avatar) VALUES (?, ?, ?, ?, ?)';
            const permissions = JSON.stringify(user.permissions);
            const info = db.prepare(query).run(user.username, user.password, user.role, permissions, user.avatar);
            return { success: true, id: info.lastInsertRowid };
        } catch (error) {
            console.error('Failed to add user:', error);
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('users:update', (event, user) => {
        try {
            const permissions = JSON.stringify(user.permissions);
            if (user.password) {
                // تحديث كلمة المرور والصورة الرمزية
                const query = 'UPDATE users SET username = ?, password = ?, role = ?, permissions = ?, avatar = ? WHERE id = ?';
                db.prepare(query).run(user.username, user.password, user.role, permissions, user.avatar, user.id);
            } else {
                // التحديث بدون تغيير كلمة المرور، مع تحديث الصورة الرمزية
                const query = 'UPDATE users SET username = ?, role = ?, permissions = ?, avatar = ? WHERE id = ?';
                db.prepare(query).run(user.username, user.role, permissions, user.avatar, user.id);
            }
            return { success: true };
        } catch (error) {
            console.error('Failed to update user:', error);
            return { success: false, message: error.message };
        }
    });

    // جديد: معالج لتحديث أذونات مستخدم محدد
    ipcMain.handle('users:updatePermissions', (event, userId, newPermissions) => {
        try {
            const permissions = JSON.stringify(newPermissions);
            const query = 'UPDATE users SET permissions = ? WHERE id = ?';
            db.prepare(query).run(permissions, userId);
            return { success: true };
        } catch (error) {
            console.error(`Failed to update permissions for user ${userId}:`, error);
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('users:delete', (event, id) => {
        try {
            // منع حذف المستخدم المسؤول الرئيسي
            if (id === 1) {
                return { success: false, message: 'لا يمكن حذف المستخدم المسؤول الرئيسي' };
            }
            db.prepare('DELETE FROM users WHERE id = ?').run(id);
            return { success: true };
        } catch (error) {
            console.error('Failed to delete user:', error);
            return { success: false, message: error.message };
        }
    });
}

module.exports = initializeUserHandlers;
