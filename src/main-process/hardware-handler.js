module.exports = (ipcMain) => {
    ipcMain.on('cash-drawer:open', () => {
        console.log("Received request to open cash drawer.");
        console.log("SIMULATION: Cash drawer opened.");
    });
};
