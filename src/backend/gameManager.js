const axios = require("axios");
const { ipcMain } = require("electron");
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

exports.getGameData = async function (user, game) {
    if (!game) game = currentGame;
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
            gameData = utils.mergeObjects(caches[game.id].data, gameData); // TODO: An additional version check should occur, to see if patch notes ant etc are to be reloaded
            clearTimeout(caches[game.id].timeout);
        }
        
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

ipcMain.on("clear-all-game-data-caches", (event) => { exports.clearAllGameDataCaches(); });
ipcMain.on("set-current-game", (event, game) => { currentGame = game; });