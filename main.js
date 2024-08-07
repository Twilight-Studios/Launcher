//  PACKAGE IMPORTS
// --------------------------------------------------------------------------------------

const { app, BrowserWindow, ipcMain, Menu, Notification, shell } = require('electron');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const os = require('os');
const { fork, execSync, exec, spawn } = require('child_process');
const unzipper = require('unzipper');
const { autoUpdater } = require("electron-updater");

// --------------------------------------------------------------------------------------

// GLOBAL VARIABLES
// --------------------------------------------------------------------------------------

const serverUrl = "https://twilightdev.replit.app";

let mainWindow;
let patchNotesWindow;
let downloadProcess;
let inDownload;
let extractionActive = false;
let coreGameProcess = null;
let coreGameProcessPID = null;

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
            preload: path.join(__dirname, 'update.js'),
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
                    mainWindow.webContents.send('update-found');
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

    closePatchNotesWindow();

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

    mainWindow.on('closed', () => {
        closePatchNotesWindow();
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

    closePatchNotesWindow();

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
    
    mainWindow.on('closed', () => {
        closePatchNotesWindow();
    });

    mainWindow.loadFile('dashboard.html');
    mainWindow.setResizable(false);

    Menu.setApplicationMenu(null);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    ipcMain.removeAllListeners('open-game');

    ipcMain.on('open-game', (event, gameId, gameBranch, gameGlobalVersion) => {
        createGameWindow(gameId, gameBranch, gameGlobalVersion);
    });
}

function createGameWindow(gameId, gameBranch, gameGlobalVersion) {
    if (mainWindow) {
        mainWindow.close();
    }

    closePatchNotesWindow();

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

    mainWindow.on('closed', () => {
        closePatchNotesWindow();
    });

    mainWindow.loadFile('game.html');
    mainWindow.webContents.once('did-finish-load', async () => {
        mainWindow.webContents.send('game-id', gameId, gameBranch, gameGlobalVersion);
    });

    mainWindow.setResizable(false);
    
    Menu.setApplicationMenu(null);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });
}

function createPatchNotesWindow(patchNotes) {
    closePatchNotesWindow();
    
    patchNotesWindow = new BrowserWindow({
        width: 600,
        height: 400,
        icon: path.join(__dirname, 'twilight.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'patchnotes.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        }
    });

    patchNotesWindow.loadFile('patchnotes.html');
    patchNotesWindow.webContents.once('did-finish-load', () => {
        patchNotesWindow.webContents.send('load-patchnotes', patchNotes);
    });

    Menu.setApplicationMenu(null);

    patchNotesWindow.once('ready-to-show', () => {
        patchNotesWindow.show();
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

app.on('will-quit', () => {
    forceStopDownload();
    forceStopCurrentGame();
});

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
    closePatchNotesWindow();
    mainWindow.close();
    clearCredentials();
    forceStopDownload();
    uninstallAllGames();
    createLoginWindow();
    mainWindow.webContents.send('success-logout');
});

ipcMain.handle('get-game', async (event, gameId, gameBranch) => {
    let localVersion = null;
    let installing = false;

    let gamePath = path.join(app.getPath('userData'), `/games/${gameId}_${gameBranch}`);

    if (fs.existsSync(gamePath)) {
        localVersion = fs.readdirSync(gamePath, { withFileTypes: true }).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name)[0]
        localVersion = localVersion.replaceAll("_", ".")
    }
    
    if (inDownload === `${gameId}_${gameBranch}`) {
        installing = true;
    }

    const game = await getGame(gameId, gameBranch);

    return {
        game: game,
        localVersion: localVersion,
        installing: installing
    };
});

