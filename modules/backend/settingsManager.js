const { app } = require('electron');
const fm = require('./fileManager');
const path = require('path');

let appVersion = app.getVersion();

let cachedSettings = {};

exports.getSettings = function () {
    let settings = {};

    let loadedSettings = fm.readJson('settings.json');
    if (!loadedSettings || typeof loadedSettings != "object") loadedSettings = {};

    if (JSON.stringify(loadedSettings) == JSON.stringify(cachedSettings)) {
        return cachedSettings;
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
    fm.saveJson(settings, 'settings.json');  
}