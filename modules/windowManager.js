// MODULE IMPORTS
// --------------------------------------------------------------------------------------

const { BrowserWindow, Menu } = require('electron');
const path = require('path');
const auth = require('./auth');
const utils = require('./utils');
const updateManager = require('./updateManager');

// --------------------------------------------------------------------------------------

// GLOBAL VARIABLE MANAGEMENT
// --------------------------------------------------------------------------------------

let mainWindow;
let patchNotesWindow;
let devMode = false;
let defaultServerUrl = null;

exports.getMainWindow = () => { return mainWindow; }
exports.getPatchNotesWindow = () => { return patchNotesWindow; }
exports.setDevMode = (value) => { devMode = value; }
exports.setDefaultServerUrl = (value) => { defaultServerUrl = value; }

// --------------------------------------------------------------------------------------

// WINDOW CREATION
// --------------------------------------------------------------------------------------

function createWindow(fileName, width, height, callback) {
    if (mainWindow) { mainWindow.close(); }
    exports.closePatchNotesWindow();

    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        icon: path.join(__dirname, '../resources/logo.ico'),
        webPreferences: {
            preload: path.join(__dirname, `../js/${fileName}.js`),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        }
    });
    
    mainWindow.loadFile(`./pages/${fileName}.html`);
    mainWindow.setResizable(false);
    mainWindow.on('closed', () => { exports.closePatchNotesWindow(); });
    if (!devMode) { Menu.setApplicationMenu(null); }

    if (callback) { mainWindow.webContents.once('did-finish-load', callback); }
    mainWindow.once('ready-to-show', mainWindow.show);
}

exports.createUpdateWindow = (callback) => { 
    createWindow('update', 400, 600, () => {
        updateManager.checkForUpdates().then(updateAvailable => { 
            if (updateAvailable) { exports.sendMessage('update-found'); }
            else { exports.createLoginWindow(null, true); }
            if (callback) { callback(); }
        });
    });
}

exports.createLoginWindow = (callback, autoAuthenticate=false) => { 
    createWindow('login', 400, 600, async () => {
        auth.loadUser();

        exports.sendMessage('fill-server-url', defaultServerUrl);
        exports.sendMessage('fill-credentials', auth.getUser());
        
        if (!autoAuthenticate) {
            if (callback) { callback(); }
            return;
        }

        if (!auth.isUserValid()) { return; }
        exports.sendMessage('started-auto-validation');

        let {ok, status} = await auth.authenticateUser();
        if (ok) { exports.sendMessage('success-auto-validate'); }
        else {
            //gameManager.uninstallAllGames(); 
            exports.sendMessage('failed-to-validate', utils.getErrorMessage(status)); 
        }

        if (callback) { callback(); } 
    });
}

exports.createLibraryWindow = (callback) => { 
    createWindow('library', 1280, 720, () => {
        exports.sendMessage('load-credentials', auth.getUser()); 
        if (callback) { callback(); }
    });
}

exports.createGameWindow = (id, branch, latestVersion, callback) => { 
    createWindow('game', 1280, 720, () => {
        exports.sendMessage('game-id', id, branch, latestVersion);
        if (callback) { callback(); }
    });
}

exports.createPatchNotesWindow = function (patchNotes, callback) {
    exports.closePatchNotesWindow();
    
    patchNotesWindow = new BrowserWindow({
        width: 1000,
        height: 600,
        icon: path.join(__dirname, '../resources/logo.ico'),
        webPreferences: {
            preload: path.join(__dirname, '../js/patchnotes.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        }
    });

    patchNotesWindow.loadFile('./pages/patchnotes.html');
    patchNotesWindow.setResizable(false);
    if (!devMode) { Menu.setApplicationMenu(null); }

    patchNotesWindow.webContents.once('did-finish-load', () => {
        patchNotesWindow.webContents.send('load-patchnotes', patchNotes);
        if (callback) { callback(); }
    });
    patchNotesWindow.once('ready-to-show', patchNotesWindow.show);
}

// --------------------------------------------------------------------------------------

// WINDOW MANAGEMENT
// --------------------------------------------------------------------------------------

exports.showMainWindow = () => { mainWindow.show(); }

exports.sendMessage = (channel, ...args) => {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(channel, ...args);
    }
};

exports.closePatchNotesWindow = function () {
    if (patchNotesWindow) {
        try { patchNotesWindow.close(); }
        catch (err) { } // It's fine, its probably destroyed anyway
    }
    patchNotesWindow = null;
}

exports.closeMainWindow = function () {
    if (mainWindow) {
        try { mainWindow.close(); }
        catch (err) { } // It's fine, its probably destroyed anyway
    }
    mainWindow = null;
}

// --------------------------------------------------------------------------------------