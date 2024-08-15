// MODULE IMPORTS
// --------------------------------------------------------------------------------------

const { getZipDownloadPath, makePath, removePath, getGamePath } = require('./fileManager');
const windowManager = require('./windowManager');
const fs = require('fs');
const unzipper = require('unzipper');

// --------------------------------------------------------------------------------------

// GLOBAL VARIABLE MANAGEMENT
// --------------------------------------------------------------------------------------

let gameInInstallation = null;
let readStream = null;
let writeStream = null;

exports.inInstallation = () => { return gameInInstallation !== null; }

exports.killFileStreams = function () {
    if (readStream) { readStream.destroy(); }
    if (writeStream) { writeStream.destroy(); }
    gameInInstallation = null;
}

// --------------------------------------------------------------------------------------

// INSTALLATION
// --------------------------------------------------------------------------------------

exports.installZip = function (game, callback) {
    gameInInstallation = game;

    let zipPath = getZipDownloadPath();
    const gamePath = getGamePath(game);
    makePath(gamePath);

    const totalBytes = fs.statSync(zipPath).size;
    let processedBytes = 0;

    readStream = fs.createReadStream(zipPath);
    writeStream = unzipper.Extract({ path: gamePath });
    readStream.pipe(writeStream);

    readStream.on('data', chunk => {
        processedBytes += chunk.length;
        windowManager.sendMessage('extract-progress', game.id, game.branch, Math.round((processedBytes / totalBytes) * 100));
    });

    writeStream.on('close', () => {
        readStream.destroy();
        writeStream.destroy();

        if (gameInInstallation) {
            removePath(zipPath);
            callback(null);
        }
    });

    function handleInstallError(err) {
        console.error(err);
        windowManager.sendMessage('extract-error', err, game.id, game.branch, game.title)
        callback(err);
    }

    readStream.on('error', handleInstallError);
    writeStream.on('error', handleInstallError);
}

// --------------------------------------------------------------------------------------