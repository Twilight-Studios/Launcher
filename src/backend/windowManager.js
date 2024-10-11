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

exports.addWindowPreset = function (presetName, width, height, defaultCallback) {
    if (windowPresets[presetName]) return;

    windowPresets[presetName] = {
        width: width,
        height: height,
        defaultCallback: defaultCallback
    };
}

exports.openWindowPreset = function (presetName, additionalCallback) {
    if (!windowPresets[presetName]) return;
    let wp = windowPresets[presetName];
    currentWindowPreset = presetName;

    createWindow(presetName, wp.width, wp.height, () => {
        let { domCallbacks, asyncTask } = exports.onWindowPresetOpened(presetName);
        
        for (const [channel, value] of Object.entries(domCallbacks)) {
            exports.sendMessage(channel, value);
        }

        if (asyncTask) {
            asyncTask().then(shouldContinue => {
                if (shouldContinue === false) return;
                if (wp.defaultCallback) wp.defaultCallback();
                if (additionalCallback) additionalCallback();
            })    
        }
        else {
            if (wp.defaultCallback) wp.defaultCallback();
            if (additionalCallback) additionalCallback();
        }
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

    mainWindow.webContents.once('did-finish-load', () => { 
        if (callback) callback();
        mainWindow.show();
    });
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

ipcMain.on('open-window-preset', (event, presetName, additionalCallback) => {
    exports.openWindowPreset(presetName, additionalCallback);
});

ipcMain.on('reflect', (event, channel, ...args) => { exports.sendMessage(channel, ...args); });

ipcMain.on('open-file', (event, filePath) => {
    if (!fs.existsSync(filePath)) return;
    shell.showItemInFolder(filePath)
});

ipcMain.on('open-external-url', (event, url) => {
    shell.openExternal(url);
});