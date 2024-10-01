const axios = require("axios");
const { ipcMain } = require("electron");
const utils = require("../utils");

var currentGame = null;

var cachedGamesList = null;
var recacheGameListTimeout = null;
var caches = {};
const CACHE_TIMEOUT = 300000;

exports.getCurrentGame = () => { return currentGame; };

exports.clearGameDataCache = () => {
    cachedGamesList = null;
    if (recacheGameListTimeout) clearTimeout(recacheGameListTimeout);
    recacheGameListTimeout = null;

    for (let key in caches) {
        clearTimeout(caches[key].timeout);
    }
    caches = {};
}

exports.getGameData = async function (user, game) {
    if (!game) game = currentGame;
    let cached = caches[game.id] && caches[game.id].data

    try {
        let payload = {
            playtester_id: user.playtesterId,
            game_id: game.id,
            get_all: (cached) ? false : true
        }

        const resp = await axios.post(`${user.serverUrl}/api/get-game`, payload);
        let data = resp.data;

        if (cached) data = utils.mergeObjects(caches[game.id].data, data); // TODO: An additional version check should occur, to see if patch notes ant etc are to be reloaded
        
        caches[game.id] = {
            data: data,
            timeout: setTimeout(() => {
                delete caches[game.id];
            }, CACHE_TIMEOUT)
        };

        return { success: true, payload: data };
    } 
    catch (error) {
        let status = 0; // Default status for no internet connection
        if (error.response) { status = error.response.status; }

        return { success: false, status: status }; 
    }
}

exports.getAllGameData = async function (user) {
    try {
        let payload = {
            playtester_id: user.playtesterId,
            get_cover: (cachedGamesList) ? false : true
        }

        const resp = await axios.post(`${user.serverUrl}/api/get-all-games`, payload);
        let data = resp.data;

        if (cachedGamesList) data = utils.mergeObjectLists(cachedGamesList, data);
        cachedGamesList = data;
        
        if (recacheGameListTimeout) clearTimeout(recacheGameListTimeout);
        recacheGameListTimeout = setTimeout(() => {
            cachedGamesList = null;
            recacheGameListTimeout = null;
        }, CACHE_TIMEOUT);

        return { success: true, payload: data };
    }
    catch (error) {
        let status = 0; // Default status for no internet connection
        if (error.response) { status = error.response.status; }

        return { success: false, status: status }; 
    }
}

ipcMain.on("clear-game-data-cache", (event) => { exports.clearGameDataCache(); });
ipcMain.on("set-current-game", (event, game) => { currentGame = game; });