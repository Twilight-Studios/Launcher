const axios = require("axios");

exports.getGameData = async function (user, game, minimal = false) {
    try {
        const resp = await axios.post(`${user.serverUrl}/api/get-game`, { key: user.accessKey, id: game.id, branch: game.branch, minimal: minimal });
        return resp.data
    } 
    catch (error) { return null; }
}

exports.getAllGameData = async function (user, minimal = false) {
    try {
        const resp = await axios.post(`${user.serverUrl}/api/get-all-games`, { key: user.accessKey, minimal: minimal });
        return resp.data
    }
    catch (error) { return null; }
}