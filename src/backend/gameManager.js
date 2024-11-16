const axios = require("axios");
const { ipcMain } = require("electron");
const fm = require("../fileManager")
const utils = require("../utils");

var currentGameId = null;
var gameInInstall = null;
var downloader = null;
var silentCancel = false;
var caches = {};
const CACHE_TIMEOUT = 300000;

exports.onGameInstallProgress = null;

exports.getCurrentGameId = () => { return currentGameId; }

exports.setCurrentGameId = (gameId) => {
    if (!caches[gameId] || !caches[gameId].data) return false; // Do note that if there are no cached results, a game id cannot be set. This shouldn't cause any issues in practice

    let oldGameId = currentGameId;
    if (oldGameId && (!gameInInstall || gameInInstall.id != oldGameId)) caches[oldGameId].timeout = setTimeout(() => { exports.clearGameDataCache(oldGameId) }, CACHE_TIMEOUT);

    currentGameId = gameId;
    clearTimeout(caches[currentGameId].timeout);
    return true;
}

exports.getCurrentGame = () => {
    if (!currentGameId) return null;
    return caches[currentGameId].data;
};

exports.installGame = (gameId, version, { serverUrl, playtesterId }) => {
    if (gameInInstall) return false;
    if (!caches[gameId] || !caches[gameId].data) return false; // Do note that if there are no cached results, a game id cannot be set. This shouldn't cause any issues in practice

    gameInInstall = {
        id: gameId,
        version: version,
        stage: 'download',
        progress: null
    };

    clearTimeout(caches[gameId].timeout);

    let downloadUrl = `${serverUrl}/api/download-game`;

	let payload =  {
        playtester_id: playtesterId,
        game_id: gameId,
        version: version,
        platform: "windows"
    };

    downloader = new fm.Downloader(downloadUrl, "game.zip", payload, (progress) => {
        _updateGameInDownloadProgress(progress);
        if (progress.status == "progress") return;

        // exports.setDownloadedVersions(caches[gameId].data, [version]);
        gameInInstall = null;
        downloader = null;
    });
}

exports.cancelInstall = (silent) => { 
    if (!downloader) return;
    silentCancel = silent;
    downloader.cancel(); 
}

function _updateGameInDownloadProgress(progress) {
    if (!gameInInstall) return;
    gameInInstall.progress = progress;

    if (progress.status == 'cancelled' && silentCancel) {
        silentCancel = false;
        return;
    }

    if (exports.onGameInstallProgress) exports.onGameInstallProgress(gameInInstall.stage, progress);
}

exports.getGameInInstall = () => { return gameInInstall; }

exports.clearAllGameDataCaches = () => {
    for (let key in caches) {
        if (gameInInstall && key == gameInInstall.id) continue;
        if (currentGameId == key) continue;
        clearTimeout(caches[key].timeout);
        delete caches[key];
    }
}

exports.clearGameDataCache = (gameId) => { if (caches[gameId]) delete caches[gameId]; }

exports.loadGameFilesData = function (game) {
    let gameSettings = fm.readJson(`games/${game.id}/settings.json`, true);
    if (!gameSettings) return exports.setupGameFilesData(game);
    return gameSettings;
}

exports.updateActiveBranch = function (game, newBranchId) {
    let gameSettings = exports.loadGameFilesData(game);
    gameSettings.activeBranchId = newBranchId;
    fm.saveJson(`games/${game.id}/settings.json`, true, gameSettings);
}

exports.setDownloadedVersions = function (game, versions) { // Temporary test
    let gameSettings = exports.loadGameFilesData(game);
    gameSettings.downloadedVersions = versions;
    fm.saveJson(`games/${game.id}/settings.json`, true, gameSettings);
}

exports.resetGameFilesData = function (game) {
    fm.removePath(`games/${game.id}/settings.json`, true);
    exports.setupGameFilesData(game);
}

