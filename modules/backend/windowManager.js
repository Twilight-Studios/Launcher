const { BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let currentWindowPreset;

exports.getMainWindow = () => { return mainWindow; }
exports.getPatchNotesWindow = () => { return patchNotesWindow; }

exports.devMode = false;
exports.onWindowReload = null;

let windowPresets = {};

exports.addWindowPreset = function (fileName, width, height, defaultCallback) {
    if (windowPresets[fileName]) return;

    windowPresets[fileName] = {
        width: width,
        height: height,
        defaultCallback: defaultCallback
    };
}

exports.openWindowPreset = function (fileName, additionalCallback) {
    if (!windowPresets[fileName]) return;
    let wp = windowPresets[fileName];
    currentWindowPreset = fileName;

    createWindow(fileName, wp.width, wp.height, () => {
        if (wp.defaultCallback) wp.defaultCallback();
        if (additionalCallback) additionalCallback();
    });
}

function createWindow(fileName, width, height, callback) {
    if (mainWindow) { mainWindow.close(); }

    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        icon: path.join(__dirname, '../../resources/logo.ico'),
        webPreferences: {
            preload: path.join(__dirname, `../../pages/${fileName}.js`),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            sandbox: false
        }
    });
    
    mainWindow.loadFile(`./pages/${fileName}.html`);
    mainWindow.setResizable(false);
    if (!exports.devMode) { Menu.setApplicationMenu(null); }

    if (callback) { mainWindow.webContents.once('did-finish-load', () => { callback(); }); }
    mainWindow.once('ready-to-show', () => { mainWindow.show(); });
}

exports.reloadCurrentWindow = async (callback) => {
    /*
    The issue with reload is that old defaultCallback procedures can execute procedures after window reload.
    This can cause unwanted and duplicated behaviour through callbacks being called twice.
    The current solution is if the onWindowReload callback returns false, the new page isnt loaded.
    This prevents new defaultCallback procedures to be triggered, but still doesn't stop existing ones still executing.
    For that reason, reloads must not be called before some IPC callback doesn't state all defaultCallback procedures are done.
    For example, the library-loaded callback will allow for reloads to be triggered. This isn't ideal but its the best option as of now.
    */
    
    if (exports.onWindowReload) {
        let response = await exports.onWindowReload(); // onWindowReload must be asynchronous
        if (response === false) return;
    }

    exports.openWindowPreset(currentWindowPreset);
    if (callback) callback();
}

exports.sendMessage = (channel, ...args) => {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(channel, ...args);
    }
};

exports.showMainWindow = () => { mainWindow.show(); }

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