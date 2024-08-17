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
exports.onWindowReload = null;

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

exports.reloadCurrentWindow = async (callback) => {
    /*
    The issue with reload is that old onWindowCreated callbacks can execute procedures after window reload.
    This can cause unwanted and duplicated behaviour through callbacks being called twice.
    The current solution is if the onWindowReload callback returns false, the new page isnt loaded.
    This prevents new onWindowCreated callbacks to be triggered, but still doesn't stop existing ones still executing.
    For that reason, reloads must not be called before some IPC callback doesn't state all onWindowCreated callbacks are done.
    For example, the library-loaded callback will allow for reloads to be triggered. This isn't ideal but its the best option as of now.
    */
    
    if (exports.onWindowReload) {
        let response = await exports.onWindowReload(); // onWindowReload must be asynchronous
        if (response === false) return;
    }
    mainWindowCreateMethod();
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
    exports.reloadCurrentWindow(() => { exports.sendMessage("success-reload"); }); // Hacky fix but it works for now
});