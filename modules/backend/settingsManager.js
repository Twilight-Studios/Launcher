const { app } = require('electron');
const fm = require('./fileManager');
const path = require('path');
const fs = require('fs');

let appVersion = app.getVersion();

let cachedSettings = null;
let eventsToIgnore = 0;

fs.watch('settings.json', function (event, filename) {
    if (eventsToIgnore > 0) {
        eventsToIgnore--;
        return;
    }

    cachedSettings = null;
});

exports.getSettings = function () {
    if (cachedSettings) return cachedSettings;

    let settings = {};

    eventsToIgnore++;
    let loadedSettings = fm.readJson('settings.json');

    if (!loadedSettings || typeof loadedSettings != "object") loadedSettings = {};

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