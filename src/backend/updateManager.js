const { ipcMain } = require('electron');
const { autoUpdater } = require("electron-updater");

autoUpdater.autoDownload = false;
exports.onError = null;
let checkingForUpdates = false;

autoUpdater.on("update-downloaded", () => {
    autoUpdater.quitAndInstall();
});

autoUpdater.on('error', (error) => {
    if (exports.onError) exports.onError(error);
});

exports.checkForUpdates = async function () {
    checkingForUpdates = true;
    const result = await autoUpdater.checkForUpdates();
    checkingForUpdates = false;
    if (result && result.cancellationToken) {  // Valid update is found
        autoUpdater.downloadUpdate();
        return true;
    } else { 
        return false; // Launcher is up-to-date
    }
}

ipcMain.on('check-for-updates', async (event) => { // Better feedback here
    if (checkingForUpdates) return;
    let updateFound = exports.checkForUpdates();

    if (updateFound) {
        // Notify update found???
    }
});