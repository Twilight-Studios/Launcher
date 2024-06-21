const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

let mainWindow;
let popoutWindow;

function createLoginWindow() {
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
    if (credentials) {
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

    ipcMain.on('open-game', (event, gameId, gameState) => {
        createGameWindow(gameId, gameState);
    });
}

function createGameWindow(gameId, gameState) {
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
        mainWindow.webContents.send('game-id', gameId, gameState);
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
    if (validateCredentials(accessKey)) {
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
        const resp = await axios.post('http://127.0.0.1:5000/api/get-game', { key: readCredentials().accessKey, id: gameId, state: gameState });
        return resp.data
    } catch (error) {
        return {};
    }
}

async function getGames() {
    try {
        const resp = await axios.post('http://127.0.0.1:5000/api/get-all-games', { key: readCredentials().accessKey });
        return resp.data
    } catch (error) {
        return {};
    }
}

ipcMain.handle('get-game', async (event, gameId, gameState) => {
    const game =  await getGame(gameId, gameState);
    return game;
});

ipcMain.handle('get-games', async (event) => {
    const games =  await getGames();
    return games;
});


ipcMain.on('refresh', (event, notify) => {
    if (popoutWindow)
        popoutWindow.close();

    if (validateCredentials(readCredentials().accessKey)) {
        createDashboardWindow();
        if (notify) mainWindow.webContents.send('success-refresh');
    }
    else {
        createLoginWindow();
        mainWindow.webContents.send('lost-access');
    }
});

async function validateCredentials(credentials) {
    try {
        const resp = await axios.post('http://127.0.0.1:5000/api/validate-access', { key: credentials });
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