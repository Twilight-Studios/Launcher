const fs = require('fs');

exports.saveJson = function (contents, path) {
    try { fs.writeFileSync(path, JSON.stringify(contents), 'utf8'); }
    catch (err) { console.error(`An error occurred while saving contents to ${path}`, err); }
    return null;
}

exports.readJson = function (path) {
    try { if (fs.existsSync(path)) { return JSON.parse(fs.readFileSync(path, 'utf8')); } } 
    catch (err) { console.error(`An error occurred while reading ${path}`, err); }
    return null;
}

exports.createJson = function (path) {
    try { 
        if (fs.existsSync(path)) return;
        exports.saveJson(null, path);
    } 
    catch (err) { console.error(`An error occurred while creating JSON at ${path}`, err); }
    return null;
}

exports.makePath = function (pathToMake) {
    if (!fs.existsSync(pathToMake)) { fs.mkdirSync(pathToMake, { recursive: true }); }
}

exports.removePath = function (pathToRemove) {
    if (fs.existsSync(pathToRemove)) { fs.rmSync(pathToRemove, { recursive: true }); }
}