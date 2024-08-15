// MODULE IMPORTS
// --------------------------------------------------------------------------------------

const { autoUpdater } = require("electron-updater");
const windowManager = require("./windowManager");

// --------------------------------------------------------------------------------------

// AUTO-UPDATER SETUP
// --------------------------------------------------------------------------------------

autoUpdater.autoDownload = false; // Updates are not automatically downloaded, and only checked on start-up.

autoUpdater.on("update-downloaded", () => {
    autoUpdater.quitAndInstall();
});

autoUpdater.on('error', (error) => {
    windowManager.sendMessage('update-error', error.message);
});

// --------------------------------------------------------------------------------------

// UPDATE CHECKER
// --------------------------------------------------------------------------------------

exports.checkForUpdates = function () {
    autoUpdater.checkForUpdates().then((result) => {
        if (result && result.cancellationToken) { // Valid update is found
            autoUpdater.downloadUpdate();
            return true;
        }
        else { return false; } // Launcher is up-to-date
    })
    return false;
}

// --------------------------------------------------------------------------------------