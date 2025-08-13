const { dialog } = require('electron');
const ExcelJS = require('exceljs');
const db = require('../../database');

// دوال مساعدة للتعامل مع قاعدة البيانات
const dbAll = (sql, params = []) => db.prepare(sql).all(params);
const dbRun = (sql, params = []) => db.prepare(sql).run(params);
const dbTransaction = (func) => db.transaction(func);

const HEADER_STYLE = {
    font: { bold: true, size: 16, name: 'Arial', color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    height: 40,
};

const ROW_STYLE = {
    font: { name: 'Arial', size: 12 },
    alignment: { vertical: 'middle', horizontal: 'center' },
    height: 25,
};

const BORDER_STYLE = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
};

/**
 * تطبيق الأنماط على صف الرأس في ورقة العمل
 * @param {ExcelJS.Row} headerRow - صف الرأس
 */
function applyHeaderStyles(headerRow) {
    headerRow.font = HEADER_STYLE.font;
    headerRow.fill = HEADER_STYLE.fill;
    headerRow.alignment = HEADER_STYLE.alignment;
    headerRow.height = HEADER_STYLE.height;
    headerRow.eachCell((cell) => {
        cell.border = BORDER_STYLE;
    });
}

/**
 * تطبيق الأنماط على صف بيانات في ورقة العمل
 * @param {ExcelJS.Row} row - صف البيانات
 */
function applyRowStyles(row) {
    row.font = ROW_STYLE.font;
    row.alignment = ROW_STYLE.alignment;
    row.height = ROW_STYLE.height;
    row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = BORDER_STYLE;
    });
}

