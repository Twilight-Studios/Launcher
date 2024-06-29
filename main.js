//  PACKAGE IMPORTS
// --------------------------------------------------------------------------------------

const { app, BrowserWindow, ipcMain, Menu, Notification } = require('electron');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const { fork } = require('child_process');
const unzipper = require('unzipper');
const { autoUpdater } = require("electron-updater");

// --------------------------------------------------------------------------------------

// GLOBAL VARIABLES
// --------------------------------------------------------------------------------------

const serverUrl = "https://twilightdev.replit.app";

let mainWindow;
let popoutWindow;
let downloadProcess;
let inDownload;
let extractionActive = false;

// --------------------------------------------------------------------------------------

//  ELECTRON-UPDATER
// --------------------------------------------------------------------------------------

autoUpdater.autoDownload = false;

autoUpdater.on("update-downloaded", () => {
    autoUpdater.quitAndInstall();
});

// --------------------------------------------------------------------------------------

// WINDOW MANAGEMENT
// --------------------------------------------------------------------------------------

function createUpdateWindow() {
    if (mainWindow) {
        mainWindow.close();
    }

    mainWindow = new BrowserWindow({
        width: 400,
        height: 600,
        icon: path.join(__dirname, 'twilight.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        }
    });
    
    mainWindow.loadFile('update.html');
    mainWindow.setResizable(false);

    Menu.setApplicationMenu(null);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();

        autoUpdater.checkForUpdates().then((result) => {
            if (result) {
                if (result.cancellationToken) {
                    autoUpdater.downloadUpdate();
                }
                else {
                    createLoginWindow();
                }
            }
            else {
                createLoginWindow();
            }
        })
    });
}

function createLoginWindow(autofill=true) {
    if (mainWindow) {
        mainWindow.close();
    }

    mainWindow = new BrowserWindow({
        width: 400,
        height: 600,
        icon: path.join(__dirname, 'twilight.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'login.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        }
    });
    
    mainWindow.loadFile('login.html');
    mainWindow.setResizable(false);

    Menu.setApplicationMenu(null);

    const credentials = readCredentials();
    if (credentials && autofill) {
        validateCredentials(credentials).then(valid => {
            if (valid) {
                createDashboardWindow();
            } else {
                mainWindow.webContents.send('failed-to-validate');
                mainWindow.webContents.send('fill-credentials', credentials);
                mainWindow.show();
            }
        });
    } else {
        if (!credentials) {
            uninstallAllGames();
        }
        mainWindow.once('ready-to-show', () => {
            mainWindow.show();
        });
    }
}

function createDashboardWindow() {
    if (mainWindow) {
        mainWindow.close();
    }
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        icon: path.join(__dirname, 'twilight.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'dashboard.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        }
    });

    mainWindow.loadFile('dashboard.html');
    mainWindow.setResizable(false);

    Menu.setApplicationMenu(null);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    ipcMain.removeAllListeners('open-game');

    ipcMain.on('open-game', (event, gameId, gameState, gameGlobalVersion) => {
        createGameWindow(gameId, gameState, gameGlobalVersion);
    });
}

function createGameWindow(gameId, gameState, gameGlobalVersion) {
    if (mainWindow) {
        mainWindow.close();
    }

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        icon: path.join(__dirname, 'twilight.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'game.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        }
    });

    mainWindow.loadFile('game.html');
    mainWindow.webContents.once('did-finish-load', async () => {
        mainWindow.webContents.send('game-id', gameId, gameState, gameGlobalVersion);
    });

    mainWindow.setResizable(false);
    
    Menu.setApplicationMenu(null);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
}

function createPopoutWindow(patchnoteId) {
    if (popoutWindow) {
        popoutWindow.close();
    }
    popoutWindow = new BrowserWindow({
        width: 600,
        height: 400,
        icon: path.join(__dirname, 'twilight.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'popout.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        }
    });

    popoutWindow.loadFile('patchnote.html');
    popoutWindow.webContents.once('did-finish-load', () => {
        popoutWindow.webContents.send('load-patchnote', patchnoteId);
    });

    Menu.setApplicationMenu(null);

    popoutWindow.once('ready-to-show', () => {
        popoutWindow.show();
    });
}

// --------------------------------------------------------------------------------------

// APP INIT AND CLOSE
// --------------------------------------------------------------------------------------

app.whenReady().then(createUpdateWindow);

app.on("ready", () => {
    if (process.platform == 'win32') {
        app.setAppUserModelId('com.twilightstudios.twilightstudioslauncher');
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        forceStopDownload();
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createLoginWindow();
    }
});

// --------------------------------------------------------------------------------------

// GLOBAL IPC CALLBACKS
// --------------------------------------------------------------------------------------

