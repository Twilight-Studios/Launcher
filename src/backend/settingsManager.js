const { app, ipcMain } = require('electron');
const fm = require('./fileManager');
const path = require('path');
const fs = require('fs');

let appVersion = app.getVersion();

let cachedSettings = null;
let eventsToIgnore = 0;

fm.createJson('settings.json');
fs.watch('settings.json', { persistent: false }, function (event, filename) {
    if (eventsToIgnore > 0) {
        eventsToIgnore--;
        return;
    }

    cachedSettings = null;
});

exports.getSettings = function () {
    let settings = {};
    let loadedSettings;

    if (cachedSettings) loadedSettings = cachedSettings;
    else {
        eventsToIgnore++;
        fm.createJson('settings.json');
        loadedSettings = fm.readJson('settings.json');
        if (!loadedSettings || typeof loadedSettings != "object") loadedSettings = {};
    }

    if (!('gamesPath' in loadedSettings)) settings.gamesPath = path.join(app.getPath('userData'), 'games');
    else settings.gamesPath = loadedSettings.gamesPath;
    
    settings.appVersion = appVersion;

    if (!('betaEnabled' in loadedSettings)) settings.betaEnabled = false;
    else settings.betaEnabled = loadedSettings.betaEnabled;

    if (!('autoUpdateEnabled' in loadedSettings)) settings.autoUpdateEnabled = true;
    else settings.autoUpdateEnabled = loadedSettings.autoUpdateEnabled;

    settings.updateServer = "https://github.com/TheNebulo/ForgeKit";
    
    if (!('authFailBehaviour' in loadedSettings)) settings.authFailBehaviour = 0; // Default authFailBehaviour
    else settings.authFailBehaviour = loadedSettings.authFailBehaviour;

    exports.writeSettings(settings);
    return settings;
}

exports.writeSettings = (settings) => {
    cachedSettings = settings;

    eventsToIgnore++;
    fm.saveJson(settings, 'settings.json');  
}

exports.resetSettings = (settings) => {
    cachedSettings = null;
    eventsToIgnore++;
    fm.removePath('settings.json');
}

ipcMain.on('new-settings-value', (event, key, newValue) => {
    let settings = exports.getSettings();

    if (!(key in settings)) {
        console.error(`Tried to write new value for ${key} setting, which doesn't exist.`);
        return;
    }

    settings[key] = newValue;
    exports.writeSettings(settings);
});

ipcMain.on('reset-settings', (event) => {
    exports.resetSettings();
})