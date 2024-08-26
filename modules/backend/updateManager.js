const { autoUpdater } = require("electron-updater");

autoUpdater.autoDownload = false;
autoUpdater.allowDowngrade = true;
exports.onError = null;

autoUpdater.on("update-downloaded", () => {
    autoUpdater.quitAndInstall();
});

autoUpdater.on('error', (error) => {
    if (exports.onError) exports.onError(error);
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