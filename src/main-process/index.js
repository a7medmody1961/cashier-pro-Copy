const authHandlers = require('./auth-handlers');
const productHandlers = require('./product-handlers');
const saleHandlers = require('./sale-handlers');
const shiftHandlers = require('./shift-handlers');
const settingsHandlers = require('./settings-handlers');
const soundHandler = require('./sound-handler');
const userHandlers = require('./user-handlers');
const reportHandlers = require('./report-handlers');
const customerHandlers = require('./customer-handlers');
const licenseHandlers = require('./license-handler');
const expenseHandlers = require('./expense-handlers');
const salespersonHandlers = require('./salesperson-handlers'); 
const excelHandler = require('./excel-handler');
const hardwareHandler = require('./hardware-handler');
const imageHandler = require('./image-handler'); // استيراد الـ handler الجديد

function initializeAllHandlers(ipcMain, getMainWindow) {
    console.log("Initializing all IPC handlers...");
    
    authHandlers(ipcMain);
    productHandlers(ipcMain, getMainWindow);
    saleHandlers(ipcMain, getMainWindow);
    shiftHandlers(ipcMain, getMainWindow);
    settingsHandlers(ipcMain);
    soundHandler(ipcMain);
    userHandlers(ipcMain);
    reportHandlers(ipcMain);
    customerHandlers(ipcMain);
    licenseHandlers(ipcMain);
    expenseHandlers(ipcMain);
    excelHandler(ipcMain, getMainWindow);
    hardwareHandler(ipcMain);
    salespersonHandlers(ipcMain); 
    imageHandler(ipcMain); // استدعاء الـ handler الجديد

    console.log("...All handlers initialized successfully.");
}

module.exports = { initializeAllHandlers };