ipcMain.handle('login', async (event, { accessKey }) => {
    let valid = await validateCredentials(accessKey);
    if (valid) {
        saveCredentials({ accessKey });
        return { success: true };
    }
    return { success: false, message: "Invalid access key!" };
});

ipcMain.on('login-success', () => {
    createDashboardWindow();
});

ipcMain.on('logout', () => {
    if (popoutWindow)
        popoutWindow.close();
    mainWindow.close();
    clearCredentials();
    forceStopDownload();
    uninstallAllGames();
    createLoginWindow();
    mainWindow.webContents.send('success-logout');
});

ipcMain.handle('get-game', async (event, gameId, gameState, version) => {
    let localVersion = null;
    let installing = false;

    let gamePath = path.join(app.getPath('userData'), `/games/${gameId}_${gameState}`);

    if (fs.existsSync(gamePath)) {
        localVersion = fs.readdirSync(gamePath, { withFileTypes: true }).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name)[0]
        localVersion = localVersion.replaceAll("_", ".")
    }
    
    if (inDownload === `${gameId}_${gameState}`) {
        installing = true;
    }

    const game = await getGame(gameId, gameState);
    return {
        game: game,
        localVersion: localVersion,
        installing: true
    };
});

ipcMain.handle('get-games', async (event) => {
    const games =  await getGames();

    let gamesPath = path.join(app.getPath('userData'), "games");

    if (fs.existsSync(gamesPath)) {
        fs.readdirSync(gamesPath, { withFileTypes: true }).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name).forEach(game => {
            if (!(game.split("_")[0] in games)) {
                fs.rmSync(path.join(app.getPath('userData'), `/games/${game}`), { recursive: true });
                return games;
            }
            
            if(game.split("_")[1] !== games[game.split("_")[0]].state) {
                fs.rmSync(path.join(app.getPath('userData'), `/games/${game}`), { recursive: true });
                return games;
            }
        });
    }

    return games;
});

ipcMain.on('notify', (event, title, description) => {
    let notification = new Notification({ title: title, body: description, icon: path.join(__dirname, 'twilight.ico') });

    notification.show();

    notification.on('click', (event, arg) => {
        mainWindow.show();
    });
});

ipcMain.on('refresh',  async (event, notify) => {
    if (popoutWindow)
        popoutWindow.close();

    const resp = await validateCredentials(readCredentials());
    if (resp) {
        createDashboardWindow();
        if (notify) mainWindow.webContents.send('success-refresh');
    }
    else {
        createLoginWindow(autofill=false);
        mainWindow.webContents.send('lost-access');
    }
});

ipcMain.on('uninstall-game', (event, gameId, gameState, gameTitle) => {
    if (inDownload) {
        mainWindow.webContents.send('cant-uninstall-download', gameId, gameState, gameTitle);
        return;
    }

    if (!fs.existsSync(path.join(app.getPath('userData'), `/games/${gameId}_${gameState}`))) {
        mainWindow.webContents.send('game-already-uninstalled', gameId, gameState, gameTitle);
        return;
    }

    fs.rmSync(path.join(app.getPath('userData'), `/games/${gameId}_${gameState}`), { recursive: true });
    mainWindow.webContents.send('game-uninstalled', gameId, gameState, gameTitle);
});

// --------------------------------------------------------------------------------------

// UTILITY FUNCTIONS
// --------------------------------------------------------------------------------------

async function getGame(gameId, gameState) {
    try {
        const resp = await axios.post(serverUrl+'/api/get-game', { key: readCredentials(), id: gameId, state: gameState });
        return resp.data
    } catch (error) {
        return {};
    }
}

async function getGames() {
    try {
        const resp = await axios.post(serverUrl+'/api/get-all-games', { key: readCredentials() });
        return resp.data
    } catch (error) {
        return {};
    }
}

async function validateCredentials(credentials) {
    try {
        const resp = await axios.post(serverUrl+'/api/validate-access', { key: credentials });

        if (resp.status !== 200) {
            forceStopDownload();
            uninstallAllGames();
        }

        return resp.status === 200;
    } catch (error) {
        return false;
    }
}

function saveCredentials(credentials) {
    fs.writeFile('credentials.json', JSON.stringify(credentials), 'utf8', (err) => {
        if (err) {
            console.error('An error occurred while saving credentials', err);
        }
    });
}

function readCredentials() {
    try {
        if (fs.existsSync('credentials.json')) {
            return JSON.parse(fs.readFileSync('credentials.json', 'utf8')).accessKey;
        }
    } catch (err) {
        console.error('An error occurred while reading credentials', err);
    }
    return null;
}

function clearCredentials() {
    if (fs.existsSync('credentials.json')) {
        fs.unlinkSync('credentials.json');
    }
}

