const { BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let patchNotesWindow;
let mainWindowCreateMethod;

exports.getMainWindow = () => { return mainWindow; }
exports.getPatchNotesWindow = () => { return patchNotesWindow; }

exports.devMode = false;
exports.onUpdateWindowCreated = null;
exports.onLoginWindowCreated = null;
exports.onLibraryWindowCreated = null;
exports.onGameWindowCreated = null;
exports.onPatchNotesWindowCreated = null;
exports.onWindowReloaded = null;

function createWindow(fileName, width, height, callback) {
    if (mainWindow) { mainWindow.close(); }
    exports.closePatchNotesWindow();

    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        icon: path.join(__dirname, '../../resources/logo.ico'),
        webPreferences: {
            preload: path.join(__dirname, `../../js/${fileName}.js`),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            sandbox: false
        }
    });
    
    mainWindow.loadFile(`./pages/${fileName}.html`);
    mainWindow.setResizable(false);
    mainWindow.on('closed', () => { exports.closePatchNotesWindow(); });
    if (!exports.devMode) { Menu.setApplicationMenu(null); }

    if (callback) { mainWindow.webContents.once('did-finish-load', () => { callback(); }); }
    mainWindow.once('ready-to-show', () => { mainWindow.show(); });
}

exports.createUpdateWindow = (callback) => { createWindow('update', 400, 600, () => {
    mainWindowCreateMethod = exports.createUpdateWindow;
    if (exports.onUpdateWindowCreated) exports.onUpdateWindowCreated();
    if (callback) callback();
});}

exports.createLoginWindow = (callback) => { createWindow('login', 400, 600, () => {
    mainWindowCreateMethod = exports.createLoginWindow;
    if (exports.onLoginWindowCreated) exports.onLoginWindowCreated();
    if (callback) callback();
});}

exports.createLibraryWindow = (callback) => { createWindow('library', 1280, 720, () => {
    mainWindowCreateMethod = exports.createLibraryWindow;
    if (exports.onLibraryWindowCreated) exports.onLibraryWindowCreated();
    if (callback) callback();
});}

exports.createGameWindow = (callback) => { createWindow('game', 1280, 720, () => {
    mainWindowCreateMethod = exports.createGameWindow;
    if (exports.onGameWindowCreated) exports.onGameWindowCreated();
    if (callback) callback();
});}

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
    if (!exports.devMode) { Menu.setApplicationMenu(null); }

    patchNotesWindow.webContents.once('did-finish-load', () => {
        patchNotesWindow.webContents.send('load-patchnotes', patchNotes);
        if (exports.onPatchNotesWindowCreated) exports.onPatchNotesWindowCreated();
        if (callback) { callback(); }
    });
    patchNotesWindow.once('ready-to-show', () => { patchNotesWindow.show(); });
}

exports.showMainWindow = () => { mainWindow.show(); }

exports.reloadCurrentWindow = (callback) => { // TODO: The issue with reload, is that existing onWindowCreated callbacks can execute procedures after window, causing unwanted and duplicated behaviour. Needs to be looked into and fixed.
    mainWindowCreateMethod();
    if (exports.onWindowReloaded) exports.onWindowReloaded();
    if (callback) callback();
}

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

ipcMain.on('reload', (event) => {
    exports.reloadCurrentWindow();
});