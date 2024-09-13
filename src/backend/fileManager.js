const fs = require('fs');
const path = require('path');
const { app } = require('electron');

exports.getAppDataPath = () => { return app.getPath('userData') }

exports.saveJson = function (pathToSave, inAppData, contents) {
    if (inAppData) pathToSave = path.join(exports.getAppDataPath(), pathToSave);
    try { fs.writeFileSync(pathToSave, JSON.stringify(contents), 'utf8'); }
    catch (err) { console.error(`An error occurred while saving contents to ${pathToSave}`, err); }
    return null;
}

exports.readJson = function (pathToRead, inAppData) {
    if (inAppData) pathToRead = path.join(exports.getAppDataPath(), pathToRead);
    try { if (fs.existsSync(pathToRead)) { return JSON.parse(fs.readFileSync(pathToRead, 'utf8')); } } 
    catch (err) { console.error(`An error occurred while reading ${pathToRead}`, err); }
    return null;
}

exports.createJson = function (pathToCreate, inAppData) {
    if (inAppData) pathToCreate = path.join(exports.getAppDataPath(), pathToCreate);
    try { 
        if (fs.existsSync(pathToCreate)) return;
        exports.saveJson(pathToCreate, false, null);
    } 
    catch (err) { console.error(`An error occurred while creating JSON at ${pathToCreate}`, err); }
    return null;
}

exports.makePath = function (pathToMake, inAppData) {
    if (inAppData) pathToMake = path.join(exports.getAppDataPath(), pathToMake);
    if (!fs.existsSync(pathToMake)) { fs.mkdirSync(pathToMake, { recursive: true }); }
}

exports.removePath = function (pathToRemove, inAppData) {
    if (inAppData) pathToRemove = path.join(exports.getAppDataPath(), pathToRemove);
    if (fs.existsSync(pathToRemove)) { fs.rmSync(pathToRemove, { recursive: true }); }
}