function forceStopDownload() {
    if (downloadProcess) {
        downloadProcess.kill();
        downloadProcess = null;
    }
    if (inDownload) {
        if (extractionActive) {
            if (readStream) readStream.destroy();
            if (writeStream) writeStream.destroy();
        }

        if (fs.existsSync(path.join(app.getPath('userData'), `/games/${inDownload}`))) {
            fs.rmSync(path.join(app.getPath('userData'), `/games/${inDownload}`), { recursive: true });
        }

        if (fs.existsSync(path.join(app.getPath('userData'), "game.zip"))) {
            fs.unlinkSync(path.join(app.getPath('userData'), "game.zip"), { recursive: true });
        }
    }
}

function uninstallAllGames() {
    if (inDownload) {
        downloadProcess.send({ action: 'cancel' });
    }

    if (fs.existsSync(path.join(app.getPath('userData'), "games"))) {
        fs.rmSync(path.join(app.getPath('userData'), "games"), { recursive: true });
    }
}

// --------------------------------------------------------------------------------------

// DOWNLOAD MANAGEMENT
// --------------------------------------------------------------------------------------

ipcMain.on('start-download', (event, id, state, platform, title, version) => {
    let downloadUrl = serverUrl + "/api/download-game";

    let payload =  {
        key: readCredentials(),
        id: id,
        state: state,
        platform: platform
    }

    let outputPath = path.join(app.getPath('userData'), "game.zip");

    if (fs.existsSync(path.join(app.getPath('userData'), `/games/${id}_${state}`))) {
        fs.rmSync(path.join(app.getPath('userData'), `/games/${id}_${state}`), { recursive: true });
    }

    downloadProcess = fork(path.join(__dirname, 'download-worker.js'));
    inDownload = `${id}_${state}`;
  
    downloadProcess.send({ downloadUrl, outputPath, payload });
  
    downloadProcess.on('message', (message) => {
      if (message.status === 'success') {
        mainWindow.webContents.send('extract-start', id, state);
        handleGameInstall(outputPath, id, state, version, title, () => {
            inDownload = null;
            extractionActive = false;
            mainWindow.webContents.send('download-success', id, state, title);
        });
    } else if (message.status === 'in_progress') {
        mainWindow.webContents.send('download-progress', id, state, message.progress, message.downloadSpeed);
    } else if (message.status === 'error') {
        inDownload = null;
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }
        mainWindow.webContents.send('download-error', message.error, id, state, title);
      } else if (message.status === 'cancelled') {
        inDownload = null;
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }
        mainWindow.webContents.send('download-cancelled', id, state, title);
      }
    });
  
    downloadProcess.on('error', (error) => {
      inDownload = null;
      console.error('Error in download process:', error);
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
    }
      mainWindow.webContents.send('download-error', 'Error in download process', id, state, title);
    });
  });
  
ipcMain.on('cancel-download', () => {
    if (downloadProcess) {
      downloadProcess.send({ action: 'cancel' });
    }
});

function handleGameInstall(outputPath, gameId, gameState, gameVersion, gameTitle, callback) {
    const gameDir = path.join(app.getPath('userData'), `games/${gameId}_${gameState}/${gameVersion.replaceAll(".", "_")}`);
    if (!fs.existsSync(gameDir)) {
        fs.mkdirSync(gameDir, { recursive: true });
    }

    extractZip(outputPath, gameDir, gameId, gameState, (err) => {
        if (err) {
            inDownload = null;
            extractionActive = false;
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
            }
            console.error(err);
            mainWindow.webContents.send('extract-error', err, gameId, gameState, gameTitle);
        } else {
            callback();
        }
    });
}

// --------------------------------------------------------------------------------------

// EXTRACTION MANAGEMENT
// --------------------------------------------------------------------------------------

function extractZip(zipPath, extractTo, gameId, gameState, callback) {
    extractionActive = true;

    const readStream = fs.createReadStream(zipPath);
    const writeStream = unzipper.Extract({ path: extractTo });

    const totalBytes = fs.statSync(zipPath).size;
    let processedBytes = 0;

    readStream.pipe(writeStream);

    readStream.on('data', chunk => {
        processedBytes += chunk.length;
        mainWindow.webContents.send('extract-progress', gameId, gameState, Math.round((processedBytes / totalBytes) * 100));
    });

    writeStream.on('close', () => {
        readStream.destroy();
        writeStream.destroy();
        if (extractionActive) {
            if (fs.existsSync(zipPath)) {;
                fs.unlinkSync(zipPath);
            }
            callback();
        }
    });

    readStream.on('error', err => {
        readStream.destroy();
        callback(err);
    });

    writeStream.on('error', err => {
        readStream.destroy();
        callback(err);
    });
}

// --------------------------------------------------------------------------------------