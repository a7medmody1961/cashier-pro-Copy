/*
  File: src/main-process/excel-handler.js
  Version: 1.5 (Updated)
  Description: Handles all logic for importing and exporting data using Excel files, now excluding email for customers.
  - (FIX) Corrected db.all is not a function error by using synchronous methods of better-sqlite3.
  - (Feature) Added IPC handlers for downloading Excel templates.
  - (FIX) Corrected customer export by joining with customer_addresses table for default address.
  - (Enhancement) Adjusted customer import to handle default_address field.
  - (FIX) Removed 'email' field from customer export, import, and template generation.
*/
const { dialog } = require('electron');
const xlsx = require('xlsx');
const db = require('../../database'); // Ensure this imports the actual db instance
const fs = require('fs');
const path = require('path');

// Helper functions that correctly use the 'db' instance (better-sqlite3 is synchronous)
// db.prepare().all() for SELECT statements
const dbAll = (sql, params = []) => db.prepare(sql).all(params);
// db.prepare().run() for INSERT, UPDATE, DELETE statements
const dbRun = (sql, params = []) => db.prepare(sql).run(params);

module.exports = (ipcMain, getMainWindow) => {
    // --- Product Export Handler ---
    ipcMain.handle('products:export-excel', async () => {
        try {
            // Select all products from the database
            const products = dbAll("SELECT id, name, barcode, price, cost_price, stock, image_path, icon_name, shortcut_key FROM products");
            // Convert product data to a worksheet
            const worksheet = xlsx.utils.json_to_sheet(products);
            // Create a new workbook and append the worksheet
            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, "Products");

            // Show save dialog to get the desired file path from the user
            const { filePath } = await dialog.showSaveDialog(getMainWindow(), {
                title: 'Export Products to Excel', // Dialog title
                defaultPath: 'products.xlsx', // Default file name
                filters: [{ name: 'Excel Files', extensions: ['xlsx'] }] // File type filter
            });

            if (filePath) {
                // Write the workbook to the specified file path
                xlsx.writeFile(workbook, filePath);
                return { success: true, path: filePath }; // Return success and path
            }
            return { success: false, message: 'Export cancelled.' }; // Return false if cancelled
        } catch (error) {
            console.error('Error exporting products:', error); // Log any errors
            return { success: false, message: error.message }; // Return error message
        }
    });

    // --- Product Import Handler ---
    ipcMain.handle('products:import-excel', async () => {
        try {
            // Show open dialog to allow user to select an Excel file
            const { filePaths } = await dialog.showOpenDialog(getMainWindow(), {
                title: 'Import Products from Excel', // Dialog title
                properties: ['openFile'], // Allow opening files
                filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }] // File type filter
            });

            if (filePaths && filePaths.length > 0) {
                const workbook = xlsx.readFile(filePaths[0]); // Read the selected Excel file
                const worksheet = workbook.Sheets[workbook.SheetNames[0]]; // Get the first worksheet
                const data = xlsx.utils.sheet_to_json(worksheet); // Convert worksheet to JSON data

                // Basic validation for required product columns
                if (!data || data.length === 0) {
                    throw new Error('Excel file is empty or invalid.');
                }
                const requiredProductColumns = ['name', 'price']; // Define required columns
                const missingProductColumns = requiredProductColumns.filter(col => !(col in data[0]));
                if (missingProductColumns.length > 0) {
                    throw new Error(`Invalid Excel file format. Missing required product columns: ${missingProductColumns.join(', ')}.`);
                }

                // Use db.transaction for atomicity with better-sqlite3
                const insertProducts = db.transaction((productsToInsert) => {
                    for (const product of productsToInsert) {
                        const sql = `INSERT OR REPLACE INTO products (barcode, name, price, cost_price, stock, image_path, shortcut_key, icon_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                        dbRun(sql, [
                            product.barcode || null,
                            product.name,
                            product.price,
                            product.cost_price || 0,
                            product.stock ?? null, // Use null for stock if not provided, allowing 'unlimited'
                            product.image_path || null,
                            product.shortcut_key || null,
                            product.icon_name || null
                        ]);
                    }
                });
                insertProducts(data); // Execute the transaction with the data

                getMainWindow()?.webContents.send('products-updated'); // Notify renderer process
                return { success: true, count: data.length }; // Return success and count of imported records
            }
            return { success: false, message: 'Import cancelled.' }; // Return false if cancelled
        } catch (error) {
            console.error('Error importing products:', error); // Log any errors
            return { success: false, message: error.message }; // Return error message
        }
    });

    // --- Customer Export Handler ---
    ipcMain.handle('customers:export-excel', async () => {
        try {
            // Select customers and their default address from the database, EXCLUDING email
            const customers = dbAll(`
                SELECT
                    c.id,
                    c.name,
                    c.phone,
                    ca.address AS default_address, -- Alias for default address
                    c.order_count,
                    c.total_spent,
                    c.loyalty_points,
                    c.total_earned_loyalty_points,
                    c.total_redeemed_loyalty_points
                FROM customers c
                LEFT JOIN customer_addresses ca ON c.id = ca.customer_id AND ca.is_default = 1
            `);
            // Convert customer data to a worksheet
            const worksheet = xlsx.utils.json_to_sheet(customers);
            // Create a new workbook and append the worksheet
            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, "Customers");

            // Show save dialog to get the desired file path from the user
            const { filePath } = await dialog.showSaveDialog(getMainWindow(), {
                title: 'Export Customers to Excel', // Dialog title
                defaultPath: 'customers.xlsx', // Default file name
                filters: [{ name: 'Excel Files', extensions: ['xlsx'] }] // File type filter
            });

            if (filePath) {
                // Write the workbook to the specified file path
                xlsx.writeFile(workbook, filePath);
                return { success: true, path: filePath }; // Return success and path
            }
            return { success: false, message: 'Export cancelled.' }; // Return false if cancelled
        } catch (error) {
            console.error('Error exporting customers:', error); // Log any errors
            return { success: false, message: error.message }; // Return error message
        }
    });

    // --- Customer Import Handler ---
    ipcMain.handle('customers:import-excel', async () => {
        try {
            // Show open dialog to allow user to select an Excel file
            const { filePaths } = await dialog.showOpenDialog(getMainWindow(), {
                title: 'Import Customers from Excel', // Dialog title
                properties: ['openFile'], // Allow opening files
                filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }] // File type filter
            });

            if (filePaths && filePaths.length > 0) {
                const workbook = xlsx.readFile(filePaths[0]); // Read the selected Excel file
                const worksheet = workbook.Sheets[workbook.SheetNames[0]]; // Get the first worksheet
                const data = xlsx.utils.sheet_to_json(worksheet); // Convert worksheet to JSON data

                // Basic validation for required customer columns
                if (!data || data.length === 0) {
                    throw new Error('Excel file is empty or invalid.');
                }
                const requiredCustomerColumns = ['name', 'phone']; // Define required columns for customers
                const missingCustomerColumns = requiredCustomerColumns.filter(col => !(col in data[0]));
                if (missingCustomerColumns.length > 0) {
                    throw new Error(`Invalid Excel file format. Missing required customer columns: ${missingCustomerColumns.join(', ')}.`);
                }

                // Use db.transaction for atomicity with better-sqlite3
                const insertCustomers = db.transaction((customersToInsert) => {
                    for (const customer of customersToInsert) {
                        // First, insert or replace the customer in the 'customers' table, EXCLUDING email
                        const customerSql = `INSERT OR REPLACE INTO customers (name, phone, order_count, total_spent, loyalty_points, total_earned_loyalty_points, total_redeemed_loyalty_points) VALUES (?, ?, ?, ?, ?, ?, ?)`;
                        const result = dbRun(customerSql, [
                            customer.name,
                            customer.phone,
                            customer.order_count || 0,
                            customer.total_spent || 0,
                            customer.loyalty_points || 0,
                            customer.total_earned_loyalty_points || 0,
                            customer.total_redeemed_loyalty_points || 0
                        ]);

                        // Get the ID of the inserted/replaced customer
                        const customerId = result.lastInsertRowid;

                        // If a default_address is provided, insert or update it in 'customer_addresses'
                        if (customer.default_address) {
                            // Check if a default address already exists for this customer
                            const existingDefaultAddress = dbAll("SELECT id FROM customer_addresses WHERE customer_id = ? AND is_default = 1", [customerId]);
                            if (existingDefaultAddress.length > 0) {
                                // Update existing default address
                                dbRun("UPDATE customer_addresses SET address = ? WHERE id = ?", [customer.default_address, existingDefaultAddress[0].id]);
                            } else {
                                // Insert new default address
                                dbRun("INSERT INTO customer_addresses (customer_id, address, is_default) VALUES (?, ?, 1)", [customerId, customer.default_address]);
                            }
                        }
                    }
                });
                insertCustomers(data); // Execute the transaction with the data

                getMainWindow()?.webContents.send('customers-updated'); // Notify renderer process
                return { success: true, count: data.length }; // Return success and count of imported records
            }
            return { success: false, message: 'Import cancelled.' }; // Return false if cancelled
        } catch (error) {
            console.error('Error importing customers:', error); // Log any errors
            return { success: false, message: error.message }; // Return error message
        }
    });

    // --- Template Download Handlers ---
    ipcMain.handle('products:download-template', async () => {
        try {
            const templateData = [
                { barcode: '', name: 'اسم المنتج', price: 0.00, cost_price: 0.00, stock: '', image_path: '', shortcut_key: '', icon_name: '' }
            ];
            const worksheet = xlsx.utils.json_to_sheet(templateData);
            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, "Products Template");

            const { filePath } = await dialog.showSaveDialog(getMainWindow(), {
                title: 'Download Products Excel Template',
                defaultPath: 'products_template.xlsx',
                filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
            });

            if (filePath) {
                xlsx.writeFile(workbook, filePath);
                return { success: true, path: filePath };
            }
            return { success: false, message: 'Download cancelled.' };
        } catch (error) {
            console.error('Error downloading products template:', error);
            return { success: false, message: error.message };
        }
    });

    ipcMain.handle('customers:download-template', async () => {
        try {
            // Removed 'email' from customer template data
            const templateData = [
                { name: 'اسم العميل', phone: 'رقم الهاتف', default_address: 'العنوان الافتراضي', order_count: 0, total_spent: 0.00, loyalty_points: 0, total_earned_loyalty_points: 0, total_redeemed_loyalty_points: 0 }
            ];
            const worksheet = xlsx.utils.json_to_sheet(templateData);
            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, "Customers Template");

            const { filePath } = await dialog.showSaveDialog(getMainWindow(), {
                title: 'Download Customers Excel Template',
                defaultPath: 'customers_template.xlsx',
                filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
            });

            if (filePath) {
                xlsx.writeFile(workbook, filePath);
                return { success: true, path: filePath };
            }
            return { success: false, message: 'Download cancelled.' };
        } catch (error) {
            console.error('Error downloading customers template:', error);
            return { success: false, message: error.message };
        }
    });
};
