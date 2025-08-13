const { BrowserWindow, ipcMain } = require('electron'); 
const db = require('../../database');
const { machineIdSync } = require('node-machine-id');

const updateSetting = (key, value) => {
    db.prepare("UPDATE settings SET value = ? WHERE key = ?").run(value, key);
};

const validateLicenseKey = (key, machineId) => {
    // تم تبسيط الدالة لتكون مباشرة أكثر
    if (key === `CASHIER-PRO-${machineId}`) {
        return { valid: true, message: "تم التفعيل بنجاح!" };
    }
    return { valid: false, message: "مفتاح الترخيص غير صالح." };
};

module.exports = (ipcMain) => {
    ipcMain.handle('license:get-machine-id', () => {
        try {
            return machineIdSync({ original: true });
        } catch (error) {
            console.error("Could not get machine ID:", error);
            return "ERROR";
        }
    });

    ipcMain.handle('license:activate', (event, key) => {
        const machineId = machineIdSync({ original: true });
        const result = validateLicenseKey(key, machineId);
        
        if (result.valid) {
            updateSetting('licenseKey', key);
            updateSetting('licenseStatus', 'LICENSED');
            
            ipcMain.emit('license-validated'); 
            
            return { success: true, message: result.message };
        }
        
        return { success: false, message: result.message };
    });
};
