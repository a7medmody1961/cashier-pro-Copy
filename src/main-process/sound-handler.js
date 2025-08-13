const { ipcMain } = require('electron');
module.exports = (ipcMain) => {
    /**
     * Handles requests from the renderer process to play a sound.
     * The actual sound playback logic will be in the renderer process using Tone.js.
     * @param {Electron.IpcMain} ipcMain - The ipcMain instance.
     */
    ipcMain.on('play-sound', (event, soundName) => {
        event.sender.send('trigger-sound', soundName);
    });
};