const { ipcMain, dialog, app } = require('electron');
const db = require('../../database');
const path = require('path');
const fs = require('fs');

const IMAGES_PATH = path.join(app.getPath('userData'), 'product_images');
if (!fs.existsSync(IMAGES_PATH)) fs.mkdirSync(IMAGES_PATH, { recursive: true });

module.exports = (ipcMain, getMainWindow) => {
    //
    // Product Handlers - وظائف إدارة المنتجات
    //
    ipcMain.handle('products:get', () => {
        try {
            // تعديل الاستعلام لجلب اسم الفئة أيضًا
            const products = db.prepare(`
                SELECT 
                    p.*,
                    c.name AS category_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                ORDER BY p.id DESC
            `).all();
            return products.map(p => ({ ...p, image_path: p.image_path ? `file://${path.join(IMAGES_PATH, p.image_path)}` : null }));
        } catch (err) { console.error(err); return []; }
    });

    ipcMain.handle('products:add', (event, product) => {
        try {
            // تعديل الإضافة لقبول category_id
            const info = db.prepare('INSERT INTO products (name, barcode, price, cost_price, stock, image_path, shortcut_key, icon_name, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(product.name, product.barcode, product.price, product.cost_price, product.stock, product.image_path, product.shortcut_key, product.icon_name || null, product.category_id);
            getMainWindow()?.webContents.send('products-updated');
            return { success: true, id: info.lastInsertRowid };
        } catch (err) { console.error(err); return { success: false, message: err.message }; }
    });
    
    ipcMain.handle('products:update', (event, product) => {
        try {
            // تعديل التحديث لقبول category_id
            const info = db.prepare('UPDATE products SET name = ?, barcode = ?, price = ?, cost_price = ?, stock = ?, image_path = ?, shortcut_key = ?, icon_name = ?, category_id = ? WHERE id = ?').run(product.name, product.barcode, product.price, product.cost_price, product.stock, product.image_path, product.shortcut_key, product.icon_name || null, product.category_id, product.id);
            getMainWindow()?.webContents.send('products-updated');
            return { success: true, changes: info.changes };
        } catch (err) { console.error(err); return { success: false, message: err.message }; }
    });

    ipcMain.handle('products:delete', (event, id) => {
        try {
            const product = db.prepare('SELECT image_path FROM products WHERE id = ?').get(id);
            if (product && product.image_path) {
                const imageFile = path.join(IMAGES_PATH, product.image_path);
                if (fs.existsSync(imageFile)) fs.unlinkSync(imageFile);
            }
            db.prepare('DELETE FROM products WHERE id = ?').run(id);
            getMainWindow()?.webContents.send('products-updated');
            return { success: true };
        } catch (err) { console.error(err); return { success: false, message: err.message }; }
    });

    ipcMain.handle('products:select-image', async () => {
        const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Images', extensions: ['jpg', 'png'] }] });
        if (result.canceled) return { success: false };
        const filePath = result.filePaths[0];
        const fileName = `${Date.now()}-${path.basename(filePath)}`;
        const newPath = path.join(IMAGES_PATH, fileName);
        fs.copyFileSync(filePath, newPath);
        return { success: true, path: fileName, fullPath: `file://${newPath}` };
    });

    //
    // Categories Handlers - وظائف إدارة الفئات الجديدة
    //
    ipcMain.handle('categories:get', () => {
        try {
            return db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
        } catch (err) { console.error(err); return []; }
    });

    ipcMain.handle('categories:add', (event, name) => {
        try {
            const info = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
            getMainWindow()?.webContents.send('categories-updated');
            return { success: true, id: info.lastInsertRowid };
        } catch (err) { console.error(err); return { success: false, message: err.message }; }
    });

    ipcMain.handle('categories:update', (event, category) => {
        try {
            const info = db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(category.name, category.id);
            getMainWindow()?.webContents.send('categories-updated');
            return { success: true, changes: info.changes };
        } catch (err) { console.error(err); return { success: false, message: err.message }; }
    });

    ipcMain.handle('categories:delete', (event, id) => {
        try {
            const info = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
            getMainWindow()?.webContents.send('categories-updated');
            return { success: true, changes: info.changes };
        } catch (err) { console.error(err); return { success: false, message: err.message }; }
    });
};
