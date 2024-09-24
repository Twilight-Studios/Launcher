const axios = require("axios");
const { ipcMain } = require("electron");

var currentGame = null;
exports.getCurrentGame = () =>  { return currentGame; };
ipcMain.on("set-current-game", (event, game) => { currentGame = game; });

exports.getGameData = async function (user, game, minimal = false) {
    if (!game) game = currentGame;

    try {
        const resp = await axios.post(`${user.serverUrl}/api/get-game`, { playtester_id: user.playtesterId, game_id: game.id, minimal: minimal });
        return { success: true, payload: resp.data }
    } 
    catch (error) {
        let status = 0; // Default status for no internet connection
        if (error.response) { status = error.response.status; }

        return { success: false, status: status }; 
    }
}

exports.getAllGameData = async function (user, minimal = false) {
    try {
        const resp = await axios.post(`${user.serverUrl}/api/get-all-games`, { playtester_id: user.playtesterId, minimal: minimal });
        return { success: true, payload: resp.data }
    }
    catch (error) {
        let status = 0; // Default status for no internet connection
        if (error.response) { status = error.response.status; }

        return { success: false, status: status }; 
    }
}