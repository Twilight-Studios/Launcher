// MODULE IMPORTS
// --------------------------------------------------------------------------------------

const fs = require('fs');

// --------------------------------------------------------------------------------------

// JSON MANAGEMENT
// --------------------------------------------------------------------------------------

exports.saveJson = function (contents, path) {
    fs.writeFile(path, JSON.stringify(contents), 'utf8', (err) => {
        if (err) { console.error(`An error occurred while saving contents to ${path}`, err); }
    });
}

exports.readJson = function (path) {
    try { if (fs.existsSync(path)) { return JSON.parse(fs.readFileSync(path, 'utf8')); } } 
    catch (err) { console.error(`An error occurred while reading ${path}`, err); }
    return null;
}

// --------------------------------------------------------------------------------------

// FILE/PATH MANAGEMENT
// --------------------------------------------------------------------------------------

exports.makePath = function (pathToMake) {
    if (!fs.existsSync(pathToMake)) { fs.mkdirSync(pathToMake, { recursive: true }); }
}

exports.removePath = function (pathToRemove) {
    if (fs.existsSync(pathToRemove)) { fs.rmSync(pathToRemove, { recursive: true }); }
}

// --------------------------------------------------------------------------------------