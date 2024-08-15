// MODULE IMPORTS
// --------------------------------------------------------------------------------------

const { ipcMain } = require('electron');
const { fork } = require('child_process');
const path = require('path');
const { removePath, getZipDownloadPath } = require('./fileManager');
const gameManager = require('./gameManager');
const windowManager = require('./windowManager');
const installManager = require('./installManager');
const auth = require('./auth');

// --------------------------------------------------------------------------------------

// GLOBAL VARIABLE MANAGEMENT
// --------------------------------------------------------------------------------------

let downloadProcess = null;
let gameInDownload = null;

exports.isGameInDownload = (game) => {
	if (!gameInDownload) return false;
	return (gameInDownload.id == game.id && gameInDownload.branch == game.branch);
}

exports.isDownloadActive = () => { return gameInDownload !== null }

// --------------------------------------------------------------------------------------

// GAME DOWNLOADING
// --------------------------------------------------------------------------------------

exports.startGameDownload = function (game) {
	if (exports.isDownloadActive()) {
		windowManager.sendMessage('cant-install-download', game.id, game.branch, game.title);
		return;
	}

	let downloadUrl = `${auth.getUser().serverUrl}/api/download-game`;

	let payload =  {
        key: auth.getUser().accessKey,
        id: game.id,
        branch: game.branch,
        platform: game.platform
    };

	let outputPath = getZipDownloadPath();
	removePath(outputPath);
    gameManager.uninstallGame(game, true, true);

	downloadProcess = fork(path.join(__dirname, '../js/downloadWorker.js'));
    gameInDownload = game;

	downloadProcess.send({ downloadUrl, outputPath, payload });

	downloadProcess.on('message', exports.downloadProcessCallback);
	downloadProcess.on('error', exports.downloadProcessErrorCallback);
}

exports.downloadProcessCallback = function (message) {
	let game = gameInDownload;

	switch (message.status) {
		case 'success':
			windowManager.sendMessage('extract-start', game.id, game.branch);
			downloadProcess = null;
			installManager.installZip(gameInDownload, (err) => {
				gameInDownload = null;
				if (!err) { windowManager.sendMessage('download-success', game.id, game.branch, game.title); }
				else { exports.forceStopDownload(); }
			});
			break;
		
		case 'progress':
			windowManager.sendMessage('download-progress', game.id, game.branch, message.progress, message.downloadSpeed);
			break;

		case 'error':
			exports.downloadProcessErrorCallback(message.error);
			break;

		case 'cancelled':
			gameInDownload = null;
			downloadProcess = null;
			removePath(getZipDownloadPath());
			windowManager.sendMessage('download-cancelled', game.id, game.branch, game.title);
			break;
		
		default:
			break;
	}
}

exports.downloadProcessErrorCallback = function (error) {
	exports.forceStopDownload();
	console.error('Error in download process:', error);
	windowManager.sendMessage('download-error', 'Error in download process', gameInDownload.id, gameInDownload.branch, gameInDownload.title);
	gameInDownload = null;
}

// --------------------------------------------------------------------------------------

// STOPPING GAME DOWNLOADS
// --------------------------------------------------------------------------------------

exports.forceStopDownload = function () {
    if (downloadProcess) {
        downloadProcess.kill();
        downloadProcess = null;
    }

    if (gameInDownload) {
        installManager.killFileStreams();

		gameManager.uninstallGame(gameInDownload, true, true);
        removePath(getZipDownloadPath());

        gameInDownload = null;
    }
}

exports.gracefullyStopDownload = () => { if (downloadProcess) { downloadProcess.send({ action: 'cancel' }); } }

// --------------------------------------------------------------------------------------

// IPC CALLBACKS
// --------------------------------------------------------------------------------------

ipcMain.on('start-download', (event, gameId, gameBranch, gamePlatform, gameTitle, gameVersion) => {
    let game = {
        id: gameId,
        branch: gameBranch,
        platform: gamePlatform,
        title: gameTitle,
        version: gameVersion
    };

    exports.startGameDownload(game);
});

ipcMain.on('cancel-download', exports.gracefullyStopDownload);

// --------------------------------------------------------------------------------------