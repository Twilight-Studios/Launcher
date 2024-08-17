// MODULE IMPORTS
// --------------------------------------------------------------------------------------

const { autoUpdater } = require("electron-updater");

// --------------------------------------------------------------------------------------

// AUTO-UPDATER SETUP
// --------------------------------------------------------------------------------------

autoUpdater.autoDownload = false; // Updates are not automatically downloaded, and only checked on start-up.

autoUpdater.on("update-downloaded", () => {
    autoUpdater.quitAndInstall();
});

autoUpdater.on('error', (error) => {
    console.error(error);
});

// --------------------------------------------------------------------------------------

// UPDATE CHECKER
// --------------------------------------------------------------------------------------

exports.checkForUpdates = async function () {
    const result = await autoUpdater.checkForUpdates();
    if (result && result.cancellationToken) {  // Valid update is found
        await autoUpdater.downloadUpdate();
        return true;
    } else { 
        return false; // Launcher is up-to-date
    }
}

// --------------------------------------------------------------------------------------