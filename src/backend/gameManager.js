const axios = require("axios");
const { ipcMain } = require("electron");
const fm = require("../fileManager")
const utils = require("../utils");

var currentGame = null;
var caches = {};
const CACHE_TIMEOUT = 300000;

exports.getCurrentGame = () => { return currentGame; };

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

exports.updateActiveBranch = function (game, newBranch) {
    let gameSettings = exports.loadGameLaunchSettings(game);
    gameSettings.activeBranchId = newBranch.name; // Should be id, not name, but GitHub jsons need to be adjusted first
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
            activeBranchId: Object.values(game.branches)[0].name, // Should be id, not name, but GitHub jsons need to be adjusted first
            downloadedVersions: null // Should be an array or object looking like: { version: [branchUsingVersion, anotherBranchUsingVersion, etc...] }
        }

        fm.saveJson(`games/${game.id}/settings.json`, true, gameSettings);
    }

    return gameSettings;
}

exports.getGameData = async function (user, game) {
    if (!game) {
        if (!currentGame) return { success: false, status: -1 } // Default status for invalid parameters 
        game = currentGame;
    }

    let cached = caches[game.id] && caches[game.id].data

    try {
        let payload = {
            playtester_id: user.playtesterId,
            game_id: game.id,
            get_all: (cached && caches[game.id].containsArt) ? false : true
        }

        const resp = await axios.post(`${user.serverUrl}/api/get-game`, payload);
        let gameData = resp.data;

        if (cached) {
            gameData = utils.mergeObjects(caches[game.id].data, gameData); // TODO: An additional version check should occur, to see if patch notes ant etc are to be reloaded, and gameFiles are to be rewritten
            clearTimeout(caches[game.id].timeout);
        }

        exports.setupGameLaunchSettings(gameData);
        
        caches[game.id] = {
            data: gameData,
            containsArt: true,
            timeout: setTimeout(() => { exports.clearGameDataCache(game.id) }, CACHE_TIMEOUT)
        };

        return { success: true, payload: gameData };
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
ipcMain.on("update-active-branch", (event, game, newBranch) => { exports.updateActiveBranch(game, newBranch) });
ipcMain.on("clear-all-game-data-caches", (event) => { exports.clearAllGameDataCaches(); });
ipcMain.on("set-current-game", (event, game) => { currentGame = game; });