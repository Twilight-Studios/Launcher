const axios = require("axios");
const { ipcMain } = require("electron");
const fm = require("../fileManager")
const utils = require("../utils");

var currentGameId = null;
var caches = {};
const CACHE_TIMEOUT = 300000;

exports.getCurrentGameId = () => { return currentGameId; }

exports.setCurrentGameId = (gameId) => {
    if (!caches[gameId] || !caches[gameId].data) return false; // Do note that if there are no cached results, a game id cannot be set. This shouldn't cause any issues in practice

    let oldGameId = currentGameId;
    if (oldGameId) caches[oldGameId].timeout = setTimeout(() => { exports.clearGameDataCache(oldGameId) }, CACHE_TIMEOUT);

    currentGameId = gameId;
    clearTimeout(caches[currentGameId].timeout);
    return true;
}

exports.getCurrentGame = () => {
    if (!currentGameId) return null;
    return caches[currentGameId].data;
};

exports.clearAllGameDataCaches = () => {
    for (let key in caches) clearTimeout(caches[key].timeout);
    caches = {};
}

exports.clearGameDataCache = (gameId) => { if (caches[gameId]) delete caches[gameId]; }

exports.loadGameLaunchSettings = function (game) {
    let gameSettings = fm.readJson(`games/${game.id}/settings.json`, true);
    if (!gameSettings) return exports.setupGameLaunchSettings(game);
    return gameSettings;
}

exports.updateActiveBranch = function (game, newBranchId) {
    let gameSettings = exports.loadGameLaunchSettings(game);
    gameSettings.activeBranchId = newBranchId;
    fm.saveJson(`games/${game.id}/settings.json`, true, gameSettings);
}

exports.resetGameLaunchSettings = function (game) {
    fm.removePath(`games/${game.id}/settings.json`, true);
    exports.setupGameLaunchSettings(game);
}

exports.setupGameLaunchSettings = function (game) {
    fm.makePath(`games/${game.id}/`, true);
    fm.createJson(`games/${game.id}/settings.json`, true);
    let gameSettings = fm.readJson(`games/${game.id}/settings.json`, true);
    
    if (!gameSettings) {
        gameSettings = {
            activeBranchId: Object.keys(game.branches)[0],
            downloadedVersions: null // Should be an array or object looking like: { version: [branchUsingVersion, anotherBranchUsingVersion, etc...] }
        }
    }
    else {
        let validBranchIds = Object.keys(game.branches);
        if (!validBranchIds.includes(gameSettings.activeBranchId))  gameSettings.activeBranchId = validBranchIds[0];
        if (!gameSettings.downloadedVersions) gameSettings.downloadedVersions = null; // Improve security checks here
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

        exports.setupGameLaunchSettings(game);
        
        caches[gameId] = {
            data: game,
            containsArt: true,
            timeout: setTimeout(() => { exports.clearGameDataCache(gameId) }, CACHE_TIMEOUT)
        };

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

            exports.setupGameLaunchSettings(game);
            gamesData.push(game);

            caches[game.id] = {
                data: game,
                containsArt: (cached && caches[game.id].containsArt) ? true : false,
                timeout: setTimeout(() => { exports.clearGameDataCache(game.id) }, CACHE_TIMEOUT)
            };
        }

        return { success: true, payload: gamesData };
    }
    catch (error) {
        let status = 0; // Default status for no internet connection
        if (error.response) { status = error.response.status; }

        return { success: false, status: status }; 
    }
}

ipcMain.on("reset-game-launch-settings", (event, game) => { exports.resetGameLaunchSettings(game); } )
ipcMain.on("update-active-branch", (event, game, newBranchId) => { exports.updateActiveBranch(game, newBranchId) });
ipcMain.on("clear-all-game-data-caches", (event) => { exports.clearAllGameDataCaches(); });
ipcMain.on("set-current-game-id", (event, gameId) => { exports.setCurrentGameId(gameId); });