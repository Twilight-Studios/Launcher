const { BrowserWindow, Menu, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow;
let currentWindowPreset;

exports.getMainWindow = () => { return mainWindow; }
exports.getPatchNotesWindow = () => { return patchNotesWindow; }

exports.enableDevTools = false;
exports.onWindowPresetOpened = null; // onWindowPresetOpened must be asynchronous

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
        exports.onWindowPresetOpened(fileName).then(shouldContinue => {
            if (shouldContinue === false) return;
            if (wp.defaultCallback) wp.defaultCallback();
            if (additionalCallback) additionalCallback();
        });
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
    mainWindow.setResizable(exports.enableDevTools);
    if (!exports.enableDevTools) { Menu.setApplicationMenu(null); }

    if (callback) { mainWindow.webContents.once('did-finish-load', () => { 
        callback();
        mainWindow.show();
    });}
}

exports.reloadCurrentWindow = async (callback) => {
    exports.openWindowPreset(currentWindowPreset, () => {
        if (callback) callback();
    });
}

exports.sendMessage = (channel, ...args) => {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(channel, ...args);
    }
};

exports.sendNotification = function (title, description, length) {
    exports.sendMessage('notification', title, description, length);
}

exports.showMainWindow = () => { mainWindow.show(); }

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

ipcMain.on('open-window-preset', (event, fileName) => {
    exports.openWindowPreset(fileName);
});

ipcMain.on('open-file', (event, filePath) => {
    if (!fs.existsSync(filePath)) return;
    shell.showItemInFolder(filePath)
});

ipcMain.on('open-external-url', (event, url) => {
    shell.openExternal(url);
});