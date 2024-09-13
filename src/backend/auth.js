const { ipcMain } = require('electron');
const axios = require('axios');
const fm = require('./fileManager');
const utils = require('../utils');

let currentUser = {
    accessKey: null,
    serverUrl: null
}

exports.onLoginSuccess = null;
exports.onLogout = null;
exports.onAuthLost = null;
exports.bypassAuth = false;

exports.getUser = () => { return currentUser; }

exports.isUserValid = () => { return (currentUser.accessKey !== null && currentUser.serverUrl !== null); }

exports.loadUser = function () {
    userJson = fm.readJson('credentials.json', true);

    if (!userJson) {
        currentUser.accessKey = null;
        currentUser.serverUrl = null;
        return;
    }
    
    currentUser.accessKey = userJson.accessKey;
    currentUser.serverUrl = userJson.serverUrl;
}

exports.saveUser = function () {
    fm.saveJson("credentials.json", true, currentUser);
}

exports.setUser = function (accessKey, serverUrl) {
    currentUser.accessKey = accessKey;
    currentUser.serverUrl = serverUrl;
    currentUser.authenticated = false;
}

exports.authenticateUser = async function () {
    if (exports.bypassAuth) return { ok: true, status: 200 };
    if (!exports.isUserValid) { return { ok: false, status: -1 }; }

    try {
        const resp = await axios.post(`${currentUser.serverUrl}/api/validate-access`, { key: currentUser.accessKey });
        return { ok: resp.status === 200, status: resp.status };
    } 
    catch (error) {
        let status = 0; // Default status for no internet connection
        if (error.response) { status = error.response.status; }

        return { ok: false, status: status };
    }
}

exports.login = async function () {
    let {ok, status} = await exports.authenticateUser();

    if (ok) {
        exports.saveUser();
        if (exports.onLoginSuccess) { exports.onLoginSuccess(); }
        return { success: true };
    }

    return { success: false, message: utils.getErrorMessage(status) };
}

exports.logout = function () {
    exports.setUser(null, null);
    fm.removePath("credentials.json", true);
    if (exports.onLogout) exports.onLogout();
}

ipcMain.handle('login', async (event, { accessKey, serverUrl }) => {
    exports.setUser(accessKey, serverUrl);
    let response = await exports.login();
    return response;
});

ipcMain.on('logout', (event) => {
    exports.logout();
});