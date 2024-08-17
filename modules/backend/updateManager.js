const { autoUpdater } = require("electron-updater");

let errorCallback = null;
autoUpdater.autoDownload = false;

autoUpdater.on("update-downloaded", () => {
    autoUpdater.quitAndInstall();
});

autoUpdater.on('error', (error) => {
    if (errorCallback) errorCallback();
});

exports.setErrorCallback = (callback) => { errorCallback = callback; }

exports.checkForUpdates = async function () {
    const result = await autoUpdater.checkForUpdates();
    if (result && result.cancellationToken) {  // Valid update is found
        await autoUpdater.downloadUpdate();
        return true;
    } else { 
        return false; // Launcher is up-to-date
    }
}