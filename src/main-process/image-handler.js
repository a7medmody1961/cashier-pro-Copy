const { ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp'); // استيراد مكتبة sharp لمعالجة الصور

/**
 * دالة مساعدة لحفظ الصورة المرفوعة
 * @param {string} sourcePath - المسار الأصلي للصورة.
 * @param {string} destinationDir - المجلد الذي سيتم حفظ الصورة فيه.
 * @returns {Promise<string|null>} - مسار الصورة الجديد بعد الحفظ أو null في حالة الفشل.
 */
async function saveAndOptimizeImage(sourcePath, destinationDir) {
    try {
        if (!fs.existsSync(destinationDir)) {
            fs.mkdirSync(destinationDir, { recursive: true });
        }

        const newFilename = `${crypto.randomUUID()}.webp`;
        const newPath = path.join(destinationDir, newFilename);

        // استخدام مكتبة sharp لضغط وتغيير حجم الصورة
        await sharp(sourcePath)
            .resize(120, 120, {
                // تحديد حجم ثابت 120x120 للأفاتار وصور المنتجات
                fit: sharp.fit.cover,
                position: sharp.strategy.entropy
            })
            .webp({ quality: 80 }) // ضغط الصورة بصيغة WebP بجودة 80%
            .toFile(newPath); // حفظ الصورة المعدلة

        console.log(`Optimized image saved to: ${newPath}`);
        // إرجاع اسم الملف فقط، وليس المسار الكامل
        return newFilename;
    } catch (error) {
        console.error('Failed to save and optimize image:', error);
        return null;
    }
}

/**
 * Initializes IPC handlers for image-related operations.
 * @param {Electron.IpcMain} ipcMain The ipcMain instance.
 */
function initializeImageHandler(ipcMain) {
    // Handler for saving user avatars
    ipcMain.handle('image:save', async (event, filePath) => {
        const appDataPath = app.getPath('userData');
        const avatarsDir = path.join(appDataPath, 'user-avatars');
        const newFileName = await saveAndOptimizeImage(filePath, avatarsDir);
        if (newFileName) {
            // المسار النسبي من مجلد views/
            const relativePath = `../assets/avatars/${newFileName}`;
            return relativePath;
        }
        return null;
    });

    // Handler for saving product images
    ipcMain.handle('products:save-image', async (event, filePath) => {
        const appDataPath = app.getPath('userData');
        const imagesDir = path.join(appDataPath, 'product_images');
        const newFileName = await saveAndOptimizeImage(filePath, imagesDir);
        if (newFileName) {
            return newFileName;
        }
        return null;
    });
}

module.exports = initializeImageHandler;