const ENTITY_CONFIGS = {
    products: {
        // --- إعدادات التصدير ---
        export: {
            sheetName: 'Products',
            fileName: 'products_export.xlsx',
            sqlQuery: `
                SELECT 
                    p.id, p.name, p.barcode, p.price, p.cost_price, p.stock,
                    p.image_path, p.icon_name, p.shortcut_key, c.name AS category_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                ORDER BY p.id
            `,
            headers: [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'اسم المنتج', key: 'name', width: 35 },
                { header: 'الباركود', key: 'barcode', width: 20 },
                { header: 'سعر البيع', key: 'price', width: 15 },
                { header: 'سعر التكلفة', key: 'cost_price', width: 15 },
                { header: 'المخزون', key: 'stock', width: 15 },
                { header: 'مسار الصورة', key: 'image_path', width: 30 },
                { header: 'اسم الأيقونة', key: 'icon_name', width: 20 },
                { header: 'مفتاح الاختصار', key: 'shortcut_key', width: 20 },
                { header: 'اسم الفئة', key: 'category_name', width: 25 },
            ],
        },
        // --- إعدادات الاستيراد ---
        import: {
            entityName: 'المنتجات',
            headerMapping: {
                'الباركود': 'barcode',
                'اسم المنتج': 'name',
                'سعر البيع': 'price',
                'سعر التكلفة': 'cost_price',
                'المخزون': 'stock',
                'مسار الصورة': 'image_path',
                'مفتاح الاختصار': 'shortcut_key',
                'اسم الأيقونة': 'icon_name',
                'اسم الفئة': 'category_name',
            },
            requiredHeaders: ['اسم المنتج', 'سعر البيع'],
            processData: (products, mainWindow) => {
                // ملاحظة: حقل 'image_path' يمكن أن يحتوي على مسار كامل للصورة على جهاز المستخدم
                // (مثال: "C:\\Users\\User\\Desktop\\image.png") أو مجرد اسم الملف.
                // النظام سيحفظ النص كما هو في قاعدة البيانات.
                const categories = dbAll("SELECT id, name FROM categories");
                const categoryMap = new Map(categories.map(c => [c.name, c.id]));

                const getOrAddCategory = (categoryName) => {
                    if (!categoryName) return null;
                    let categoryId = categoryMap.get(categoryName);
                    if (!categoryId) {
                        const result = dbRun("INSERT INTO categories (name) VALUES (?)", [categoryName]);
                        categoryId = result.lastInsertRowid;
                        categoryMap.set(categoryName, categoryId);
                    }
                    return categoryId;
                };

                const upsertStmt = db.prepare(`
                    INSERT INTO products (name, barcode, price, cost_price, stock, image_path, shortcut_key, icon_name, category_id)
                    VALUES (@name, @barcode, @price, @cost_price, @stock, @image_path, @shortcut_key, @icon_name, @category_id)
                    ON CONFLICT(barcode) WHERE barcode IS NOT NULL DO UPDATE SET
                        name = excluded.name,
                        price = excluded.price,
                        cost_price = excluded.cost_price,
                        stock = excluded.stock,
                        image_path = excluded.image_path,
                        shortcut_key = excluded.shortcut_key,
                        icon_name = excluded.icon_name,
                        category_id = excluded.category_id;
                `);

                dbTransaction(() => {
                    for (const p of products) {
                        const category_id = getOrAddCategory(p.category_name);
                        upsertStmt.run({
                            name: p.name,
                            barcode: p.barcode || null,
                            price: parseFloat(p.price) || 0,
                            cost_price: parseFloat(p.cost_price) || 0,
                            stock: (p.stock === '∞' || p.stock === null || p.stock === undefined) ? null : parseInt(p.stock, 10),
                            image_path: p.image_path || null,
                            shortcut_key: p.shortcut_key || null,
                            icon_name: p.icon_name || null,
                            category_id: category_id,
                        });
                    }
                })();

                mainWindow?.webContents.send('products-updated');
                mainWindow?.webContents.send('categories-updated');
            }
        },
        // --- إعدادات قالب التنزيل ---
        template: {
            sheetName: 'Products Template',
            fileName: 'products_template.xlsx',
            headers: ['الباركود', 'اسم المنتج', 'سعر البيع', 'سعر التكلفة', 'المخزون', 'مسار الصورة', 'مفتاح الاختصار', 'اسم الأيقونة', 'اسم الفئة'],
            explanation: [
                'أضف باركود المنتج هنا (فريد)', 'أضف اسم المنتج هنا', 'سعر البيع (مطلوب)', 'سعر التكلفة (اختياري)', "المخزون (اتركه فارغاً لـ 'غير محدود')", 'مسار كامل للصورة أو اسمها (اختياري)', 'مفتاح اختصار (حرف واحد)', 'اسم أيقونة Font Awesome', 'اسم الفئة (سيتم إنشاؤها إذا لم تكن موجودة)'
            ],
            columnWidths: [20, 35, 15, 15, 20, 30, 20, 25, 25],
        }
    },
    customers: {
        // --- إعدادات التصدير ---
        export: {
            sheetName: 'Customers',
            fileName: 'customers_export.xlsx',
            sqlQuery: `
                SELECT
                    c.id, c.name, c.phone, ca.address AS default_address, c.order_count, c.total_spent,
                    c.loyalty_points, c.total_earned_loyalty_points, c.total_redeemed_loyalty_points
                FROM customers c
                LEFT JOIN customer_addresses ca ON c.id = ca.customer_id AND ca.is_default = 1
                ORDER BY c.id
            `,
            headers: [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'اسم العميل', key: 'name', width: 30 },
                { header: 'رقم الهاتف', key: 'phone', width: 25 },
                { header: 'العنوان الافتراضي', key: 'default_address', width: 40 },
                { header: 'عدد الطلبات', key: 'order_count', width: 15 },
                { header: 'إجمالي الإنفاق', key: 'total_spent', width: 20 },
                { header: 'نقاط الولاء المتبقية', key: 'loyalty_points', width: 20 },
                { header: 'النقاط المكتسبة الكلية', key: 'total_earned_loyalty_points', width: 25 },
                { header: 'النقاط التي تم استخدامها سابقًا', key: 'total_redeemed_loyalty_points', width: 25 },
            ],
        },
        // --- إعدادات الاستيراد ---
        import: {
            entityName: 'العملاء',
            headerMapping: {
                'اسم العميل': 'name',
                'رقم الهاتف': 'phone',
                'العنوان الافتراضي': 'default_address',
                'عدد الطلبات': 'order_count',
                'إجمالي الإنفاق': 'total_spent',
                'نقاط الولاء المتبقية': 'loyalty_points',
                'النقاط المكتسبة الكلية': 'total_earned_loyalty_points',
                'النقاط التي تم استخدامها سابقًا': 'total_redeemed_loyalty_points',
            },
            requiredHeaders: ['اسم العميل', 'رقم الهاتف'],
            processData: (customers, mainWindow) => {
                const customerUpsertStmt = db.prepare(`
                    INSERT INTO customers (name, phone, order_count, total_spent, loyalty_points, total_earned_loyalty_points, total_redeemed_loyalty_points)
                    VALUES (@name, @phone, @order_count, @total_spent, @loyalty_points, @total_earned_loyalty_points, @total_redeemed_loyalty_points)
                    ON CONFLICT(phone) DO UPDATE SET 
                        name = excluded.name,
                        order_count = excluded.order_count,
                        total_spent = excluded.total_spent,
                        loyalty_points = excluded.loyalty_points,
                        total_earned_loyalty_points = excluded.total_earned_loyalty_points,
                        total_redeemed_loyalty_points = excluded.total_redeemed_loyalty_points
                    RETURNING id;
                `);
                
                const addressUpsertStmt = db.prepare(`
                    INSERT INTO customer_addresses (customer_id, address, is_default)
                    VALUES (@customer_id, @address, 1)
                    ON CONFLICT(customer_id) WHERE is_default = 1 DO UPDATE SET address = excluded.address;
                `);

                dbTransaction(() => {
                    for (const c of customers) {
                        if (!c.name || !c.phone) continue; // تخطي الصفوف الفارغة
                        
                        const result = customerUpsertStmt.get({
                            name: c.name,
                            phone: c.phone,
                            order_count: parseInt(c.order_count, 10) || 0,
                            total_spent: parseFloat(c.total_spent) || 0,
                            loyalty_points: parseInt(c.loyalty_points, 10) || 0,
                            total_earned_loyalty_points: parseInt(c.total_earned_loyalty_points, 10) || 0,
                            total_redeemed_loyalty_points: parseInt(c.total_redeemed_loyalty_points, 10) || 0,
                        });
                        const customerId = result.id;

                        if (customerId && c.default_address) {
                            addressUpsertStmt.run({
                                customer_id: customerId,
                                address: c.default_address,
                            });
                        }
                    }
                })();
                mainWindow?.webContents.send('customers-updated');
            }
        },
        // --- إعدادات قالب التنزيل ---
        template: {
            sheetName: 'Customers Template',
            fileName: 'customers_template.xlsx',
            headers: ['اسم العميل', 'رقم الهاتف', 'العنوان الافتراضي', 'عدد الطلبات', 'إجمالي الإنفاق', 'نقاط الولاء المتبقية', 'النقاط المكتسبة الكلية', 'النقاط التي تم استخدامها سابقًا'],
            explanation: [
                'أضف اسم العميل هنا (مطلوب)', 
                'أضف رقم هاتف العميل هنا (مطلوب وفريد)', 
                'أضف العنوان الافتراضي هنا (اختياري)',
                '0',
                '0.00',
                '0',
                '0',
                '0'
            ],
            columnWidths: [30, 25, 40, 15, 20, 20, 25, 25],
        }
    }
};


