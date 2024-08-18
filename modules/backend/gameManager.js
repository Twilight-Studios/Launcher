const axios = require("axios");

exports.getGameData = async function (user, game, minimal = false) {
    try {
        const resp = await axios.post(`${user.serverUrl}/api/get-game`, { key: user.accessKey, id: game.id, branch: game.branch, minimal: minimal });
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
        const resp = await axios.post(`${user.serverUrl}/api/get-all-games`, { key: user.accessKey, minimal: minimal });
        return { success: true, payload: resp.data }
    }
    catch (error) {
        let status = 0; // Default status for no internet connection
        if (error.response) { status = error.response.status; }

        return { success: false, status: status }; 
    }
}