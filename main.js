const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

let mainWindow;
let popoutWindow;

function createLoginWindow() {
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
    if (credentials) {
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

    ipcMain.on('open-game', (event, gameId) => {
        createGameWindow(gameId);
    });
}

function createGameWindow(gameId) {
    if (mainWindow) {
        mainWindow.close();
    }
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        icon: path.join(__dirname, 'twilight.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'game.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        }
    });

    mainWindow.loadFile('game.html');
    mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('load-game', gameId);
    });
    mainWindow.setResizable(true);

    Menu.setApplicationMenu(null);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
    
    ipcMain.on('open-patchnote', (event, patchnoteId) => {
        createPopoutWindow(patchnoteId);
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
    saveCredentials({ accessKey });
    return { success: true };
    // Remove later ig
    try {
        const resp = await axios.post('https://example.com/api/login', { accessKey });
        if (resp.status === 200) {
            saveCredentials({ accessKey });
            return { success: true };
        } else {
            return { success: false, message: resp.data.message };
        }
    } catch (error) {
        return { success: false, message: error.message };
    }
});

ipcMain.on('login-success', () => {
    createDashboardWindow();
});

async function validateCredentials(credentials) {
    return true; // change later
    try {
        const resp = await axios.post('https://example.com/api/login', credentials);
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