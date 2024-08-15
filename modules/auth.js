// MODULE IMPORTS
// --------------------------------------------------------------------------------------

const { ipcMain } = require('electron');
const axios = require('axios');
const fileManager = require('./fileManager');
const windowManager = require('./windowManager');
const gameManager = require('./gameManager');
const downloadManager = require('./downloadManager');
const utils = require('./utils');

// --------------------------------------------------------------------------------------

// GLOBAL VARIABLE MANAGEMENT
// --------------------------------------------------------------------------------------

let currentUser = {
    accessKey: null,
    serverUrl: null,
    authenticated: false
}

exports.getUser = () => { return currentUser; }

exports.isUserValid = () => { return (currentUser.accessKey !== null && currentUser.serverUrl !== null); }

exports.loadUser = function () {
    userJson = fileManager.readJson('credentials.json');

    if (!userJson) {
        currentUser.accessKey = null;
        currentUser.serverUrl = null;
    }
    else {
        currentUser.accessKey = userJson.accessKey;
        currentUser.serverUrl = userJson.serverUrl;
    }

    currentUser.authenticated = false;
}

exports.setUser = function (accessKey, serverUrl) {
    currentUser.accessKey = accessKey;
    currentUser.serverUrl = serverUrl;
    currentUser.authenticated = false;
}

// --------------------------------------------------------------------------------------

// AUTHENTICATION
// --------------------------------------------------------------------------------------

exports.authenticateUser = async function () {
    if (!exports.isUserValid) { return { ok: false, status: -1 }; }

    try {
        const resp = await axios.post(`${currentUser.serverUrl}/api/validate-access`, { key: currentUser.accessKey });

        currentUser.authenticated = resp.status === 200;

        return { ok: resp.status === 200, status: resp.status };
    } 
    catch (error) {
        let status = 0; // Default status for no internet connection
        if (error.response) { status = error.response.status; }

        currentUser.authenticated = false;
        return { ok: false, status: status };
    }
}

// --------------------------------------------------------------------------------------

// IPC CALLBACKS
// --------------------------------------------------------------------------------------

ipcMain.handle('login', async (event, { accessKey, serverUrl }) => {
    exports.setUser(accessKey, serverUrl);
    let {ok, status} = await exports.authenticateUser();

    if (ok) {
        fileManager.saveJson({ accessKey, serverUrl }, "credentials.json");
        return { success: true };
    }

    return { success: false, message: utils.getErrorMessage(status) };
});

ipcMain.on('login-success', () => {
    windowManager.createLibraryWindow();
});

ipcMain.on('logout', () => {
    windowManager.closePatchNotesWindow();
    windowManager.closeMainWindow();

    downloadManager.forceStopDownload();
    gameManager.uninstallAllGames();

    fileManager.removePath('credentials.json');
    windowManager.createLoginWindow(() => { windowManager.sendMessage('success-logout'); });
});

// --------------------------------------------------------------------------------------