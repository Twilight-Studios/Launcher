const axios = require("axios");

exports.getGameData = async function (user, game, minimal = false) {
    try {
        const resp = await axios.post(`${user.serverUrl}/api/get-game`, { playtester_id: user.playtesterId, id: game.id, branch: game.branch, minimal: minimal });
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