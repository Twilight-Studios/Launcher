const { BrowserWindow, Menu, Notification, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow;
let isMainWindowClosing = true;
let popoutWindows = {};
let arePopoutWindowsClosing = false;
let currentWindowPreset;

exports.getMainWindow = () => { return mainWindow; }

exports.enableDevTools = false;
exports.onWindowPresetOpened = null;
exports.onPopoutWindowPresetOpened = null;

let windowPresets = {};
let popoutWindowPresets = {};

exports.addWindowPreset = function (presetName, width, height, defaultCallback) {
    if (windowPresets[presetName]) return;

    windowPresets[presetName] = {
        width: width,
        height: height,
        defaultCallback: defaultCallback
    };
}

exports.addPopoutWindowPreset = function (presetName, width, height, persistent=false, defaultCallback=null) {
    if (popoutWindowPresets[presetName]) return;

    popoutWindowPresets[presetName] = {
        width: width,
        height: height,
        persistent: persistent,
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

exports.openPopoutWindowPreset = function (presetName, additionalCallback) {
    if (!popoutWindowPresets[presetName]) return;
    let wp = popoutWindowPresets[presetName];

    createPopoutWindow(presetName, wp.width, wp.height, wp.persistent, () => {
        let { domCallbacks, asyncTask } = exports.onPopoutWindowPresetOpened(presetName);
        
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
    if (mainWindow) { 
        isMainWindowClosing = false;
        exports.closeMainWindow(); 
    }

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

    mainWindow.on('closed', () => {
        if (isMainWindowClosing) exports.closeAllPopoutWindows();  // Close all popout windows if closing
        isMainWindowClosing = true;
    });

    mainWindow.webContents.once('did-finish-load', () => { 
        if (callback) callback();
        mainWindow.show();
    });
}

function createPopoutWindow(fileName, width, height, persistent, callback) {
    if (popoutWindows[fileName]) { exports.closePopoutWindow(fileName); }

    popoutWindows[fileName] = new BrowserWindow({
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
    
    popoutWindows[fileName].loadFile(`./pages/${fileName}.html`);
    popoutWindows[fileName].setResizable(exports.enableDevTools);
    if (!exports.enableDevTools) { Menu.setApplicationMenu(null); }

    popoutWindows[fileName].on('closed', () => {
        if (arePopoutWindowsClosing) { arePopoutWindowsClosing = false; return; }
        if (persistent) {
            delete popoutWindows[fileName];
            createPopoutWindow(fileName, width, height, persistent, callback);
        }
    });

    popoutWindows[fileName].webContents.once('did-finish-load', () => { 
        if (callback) callback();
        popoutWindows[fileName].show();
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

exports.showPopoutWindow = (presetName) => { if (popoutWindows[presetName]) popoutWindows[presetName].show(); }

exports.closePopoutWindow = (presetName) => {
    arePopoutWindowsClosing = true;

    if (popoutWindows[presetName]) {
        try { popoutWindows[presetName].close(); }
        catch (err) { } // It's fine, its probably destroyed anyway
    }

    delete popoutWindows[presetName];
}

exports.closeAllPopoutWindows = () => { Object.keys(popoutWindows).forEach(presetName => { exports.closePopoutWindow(presetName); }) }

ipcMain.on('reload', (event) => {
    exports.reloadCurrentWindow();
});

ipcMain.on('open-window-preset', (event, presetName, additionalCallback) => {
    exports.openWindowPreset(presetName, additionalCallback);
});

ipcMain.on('reflect', (event, channel, ...args) => { exports.sendMessage(channel, ...args); });

ipcMain.on('notify-os', (event, title, description) => { new Notification({ title: title, body: description, icon: 'resources/logo.ico' }).show(); })

ipcMain.on('open-file', (event, filePath) => {
    if (!fs.existsSync(filePath)) return;
    shell.showItemInFolder(filePath)
});

ipcMain.on('open-external-url', (event, url) => {
    shell.openExternal(url);
});