ipcMain.handle('get-games', async (event) => {
    const games = await getGames();

    let gamesPath = path.join(app.getPath('userData'), "games");

    if (fs.existsSync(gamesPath)) {
        fs.readdirSync(gamesPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
            .forEach(game => {
                const [gameId, gameBranch] = game.split("_");
                const gameObj = games.find(g => g.id === gameId && g.branch === gameBranch);

                if (!gameObj) {
                    fs.rmSync(path.join(gamesPath, game), { recursive: true });
                } else if (gameBranch !== gameObj.branch) {
                    fs.rmSync(path.join(gamesPath, game), { recursive: true });
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
    closePatchNotesWindow();

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

ipcMain.on('refresh-game',  async (event, gameId, gameBranch, gameVersion, notify) => {
    closePatchNotesWindow();

    const resp = await validateCredentials(readCredentials());
    if (resp) {
        createGameWindow(gameId, gameBranch, gameVersion);
        if (notify) mainWindow.webContents.send('success-refresh');
    }
    else {
        createLoginWindow(autofill=false);
        mainWindow.webContents.send('lost-access');
    }
});

ipcMain.on('uninstall-game', (event, gameId, gameBranch, gameTitle) => {
    if (inDownload) {
        mainWindow.webContents.send('cant-uninstall-download', gameId, gameBranch, gameTitle);
        return;
    }

    if (!fs.existsSync(path.join(app.getPath('userData'), `/games/${gameId}_${gameBranch}`))) {
        mainWindow.webContents.send('game-already-uninstalled', gameId, gameBranch, gameTitle);
        return;
    }

    fs.rmSync(path.join(app.getPath('userData'), `/games/${gameId}_${gameBranch}`), { recursive: true });
    mainWindow.webContents.send('game-uninstalled', gameId, gameBranch, gameTitle);
});

ipcMain.on('open-patchnotes', (event, patchNotes) => {
    createPatchNotesWindow(patchNotes);
});

ipcMain.on('open-server', (event) => {
    shell.openExternal(serverUrl); // Change to actual access key endpoint when ready
});

// --------------------------------------------------------------------------------------

// UTILITY FUNCTIONS
// --------------------------------------------------------------------------------------

function closePatchNotesWindow() {
    if (patchNotesWindow) {
        try {
            patchNotesWindow.close();
        }
        catch (err) {
            // It's fine, its probably destroyed anyway
        }
    }

    patchNotesWindow = null;
}

async function getGame(gameId, gameBranch) {
    try {
        const resp = await axios.post(serverUrl+'/api/get-game', { key: readCredentials(), id: gameId, branch: gameBranch });
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

function getGameLaunchJSON(gameId, gameBranch, gameVersion) {
    const jsonPath = path.join(app.getPath('userData'), `/games/${gameId}_${gameBranch}/${gameVersion}/launcher.json`);
    try {
        if (fs.existsSync(jsonPath)) {
            return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        }
    } catch (err) {
        console.error('An error occurred while reading a launcher.json file', err);
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

function forceStopCurrentGame() {
    if (coreGameProcessPID !== null) {
        try {
            if (os.platform() === 'win32') {
                exec(`taskkill /PID ${coreGameProcessPID} /T /F`, (err) => {
                    coreGameProcess = null;
                    coreGameProcessPID = null;
                });
            } else {
                try {
                    process.kill(coreGameProcessPID, 0);
                    process.kill(coreGameProcessPID, 'SIGKILL');
                    coreGameProcess = null;
                    coreGameProcessPID = null;
                } catch (err) {
                    // Can't do much here
                }
            }
        } catch (err) {
            // Can't do much here
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

function executeCommand(commandObj, commandDir, callback) {
    const command = commandObj.command;
    execSync(command, { cwd: commandDir }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            if (commandObj.critical) {
                return callback(new Error(`Critical command failed: ${command}`));
            }
        }
        callback(null);
    });
}

function runCommands(commandsArray, commandDir, callback) {
    let index = 0;
    function nextCommand(err) {
        if (err) {
            return callback(err);
        }
        if (index < commandsArray.length) {
            executeCommand(commandsArray[index++], commandDir, nextCommand);
        } else {
            callback(null);
        }
    }
    nextCommand(null);
}

// --------------------------------------------------------------------------------------

// DOWNLOAD MANAGEMENT
// --------------------------------------------------------------------------------------

ipcMain.on('start-download', (event, id, branch, platform, title, version) => {
    if (inDownload) {
        if (inDownload !== `${id}_${branch}`) {
            mainWindow.webContents.send('cant-install-download', id, branch, title);
            return;
        }
    }

    let downloadUrl = serverUrl + "/api/download-game";

    let payload =  {
        key: readCredentials(),
        id: id,
        branch: branch,
        platform: platform
    }

    let outputPath = path.join(app.getPath('userData'), "game.zip");

    if (fs.existsSync(path.join(app.getPath('userData'), `/games/${id}_${branch}`))) {
        fs.rmSync(path.join(app.getPath('userData'), `/games/${id}_${branch}`), { recursive: true });
    }

    downloadProcess = fork(path.join(__dirname, 'download-worker.js'));
    inDownload = `${id}_${branch}`;
  
    downloadProcess.send({ downloadUrl, outputPath, payload });
  
    downloadProcess.on('message', (message) => {
      if (message.status === 'success') {
        mainWindow.webContents.send('extract-start', id, branch);
        handleGameInstall(outputPath, id, branch, version, title, () => {
            inDownload = null;
            extractionActive = false;
            mainWindow.webContents.send('download-success', id, branch, title);
        });
    } else if (message.status === 'in_progress') {
        mainWindow.webContents.send('download-progress', id, branch, message.progress, message.downloadSpeed);
    } else if (message.status === 'error') {
        inDownload = null;
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }
        mainWindow.webContents.send('download-error', message.error, id, branch, title);
      } else if (message.status === 'cancelled') {
        inDownload = null;
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }
        mainWindow.webContents.send('download-cancelled', id, branch, title);
      }
    });
  
    downloadProcess.on('error', (error) => {
      inDownload = null;
      console.error('Error in download process:', error);
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
    }
      mainWindow.webContents.send('download-error', 'Error in download process', id, branch, title);
    });
  });
  
ipcMain.on('cancel-download', () => {
    if (downloadProcess) {
      downloadProcess.send({ action: 'cancel' });
    }
});

function handleGameInstall(outputPath, gameId, gameBranch, gameVersion, gameTitle, callback) {
    const gameDir = path.join(app.getPath('userData'), `games/${gameId}_${gameBranch}/${gameVersion.replaceAll(".", "_")}`);
    if (!fs.existsSync(gameDir)) {
        fs.mkdirSync(gameDir, { recursive: true });
    }

    extractZip(outputPath, gameDir, gameId, gameBranch, (err) => {
        if (err) {
            inDownload = null;
            extractionActive = false;
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
            }
            console.error(err);
            mainWindow.webContents.send('extract-error', err, gameId, gameBranch, gameTitle);
        } else {
            callback();
        }
    });
}

// --------------------------------------------------------------------------------------

// EXTRACTION MANAGEMENT
// --------------------------------------------------------------------------------------

function extractZip(zipPath, extractTo, gameId, gameBranch, callback) {
    extractionActive = true;

    const readStream = fs.createReadStream(zipPath);
    const writeStream = unzipper.Extract({ path: extractTo });

    const totalBytes = fs.statSync(zipPath).size;
    let processedBytes = 0;

    readStream.pipe(writeStream);

    readStream.on('data', chunk => {
        processedBytes += chunk.length;
        mainWindow.webContents.send('extract-progress', gameId, gameBranch, Math.round((processedBytes / totalBytes) * 100));
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

// LAUNCH MANAGEMENT
// --------------------------------------------------------------------------------------

ipcMain.on('launch-game', (event, gameId, gameBranch, gameVersion) => {
    gameVersion = gameVersion.replaceAll(".", "_")
    let launchJSON = getGameLaunchJSON(gameId, gameBranch, gameVersion);

    if (launchJSON === null) {
        mainWindow.webContents.send('launch-error', gameId, gameBranch, "launcher.json is missing from the game build!");
        return;
    }

    try {
        let coreExecCommand = launchJSON.core_exec_command;
        let relativeDependencyCommands = launchJSON.relative_dependency_commands;
        let systemDependencyCommands = launchJSON.system_dependency_commands;

        const userRoot = process.env.HOME || process.env.USERPROFILE;
        const gameFolder = path.join(app.getPath('userData'), `/games/${gameId}_${gameBranch}/${gameVersion}/`);

        if (systemDependencyCommands.length !== 0) {
            mainWindow.webContents.send('launch-progress', gameId, gameBranch, "Executing System Dependency Commands");

            runCommands(systemDependencyCommands, userRoot, (err) => {
                if (err) {
                    mainWindow.webContents.send('launch-error', gameId, gameBranch, `Failed to execute system dependencies: ${err.message}`);
                    return;
                }
            });
        }

        if (relativeDependencyCommands.length !== 0) {
            mainWindow.webContents.send('launch-progress', gameId, gameBranch, "Executing Relative Dependency Commands");

            runCommands(relativeDependencyCommands, gameFolder, (err) => {
                if (err) {
                    mainWindow.webContents.send('launch-error', gameId, gameBranch, `Failed to execute relative dependencies: ${err.message}`);
                    return;
                }
            });
        }

        mainWindow.webContents.send('play-start', gameId, gameBranch);

        coreGameProcess = spawn(coreExecCommand, { cwd: gameFolder, shell: true });
        coreGameProcessPID = coreGameProcess.pid;

        coreGameProcess.on('close', (code) => {
            coreGameProcess = null;
            coreGameProcessPID = null; 
            if (code === 0) {
                mainWindow.webContents.send('play-finished', gameId, gameBranch);
            } else if (code === 1) {
                // FORCE STOPPED
            } else {
                mainWindow.webContents.send('launch-error', gameId, gameBranch, `Game exited with code: ${code}`);
            }
        });

        coreGameProcess.on('error', (err) => {
            mainWindow.webContents.send('launch-error', gameId, gameBranch, `Failed to launch core game: ${err.message}`);
            coreGameProcess = null;
            coreGameProcessPID = null;
        });

    } catch (err) {
        mainWindow.webContents.send('launch-error', gameId, gameBranch, err.message);
    }
});

ipcMain.on('stop-game', (event, gameId, gameBranch) => {
    if (coreGameProcessPID !== null) {
        mainWindow.webContents.send('stop-start', gameId, gameBranch);
        try {
            if (os.platform() === 'win32') {
                exec(`taskkill /PID ${coreGameProcessPID} /T /F`, (err) => {
                    if (err) {
                        mainWindow.webContents.send('stop-error', gameId, gameBranch, err.message);
                    } else {
                        mainWindow.webContents.send('play-finished', gameId, gameBranch);
                    }
                    coreGameProcess = null;
                    coreGameProcessPID = null;
                });
            } else {
                try {
                    process.kill(coreGameProcessPID, 'SIGTERM');
                    setTimeout(() => {
                        try {
                            process.kill(coreGameProcessPID, 0);
                            process.kill(coreGameProcessPID, 'SIGKILL');
                        } catch (e) {
                            // Process is already terminated
                        }
                        mainWindow.webContents.send('play-finished', gameId, gameBranch);
                        coreGameProcess = null;
                        coreGameProcessPID = null;
                    }, 5000); 
                } catch (err) {
                    mainWindow.webContents.send('stop-error', gameId, gameBranch, err.message);
                    coreGameProcess = null;
                    coreGameProcessPID = null;
                }
            }
        } catch (err) {
            mainWindow.webContents.send('stop-error', gameId, gameBranch, err.message);
        }
    }
});

// --------------------------------------------------------------------------------------