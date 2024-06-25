const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const { fork } = require('child_process');
const extract = require('extract-zip');

const serverUrl = "http://127.0.0.1:5000";
const gameCollectionPath = path.join(app.getPath('userData'), 'gameCollection.json');

let mainWindow;
let popoutWindow;
let downloadProcess;
let inDownload;

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

    //Menu.setApplicationMenu(null);

    const credentials = readCredentials();
    if (credentials && autofill) {
        validateCredentials(credentials.accessKey).then(valid => {
            if (valid) {
                createDashboardWindow();
            } else {
                mainWindow.webContents.send('failed-to-validate');
                mainWindow.webContents.send('fill-credentials', credentials);
                mainWindow.show();
            }
        });
    } else {
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

    //Menu.setApplicationMenu(null);

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
    
    //Menu.setApplicationMenu(null);

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

    //Menu.setApplicationMenu(null);

    popoutWindow.once('ready-to-show', () => {
        popoutWindow.show();
    });
}

app.whenReady().then(createLoginWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createLoginWindow();
    }
});

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
    createLoginWindow();
    mainWindow.webContents.send('success-logout');
});

async function getGame(gameId, gameState) {
    try {
        const resp = await axios.post(serverUrl+'/api/get-game', { key: readCredentials().accessKey, id: gameId, state: gameState });
        return resp.data
    } catch (error) {
        return {};
    }
}

async function getGames() {
    try {
        const resp = await axios.post(serverUrl+'/api/get-all-games', { key: readCredentials().accessKey });
        return resp.data
    } catch (error) {
        return {};
    }
}

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
    return games;
});


ipcMain.on('refresh',  async (event, notify) => {
    if (popoutWindow)
        popoutWindow.close();

    const resp = await validateCredentials(readCredentials().accessKey);
    if (resp) {
        createDashboardWindow();
        if (notify) mainWindow.webContents.send('success-refresh');
    }
    else {
        createLoginWindow(autofill=false);
        mainWindow.webContents.send('lost-access');
    }
});

async function validateCredentials(credentials) {
    try {
        const resp = await axios.post(serverUrl+'/api/validate-access', { key: credentials });
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
            return JSON.parse(fs.readFileSync('credentials.json', 'utf8'));
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

ipcMain.on('start-download', (event, id, state, platform, title, version) => {
    let downloadUrl = serverUrl + "/api/download-game";

    let payload =  {
        key: readCredentials().accessKey,
        id: id,
        state: state,
        platform: platform
    }

    let outputPath = path.join(app.getPath('userData'), "game.zip");

    if (fs.existsSync(path.join(app.getPath('userData'), `/games/${id}_${state}`))) {
        fs.rmdirSync(path.join(app.getPath('userData'), `/games/${id}_${state}`, { recursive: true }))
    }

    downloadProcess = fork(path.join(__dirname, 'download-worker.js'));
    inDownload = `${id}_${state}`;
  
    downloadProcess.send({ downloadUrl, outputPath, payload });
  
    downloadProcess.on('message', (message) => {
      if (message.status === 'success') {
        mainWindow.webContents.send('download-extracting', id, state);
        handleGameInstall(outputPath, id, state, version, title, () => {
            inDownload = null;
            mainWindow.webContents.send('download-success', id, state, title);
        });
    } else if (message.status === 'in_progress') {
        mainWindow.webContents.send('download-progress', id, state, message.progress, message.downloadSpeed);
    } else if (message.status === 'error') {
        inDownload = null;
        fs.unlinkSync(outputPath);
        mainWindow.webContents.send('download-error', message.error, id, state, title);
      } else if (message.status === 'cancelled') {
        inDownload = null;
        fs.unlinkSync(outputPath);
        mainWindow.webContents.send('download-cancelled', id, state, title);
      }
    });
  
    downloadProcess.on('error', (error) => {
      inDownload = null;
      console.error('Error in download process:', error);
      fs.unlinkSync(outputPath);
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

    extractZip(outputPath, gameDir, (err) => {
        if (err) {
            inDownload = null;
            fs.unlinkSync(outputPath);
            console.error(err);
            mainWindow.webContents.send('download-error', err, gameId, gameState, gameTitle);
        } else {
            callback();
        }
    });
}

async function extractZip(zipPath, extractTo, callback) {
    try {
        await extract(zipPath, { dir: extractTo });
        fs.unlinkSync(zipPath);
        callback(null);
      } catch (err) {
        callback(err);
      }
}

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