exports.setupGameFilesData = function (game) {
    fm.makePath(`games/${game.id}/`, true);
    fm.createJson(`games/${game.id}/settings.json`, true);
    let gameSettings = fm.readJson(`games/${game.id}/settings.json`, true);
    
    if (!gameSettings) {
        gameSettings = {
            activeBranchId: Object.keys(game.branches)[0],
            downloadedVersions: [] // Should be an array or object looking like: { version: [branchUsingVersion, anotherBranchUsingVersion, etc...] }
        }
    }
    else {
        let validBranchIds = Object.keys(game.branches);
        if (!validBranchIds.includes(gameSettings.activeBranchId))  gameSettings.activeBranchId = validBranchIds[0];
        if (!gameSettings.downloadedVersions) gameSettings.downloadedVersions = []; // Improve security checks here
    }

    fm.saveJson(`games/${game.id}/settings.json`, true, gameSettings);
    return gameSettings;
}

exports.getGameData = async function (user, gameId) {
    if (!gameId) {
        if (!currentGameId) return { success: false, status: -1 } // Default status for invalid parameters 
        gameId = currentGameId;
    }

    let cached = caches[gameId] && caches[gameId].data;

    try {
        let payload = {
            playtester_id: user.playtesterId,
            game_id: gameId,
            get_all: (cached && caches[gameId].containsArt) ? false : true
        }

        const resp = await axios.post(`${user.serverUrl}/api/get-game`, payload);
        let game = resp.data;

        Object.keys(game.branches).forEach(key => { // Temporary fix for server compatibility
            let branchId = game.branches[key].name;
            game.branches[branchId] = game.branches[key];
            delete game.branches[key];

            game.branches[branchId].name = game.branches[branchId].id;
            delete game.branches[branchId].id;
        });

        if (cached) {
            game = utils.mergeObjects(caches[gameId].data, game); // TODO: An additional version check should occur, to see if patch notes ant etc are to be reloaded, and gameFiles are to be rewritten
            clearTimeout(caches[gameId].timeout);
        }

        exports.setupGameFilesData(game);
        
        caches[gameId] = {
            data: game,
            containsArt: true,
            timeout: null,
        };

        if (currentGameId != gameId && (!gameInInstall || gameInInstall.id != gameId)) {
            caches[gameId].timeout = setTimeout(() => { exports.clearGameDataCache(gameId) }, CACHE_TIMEOUT);
        }

        return { success: true, payload: game };
    } 
    catch (error) {
        let status = 0; // Default status for no internet connection
        if (error.response) { status = error.response.status; }

        return { success: false, status: status }; 
    }
}

exports.getAllGameData = async function (user) {
    try {
        const resp = await axios.post(`${user.serverUrl}/api/get-all-games`, { playtester_id: user.playtesterId, get_cover: true });

        let rawGamesData = resp.data;
        let gamesData = [];

        for (let game of rawGamesData) {
            let cached = caches[game.id] && caches[game.id].data;

            Object.keys(game.branches).forEach(key => { // Temporary fix for server compatibility
                let branchId = game.branches[key].name;
                game.branches[branchId] = game.branches[key];
                delete game.branches[key];
    
                game.branches[branchId].name = game.branches[branchId].id;
                delete game.branches[branchId].id;
            });

            if (cached) {
                game = utils.mergeObjects(caches[game.id].data, game);
                clearTimeout(caches[game.id].timeout);
            }

            exports.setupGameFilesData(game);
            gamesData.push(game);

            caches[game.id] = {
                data: game,
                containsArt: (cached && caches[game.id].containsArt) ? true : false
            };

            if (currentGameId != game.id && (!gameInInstall || gameInInstall.id != game.id)) {
                caches[game.id].timeout = setTimeout(() => { exports.clearGameDataCache(game.id) }, CACHE_TIMEOUT);
            }
        }

        return { success: true, payload: gamesData };
    }
    catch (error) {
        let status = 0; // Default status for no internet connection
        if (error.response) { status = error.response.status; }

        return { success: false, status: status }; 
    }
}

ipcMain.on("reset-game-files-data", (event, game) => { exports.resetGameFilesData(game); } )
ipcMain.on("update-active-branch", (event, game, newBranchId) => { exports.updateActiveBranch(game, newBranchId) });
ipcMain.on("clear-all-game-data-caches", (event) => { exports.clearAllGameDataCaches(); });
ipcMain.on("install-game", (event, gameId, version, { serverUrl, playtesterId }) => { exports.installGame(gameId, version, { serverUrl, playtesterId }); })
ipcMain.handle("get-game-in-install", (event) => { return exports.getGameInInstall(); });
ipcMain.on("set-current-game-id", (event, gameId) => { exports.setCurrentGameId(gameId); });