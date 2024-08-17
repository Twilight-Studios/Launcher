const { autoUpdater } = require("electron-updater");

autoUpdater.autoDownload = false;
exports.onError = null;

autoUpdater.on("update-downloaded", () => {
    autoUpdater.quitAndInstall();
});

autoUpdater.on('error', (error) => {
    if (onError) onError(error);
});

exports.checkForUpdates = async function () {
    const result = await autoUpdater.checkForUpdates();
    if (result && result.cancellationToken) {  // Valid update is found
        await autoUpdater.downloadUpdate();
        return true;
    } else { 
        return false; // Launcher is up-to-date
    }
}