/**
 * دالة عامة لتصدير البيانات إلى ملف Excel
 * @param {object} config - إعدادات التصدير
 * @param {BrowserWindow} mainWindow - نافذة التطبيق الرئيسية
 */
async function handleExport(config, mainWindow) {
    try {
        const data = dbAll(config.sqlQuery);

        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: `تصدير ${config.sheetName} إلى Excel`,
            defaultPath: config.fileName,
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
        });

        if (!filePath) {
            return { success: false, message: 'تم إلغاء التصدير.' };
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Cashier Pro';
        const worksheet = workbook.addWorksheet(config.sheetName, {
            views: [{ rightToLeft: true }]
        });

        worksheet.columns = config.headers;

        // إضافة وتنسيق الرأس
        const headerRow = worksheet.getRow(1);
        applyHeaderStyles(headerRow);

        // إضافة البيانات وتنسيق الصفوف
        data.forEach((item, index) => {
            const row = worksheet.getRow(index + 2);
            row.values = item;
            applyRowStyles(row);
        });

        await workbook.xlsx.writeFile(filePath);
        return { success: true, path: filePath };

    } catch (error) {
        console.error(`Error exporting ${config.sheetName}:`, error);
        return { success: false, message: `فشل تصدير ${config.sheetName}: ${error.message}` };
    }
}

/**
 * دالة عامة لاستيراد البيانات من ملف Excel
 * @param {object} config - إعدادات الاستيراد
 * @param {BrowserWindow} mainWindow - نافذة التطبيق الرئيسية
 */
