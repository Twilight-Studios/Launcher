const { app, ipcMain } = require('electron');
const fm = require('../fileManager');
const path = require('path');
const fs = require('fs');

let appVersion = app.getVersion();

let cachedSettings = null;
let eventsToIgnore = 0;

exports.onSettingsChanged = null;

fm.createJson('settings.json', true);
fs.watch(path.join(fm.getAppDataPath(), 'settings.json'), { persistent: false }, function (event, filename) {
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
        fm.createJson('settings.json', true);
        loadedSettings = fm.readJson('settings.json', true);
        if (!loadedSettings || typeof loadedSettings != "object") loadedSettings = {};
    }

    settings.appVersion = appVersion;
    settings.devConsole = null;

    if (!('language' in loadedSettings) || !(['en', 'ru', 'cz', 'nl'].includes(loadedSettings.language))) settings.language = 'en';
    else settings.language = loadedSettings.language;

    if (!('authFailBehaviour' in loadedSettings) || !(loadedSettings.authFailBehaviour in [0, 1, 2])) settings.authFailBehaviour = 0; // Default authFailBehaviour
    else settings.authFailBehaviour = loadedSettings.authFailBehaviour;

    settings.gamesPath = path.join(app.getPath('userData'), 'games');

    if (!('betaEnabled' in loadedSettings) || typeof loadedSettings.betaEnabled != "boolean") settings.betaEnabled = false;
    else settings.betaEnabled = loadedSettings.betaEnabled;

    if (!('autoUpdateEnabled' in loadedSettings) || typeof loadedSettings.autoUpdateEnabled != "boolean") settings.autoUpdateEnabled = true;
    else settings.autoUpdateEnabled = loadedSettings.autoUpdateEnabled;

    settings.updateServer = "https://github.com/TheNebulo/ForgeKit";

    settings.gameDataCache = null;

    if (JSON.stringify(settings) !== JSON.stringify(loadedSettings)) exports.writeSettings(settings);
    return settings;
}

exports.writeSettings = (settings) => {
    cachedSettings = settings;

    eventsToIgnore++;
    fm.saveJson('settings.json', true, settings);  
}

exports.resetSettings = () => {
    cachedSettings = null;
    eventsToIgnore++;
    exports.onSettingsChanged(null, null);
    fm.removePath('settings.json', true);
}

ipcMain.on('new-settings-value', (event, key, newValue) => {
    let settings = exports.getSettings();

    if (!(key in settings)) {
        console.error(`Tried to write new value for ${key} setting, which doesn't exist.`);
        return;
    }

    settings[key] = newValue;
    exports.onSettingsChanged(key, newValue);
    exports.writeSettings(settings);
});

ipcMain.on('reset-settings', (event) => {
    exports.resetSettings();
})