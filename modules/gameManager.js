// MODULE IMPORTS
// --------------------------------------------------------------------------------------

const { ipcMain } = require('electron');
const fs = require('fs');
const axios = require('axios');
const auth = require('./auth');
const windowManager = require('./windowManager');
const downloadManager = require('./downloadManager');
const { removePath, getGamePath, getGamesPath } = require('./fileManager'); 

// --------------------------------------------------------------------------------------

// GAME FILE CHECKS
// --------------------------------------------------------------------------------------

exports.isGameInstalled = (game) => { return fs.existsSync(getGamePath(game)); }

exports.getInstalledVersion = (game) => {
    const gamePath = getGamePath(game);
    let installedVersion = null;

    if (fs.existsSync(gamePath)) {
        const directories = fs.readdirSync(gamePath, { withFileTypes: true }).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
        if (directories.length > 0) { installedVersion = directories[0].replaceAll("_", "."); }
    }

    return installedVersion;
}

exports.checkGameStatus = function (game) {
    let installedVersion = exports.getInstalledVersion(game);
    let installing = downloadManager.isGameInDownload(game);

    return { installedVersion: installedVersion, currentlyInstalling: installing }
}

// --------------------------------------------------------------------------------------

// GAME DATA RETRIEVAL
// --------------------------------------------------------------------------------------

exports.getGameData = async function (user, game, minimal = false) { // TODO: Sanitize output
    try {
        const resp = await axios.post(`${user.serverUrl}/api/get-game`, { key: user.accessKey, id: game.id, branch: game.branch, minimal: minimal });
        return resp.data
    } 
    catch (error) { return null; }
}

exports.getAllGameData = async function (user, minimal = false) { // TODO: Sanitize output
    try {
        const resp = await axios.post(`${user.serverUrl}/api/get-all-games`, { key: user.accessKey, minimal: minimal });
        return resp.data
    }
    catch (error) { return null; }
}

// --------------------------------------------------------------------------------------

// UNINSTALLING
// --------------------------------------------------------------------------------------

exports.uninstallGame = function (game, force=false, quiet=false) {
    if (downloadManager.isGameInDownload(game) && !force) { 
        if (!quiet) { windowManager.sendMessage('cant-uninstall-download', game.id, game.branch, game.title); }
        return;
    }

    if (!exports.isGameInstalled(game)) {
        if (!quiet) { windowManager.sendMessage('game-already-uninstalled', game.id, game.branch, game.title); }
        return;
    }

    removePath(getGamePath(game));
    if (!quiet) { windowManager.sendMessage('game-uninstalled', game.id, game.branch, game.title); }
}

exports.uninstallUnavailableGames = function (availableGames) {
    const gamesPath = getGamesPath();

    if (fs.existsSync(gamesPath)) {
        // Read the content of the games directory, filtering for directories only
        const gameDirectories = fs.readdirSync(gamesPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        gameDirectories.forEach(gameDir => {
            const [gameId, gameBranch] = gameDir.split('_');
            const gameObj = availableGames.find(game => game.id === gameId && game.branch === gameBranch);

            const shouldDelete = !gameObj || (gameObj && gameBranch !== gameObj.branch);

            if (downloadManager.isGameInDownload({ id: gameId, branch: gameBranch })) { downloadManager.forceStopDownload(); }
            if (shouldDelete) { exports.uninstallGame({ id: gameId, branch: gameBranch }, true, true); }
        });
    }
}

exports.uninstallAllGames = function () {
    downloadManager.forceStopDownload();
    removePath(getGamesPath());
}

// --------------------------------------------------------------------------------------

// IPC CALLBACKS
// --------------------------------------------------------------------------------------

ipcMain.handle('get-game', async (event, gameId, gameBranch) => {
    let game = { id: gameId, branch: gameBranch };
    
    let { installedVersion, currentlyInstalling } = exports.checkGameStatus(game);
    game = await exports.getGameData(auth.getUser(), game);

    return { game: game, localVersion: installedVersion, installing: currentlyInstalling };
});

ipcMain.handle('get-games', async (event) => {
    const games = await exports.getAllGameData(auth.getUser(), true);
    exports.uninstallUnavailableGames(games);
    return games;
});

ipcMain.on('open-game', (event, gameId, gameBranch, latestVersion) => {
    windowManager.createGameWindow(gameId, gameBranch, latestVersion);
});

ipcMain.on('cant-access-game', (event, gameId, gameBranch) => {
    exports.uninstallGame({ id: gameId, branch: gameBranch }, true, true);
    windowManager.createLibraryWindow(() => { windowManager.sendMessage('game-load-failed'); });
});

ipcMain.on('uninstall-game', (event, gameId, gameBranch, gameTitle) => {
    exports.uninstallGame({ id: gameId, branch: gameBranch, title: gameTitle });
});

// --------------------------------------------------------------------------------------