async function handleImport(config, mainWindow) {
    try {
        const { filePaths } = await dialog.showOpenDialog(mainWindow, {
            title: `استيراد ${config.entityName} من Excel`,
            properties: ['openFile'],
            filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
        });

        if (!filePaths || filePaths.length === 0) {
            return { success: false, message: 'تم إلغاء الاستيراد.' };
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePaths[0]);
        const worksheet = workbook.getWorksheet(1);

        if (!worksheet) {
            throw new Error('ملف Excel لا يحتوي على أوراق عمل.');
        }

        const headerRow = worksheet.getRow(1);
        const actualHeaders = headerRow.values.filter(h => h); // إزالة القيم الفارغة

        // التحقق من وجود الأعمدة المطلوبة
        const missingHeaders = config.requiredHeaders.filter(h => !actualHeaders.includes(h));
        if (missingHeaders.length > 0) {
            throw new Error(`ملف Excel غير صالح. الأعمدة المطلوبة مفقودة: ${missingHeaders.join(', ')}`);
        }
        
        const data = [];
        // ابدأ القراءة من الصف الثاني (بعد صف الرأس)
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1) return; // تخطي صف الرأس

            const rowData = {};
            let isEmptyRow = true;
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const headerName = actualHeaders[colNumber - 1];
                const propertyName = config.headerMapping[headerName];
                if (propertyName) {
                    rowData[propertyName] = cell.value;
                    if(cell.value) isEmptyRow = false;
                }
            });
            
            if(!isEmptyRow) {
                data.push(rowData);
            }
        });

        if (data.length === 0) {
            throw new Error('ملف Excel فارغ أو لا يحتوي على بيانات صالحة.');
        }

        // معالجة البيانات وإدخالها في قاعدة البيانات
        config.processData(data, mainWindow);

        return { success: true, count: data.length };

    } catch (error) {
        console.error(`Error importing ${config.entityName}:`, error);
        return { success: false, message: `فشل استيراد ${config.entityName}: ${error.message}` };
    }
}

/**
 * دالة عامة لتنزيل قالب Excel
 * @param {object} config - إعدادات القالب
 * @param {BrowserWindow} mainWindow - نافذة التطبيق الرئيسية
 */
async function handleDownloadTemplate(config, mainWindow) {
    try {
        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: `تحميل قالب ${config.sheetName}`,
            defaultPath: config.fileName,
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
        });

        if (!filePath) {
            return { success: false, message: 'تم إلغاء التحميل.' };
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(config.sheetName, {
            views: [{ rightToLeft: true }]
        });

        // إعداد الأعمدة
        worksheet.columns = config.headers.map((header, index) => ({
            header,
            key: header,
            width: config.columnWidths[index]
        }));

        // تنسيق صف الرأس
        applyHeaderStyles(worksheet.getRow(1));

        // إضافة صف الشرح وتنسيقه
        const explanationRow = worksheet.getRow(2);
        explanationRow.values = config.explanation;
        // --- التعديل المطلوب هنا ---
        explanationRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF000000'} };
        explanationRow.alignment = { ...ROW_STYLE.alignment, wrapText: true };
        explanationRow.height = 40;
        
        // تطبيق الحدود على باقي الصفوف الفارغة كمرجع للمستخدم
        for (let i = 2; i <= 100; i++) {
            applyRowStyles(worksheet.getRow(i));
        }
        // إعادة تنسيق صف الشرح بعد تطبيق النمط العام
        // --- التعديل المطلوب هنا ---
        explanationRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF000000'} };
        explanationRow.alignment = { ...ROW_STYLE.alignment, wrapText: true };


        await workbook.xlsx.writeFile(filePath);
        return { success: true, path: filePath };
    } catch (error) {
        console.error(`Error downloading ${config.sheetName} template:`, error);
        return { success: false, message: `فشل تحميل قالب ${config.sheetName}: ${error.message}` };
    }
}

module.exports = (ipcMain, getMainWindow) => {
    const mainWindow = getMainWindow();

    // --- معالجات المنتجات ---
    ipcMain.handle('products:export-excel', () => handleExport(ENTITY_CONFIGS.products.export, mainWindow));
    ipcMain.handle('products:import-excel', () => handleImport(ENTITY_CONFIGS.products.import, mainWindow));
    ipcMain.handle('products:download-template', () => handleDownloadTemplate(ENTITY_CONFIGS.products.template, mainWindow));

    // --- معالجات العملاء ---
    ipcMain.handle('customers:export-excel', () => handleExport(ENTITY_CONFIGS.customers.export, mainWindow));
    ipcMain.handle('customers:import-excel', () => handleImport(ENTITY_CONFIGS.customers.import, mainWindow));
    ipcMain.handle('customers:download-template', () => handleDownloadTemplate(ENTITY_CONFIGS.customers.template, mainWindow));
};
