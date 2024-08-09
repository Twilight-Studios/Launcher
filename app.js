// TODO: Test app throughly

//  PACKAGE IMPORTS
// --------------------------------------------------------------------------------------

const { app, BrowserWindow, ipcMain, Menu, Notification } = require('electron');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const os = require('os');
const { fork, execSync, exec, spawn } = require('child_process');
const unzipper = require('unzipper');
const { autoUpdater } = require("electron-updater");

// --------------------------------------------------------------------------------------

// CUSTOMISATION
// --------------------------------------------------------------------------------------

// Used for all back-end
const DEFAULT_SERVER_URL = "https://twilightdev.replit.app"; // Only used as an automatic value for the server value for login

// Used for customisation of UI 
// TODO: Implement it
const PRIMARY_COLOR_HEX = "#000000"
const SECONDARY_COLOR_HEX = "#000000"
const ACCEPT_COLOR_HEX = "#000000"
const WARNING_COLOR_HEX = "#000000"
const REJECT_COLOR_HEX = "#000000"
const DARK_COLOR_HEX = "#000000"
const LIGHT_COLOR_HEX = "#000000"

// Used for Windows process identification
const APP_AUTHOR_DOMAIN = "twilightstudios.com"
const APP_NAME = "twilightstudioslauncher"

// --------------------------------------------------------------------------------------

// GLOBAL VARIABLES
// --------------------------------------------------------------------------------------

let currentServerUrl; // Holds the current server URL being used.
let mainWindow; // Holds the object that is the current main window. When null, program stops.
let patchNotesWindow; // Holds the object that is the current patch notes windows. Can be null.
let downloadProcess; // Holds the current child process in charge of downloading the game. Can be null.
let gameInDownload; // Object containing information about the current game being downloaded. Can be null.
let extractionActive = false; // Whether a zip file of the game is currently being extracted.
let coreGameProcess = null; // Holds the current child process which should be the game executable. Can be null.
let coreGameProcessPID = null; // Holds the process ID of the child process which should the game executable. Can be null.

// --------------------------------------------------------------------------------------

//  ELECTRON-UPDATER
// --------------------------------------------------------------------------------------

autoUpdater.autoDownload = false; // Updates are not automatically downloaded, and only checked on start-up.

autoUpdater.on("update-downloaded", () => {
    autoUpdater.quitAndInstall();
});

// --------------------------------------------------------------------------------------

// WINDOW CREATION
// --------------------------------------------------------------------------------------

function createUpdateWindow() {
    if (mainWindow) { mainWindow.close(); }

    mainWindow = new BrowserWindow({
        width: 400,
        height: 600,
        icon: path.join(__dirname, 'resources/logo.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'js/update.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        }
    });
    
    mainWindow.loadFile('pages/update.html');
    mainWindow.setResizable(false);
    Menu.setApplicationMenu(null);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();

        autoUpdater.checkForUpdates().then((result) => {
            if (result && result.cancellationToken) { // Valid update is found
                mainWindow.webContents.send('update-found');
                autoUpdater.downloadUpdate();
            }
            else { createLoginWindow(); } // Client is up-to-date
        })
    });
}

function createLoginWindow(autoValidateStoredCredentials=true) {
    if (mainWindow) { mainWindow.close(); }
    closePatchNotesWindow();

    mainWindow = new BrowserWindow({
        width: 400,
        height: 600,
        icon: path.join(__dirname, 'resources/logo.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'js/login.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        }
    });

    mainWindow.on('closed', closePatchNotesWindow);
    mainWindow.loadFile('pages/login.html');
    mainWindow.setResizable(false);
    Menu.setApplicationMenu(null);

    let credentials = readCredentials(); // Load stored credentials
    if (credentials) { 
        currentServerUrl = credentials.serverUrl; 
        mainWindow.webContents.send('fill-credentials', credentials);
    }

    if (credentials && autoValidateStoredCredentials) { // If stored credentials exist and these should be validated automatically.
        mainWindow.webContents.send('started-auto-validation');
        validateCredentials(credentials.accessKey, autoLogout=false).then(({ok, status}) => {
            if (ok) { createDashboardWindow(); } 
            else {
                mainWindow.webContents.send('failed-to-validate', getErrorMessage(status)); // TODO: More descriptive error handling and in all other places
                mainWindow.show();
            }
        });

    } 
    else {

        if (!credentials) {
            mainWindow.webContents.send('fill-server-url', DEFAULT_SERVER_URL);
            uninstallAllGames(); // Make sure that all games are uninstalled if credentials cannot be loaded (privacy reasons)
        }
        mainWindow.once('ready-to-show', () => { mainWindow.show(); });

    }
}

function createDashboardWindow() {
    if (mainWindow) { mainWindow.close(); }
    closePatchNotesWindow();

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        icon: path.join(__dirname, 'resources/logo.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'js/dashboard.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        }
    });
    
    mainWindow.on('closed', () => { closePatchNotesWindow(); });
    mainWindow.loadFile('pages/dashboard.html');
    mainWindow.setResizable(false);
    Menu.setApplicationMenu(null);
    mainWindow.once('ready-to-show', () => { mainWindow.show(); });

    mainWindow.webContents.once('did-finish-load', async () => {
        mainWindow.webContents.send('load-credentials', readCredentials());
    });
}

function createGameWindow(gameId, gameBranch, gameGlobalVersion) {
    if (mainWindow) { mainWindow.close(); }
    closePatchNotesWindow();

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        icon: path.join(__dirname, 'resources/logo.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'js/game.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        }
    });

    mainWindow.on('closed', () => { closePatchNotesWindow(); });
    mainWindow.loadFile('pages/game.html');
    mainWindow.setResizable(false);
    Menu.setApplicationMenu(null);

    mainWindow.webContents.once('did-finish-load', async () => {
        mainWindow.webContents.send('game-id', gameId, gameBranch, gameGlobalVersion);
    });

    mainWindow.once('ready-to-show', () => { mainWindow.show(); });
}

function createPatchNotesWindow(patchNotes) {
    closePatchNotesWindow();
    
    patchNotesWindow = new BrowserWindow({
        width: 1000,
        height: 600,
        icon: path.join(__dirname, 'resources/logo.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'js/patchnotes.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        }
    });

    patchNotesWindow.loadFile('pages/patchnotes.html');
    patchNotesWindow.setResizable(false);
    Menu.setApplicationMenu(null);

    patchNotesWindow.webContents.once('did-finish-load', () => {
        patchNotesWindow.webContents.send('load-patchnotes', patchNotes);
    });

    patchNotesWindow.once('ready-to-show', () => { patchNotesWindow.show(); });
}

// --------------------------------------------------------------------------------------

// APP EVENTS
// --------------------------------------------------------------------------------------

app.whenReady().then(createUpdateWindow);

app.on("ready", () => {
    if (process.platform == 'win32') {
        app.setAppUserModelId(`${APP_AUTHOR_DOMAIN.split('.')[1]}.${APP_AUTHOR_DOMAIN.split('.')[0]}.${APP_NAME}`); // Change later
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

ipcMain.on('notify', (event, title, description) => {
    let notification = new Notification({ title: title, body: description, icon: path.join(__dirname, 'resources/logo.ico') });
    notification.show();
    notification.on('click', (event, arg) => { mainWindow.show() });
});

ipcMain.handle('login', async (event, { accessKey, serverUrl }) => {
    currentServerUrl = serverUrl;
    let { ok, status } = await validateCredentials(accessKey, autoLogout=false);
    if (ok) {
        saveCredentials({ accessKey, serverUrl });
        return { success: true };
    }

    return { success: false, message: getErrorMessage(status) };
});

ipcMain.on('login-success', () => {
    createDashboardWindow();
});

ipcMain.on('logout', () => {
    closePatchNotesWindow();
    mainWindow.close();

    forceStopDownload();
    uninstallAllGames();

    clearCredentials();
    createLoginWindow();
    
    mainWindow.webContents.send('success-logout');
});

ipcMain.handle('get-game', async (event, gameId, gameBranch) => {
    let localVersion = null;
    let installing = false;
    const gamePath = path.join(app.getPath('userData'), `/games/${gameId}_${gameBranch}`);

    if (fs.existsSync(gamePath)) {
        const directories = fs.readdirSync(gamePath, { withFileTypes: true }).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
        if (directories.length > 0) { localVersion = directories[0].replace("_", "."); }
    }

    if (gameInDownload && gameInDownload.gameId === gameId && gameInDownload.gameBranch === gameBranch) {
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
    const gamesPath = path.join(app.getPath('userData'), 'games');

    if (fs.existsSync(gamesPath)) {
        // Read the content of the games directory, filtering for directories only
        const gameDirectories = fs.readdirSync(gamesPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        gameDirectories.forEach(gameDir => {
            const [gameId, gameBranch] = gameDir.split('_');
            const gameObj = games.find(game => game.id === gameId && game.branch === gameBranch);

            const shouldDelete = !gameObj || (gameObj && gameBranch !== gameObj.branch);

            if (shouldDelete) {
                const gameDirPath = path.join(gamesPath, gameDir);
                removePath(gameDirPath);
            }
        });
    }

    return games;
});

ipcMain.on('open-game', (event, gameId, gameBranch, gameGlobalVersion) => {
    createGameWindow(gameId, gameBranch, gameGlobalVersion);
});

ipcMain.on('cant-access-game', (event, gameId, gameBranch, installing) => {
    if (installing) { forceStopDownload(); }
    removePath(path.join(app.getPath('userData'), `/games/${gameId}_${gameBranch}`));

    createDashboardWindow();
    mainWindow.webContents.send('game-load-failed');
})

ipcMain.on('refresh',  async (event, notify, gameInfo = null) => {
    closePatchNotesWindow();

    const { ok, status } = await validateCredentials(readCredentials().accessKey, autoLogout=true);
    if (ok) {
        if (!gameInfo) { createDashboardWindow(); }
        else { 
            let { gameId, gameBranch, gameVersion } = gameInfo;
            createGameWindow(gameId, gameBranch, gameVersion); 
        }

        if (notify) mainWindow.webContents.send('success-refresh');
    }
});

ipcMain.on('uninstall-game', (event, gameId, gameBranch, gameTitle) => {
    if (gameInDownload) {
        mainWindow.webContents.send('cant-uninstall-download', gameId, gameBranch, gameTitle);
        return;
    }

    if (!fs.existsSync(path.join(app.getPath('userData'), `/games/${gameId}_${gameBranch}`))) {
        mainWindow.webContents.send('game-already-uninstalled', gameId, gameBranch, gameTitle);
        return;
    }

    removePath(path.join(app.getPath('userData'), `/games/${gameId}_${gameBranch}`));
    mainWindow.webContents.send('game-uninstalled', gameId, gameBranch, gameTitle);
});

ipcMain.on('open-patchnotes', (event, patchNotes) => {
    createPatchNotesWindow(patchNotes);
});

// --------------------------------------------------------------------------------------

// UTILITY FUNCTIONS
// --------------------------------------------------------------------------------------

function getErrorMessage(status) {
    switch (status) {
        case 403:
            return "Your access key is not valid!";
        case 404:
            return "The server is invalid!";
        case 406:
            return "The resource couldn't be found!";
        case 500:
            return "The server faced an error!";
        case -1:
            return "The server couldn't be reached!";
        default:
            return "An unknown error occurred!";
    }
}

function removePath(pathToRemove) {
    if (fs.existsSync(pathToRemove)) { fs.rmSync(pathToRemove); }
}

function closePatchNotesWindow() {
    if (patchNotesWindow) {
        try { patchNotesWindow.close(); }
        catch (err) { } // It's fine, its probably destroyed anyway
    }
    patchNotesWindow = null;
}

async function getGame(gameId, gameBranch) { // TODO: Error check
    try {
        const resp = await axios.post(currentServerUrl+'/api/get-game', { key: readCredentials().accessKey, id: gameId, branch: gameBranch });
        return resp.data
    } 
    catch (error) { return {}; }
}

async function getGames() { // TODO: Error check
    try {
        const resp = await axios.post(currentServerUrl+'/api/get-all-games', { key: readCredentials().accessKey });
        return resp.data
    }
    catch (error) { return {}; }
}

async function validateCredentials(credentials, autoLogout) { //TODO: Error check
    try {
        const resp = await axios.post(currentServerUrl +'/api/validate-access', { key: credentials });

        if (resp.status !== 200) {
            forceStopDownload();
            uninstallAllGames();

            if (autoLogout) {
                createLoginWindow(autoValidateStoredCredentials=false);
                mainWindow.webContents.send('invalid-credentials', getErrorMessage(resp.status));
            }
        }

        return { ok: resp.status === 200, status: resp.status };
    } 
    catch (error) { 
        if (autoLogout) {
            createLoginWindow(autoValidateStoredCredentials=false);
            mainWindow.webContents.send('invalid-credentials', getErrorMessage(resp.status));
        }
        
        return { ok: false, status: -1 }; // -1 is a manual override to state that no internet connection was established!
    }
}

function saveCredentials(credentials) { // TODO: Error check
    fs.writeFile('credentials.json', JSON.stringify(credentials), 'utf8', (err) => {
        if (err) { console.error('An error occurred while saving credentials', err); }
    });
}

function readCredentials() { // TODO: Error check
    try {
        if (fs.existsSync('credentials.json')) { 
            return JSON.parse(fs.readFileSync('credentials.json', 'utf8')); 
        }
    } 
    catch (err) { console.error('An error occurred while reading credentials', err); }
    return null;
}

function getGameLaunchJSON(gameId, gameBranch, gameVersion) {
    const jsonPath = path.join(app.getPath('userData'), `/games/${gameId}_${gameBranch}/${gameVersion}/launcher.json`);
    try {
        if (fs.existsSync(jsonPath)) { 
            return JSON.parse(fs.readFileSync(jsonPath, 'utf8')); 
        }
    } 
    catch (err) { console.error('An error occurred while reading a launcher.json file', err); }
    return null;
}

function clearCredentials() {
    removePath('credentials.json');
    currentServerUrl = null;
}

function forceStopDownload() {
    if (downloadProcess) {
        downloadProcess.kill();
        downloadProcess = null;
    }

    if (gameInDownload) {
        if (extractionActive) {
            if (readStream) readStream.destroy();
            if (writeStream) writeStream.destroy();
        }

        removePath(path.join(app.getPath('userData'), `/games/${gameInDownload.gamePath}`));
        removePath(path.join(app.getPath('userData'), "game.zip"));

        gameInDownload = null;
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
    if (gameInDownload) {
        downloadProcess.send({ action: 'cancel' });
    }

    removePath(path.join(app.getPath('userData'), "games"));
}

function executeCommand(commandObj, commandDir, callback) {
    const command = commandObj.command;
    execSync(command, { cwd: commandDir }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            if (commandObj.critical) { return callback(new Error(`Critical command failed: ${command}`)); }
        }
        callback(null);
    });
}

function runCommands(commandsArray, commandDir, callback) {
    for (let i = 0; i < commandsArray.length; i++) {
        executeCommand(commandsArray[i], commandDir, (err) => {
            if (err) { return callback(err); }
        });
    }
    callback(null);
}

// --------------------------------------------------------------------------------------

// DOWNLOAD MANAGEMENT
// --------------------------------------------------------------------------------------

ipcMain.on('start-download', (event, gameId, gameBranch, gamePlatform, gameTitle, gameVersion) => {

    if (gameInDownload && (gameInDownload.gameId !== gameId || gameInDownload.gameBranch !== gameBranch)) {
        mainWindow.webContents.send('cant-install-download', gameId, gameBranch, gameTitle);
        return;
    }

    let downloadUrl = currentServerUrl + "/api/download-game";

    let payload =  {
        key: readCredentials().accessKey, // TODO: POTENTIAL ERROR HERE
        id: gameId,
        branch: gameBranch,
        platform: gamePlatform
    }

    let outputPath = path.join(app.getPath('userData'), "game.zip");
    removePath(path.join(app.getPath('userData'), `/games/${gameId}_${gameBranch}`));

    downloadProcess = fork(path.join(__dirname, 'js/downloadWorker.js'));
    gameInDownload = { gameId : gameId, gameBranch : gameBranch, gamePath : `${gameId}_${gameBranch}` };
  
    downloadProcess.send({ downloadUrl, outputPath, payload });
  
    downloadProcess.on('message', (message) => {

        if (message.status === 'success') {
            mainWindow.webContents.send('extract-start', gameId, gameBranch);
            handleGameInstall(outputPath, gameId, gameBranch, gameVersion, gameTitle, () => {
                gameInDownload = null;
                extractionActive = false;
                mainWindow.webContents.send('download-success', gameId, gameBranch, gameTitle);
            });
        } 

        else if (message.status === 'in-progress') { // TODO: Create consistent IPC naming system (more of a game.js problem)
            mainWindow.webContents.send('download-progress', gameId, gameBranch, message.progress, message.downloadSpeed); 
        }

        else if (message.status === 'error') {
            gameInDownload = null;
            removePath(outputPath);
            mainWindow.webContents.send('download-error', message.error, gameId, gameBranch, gameTitle);
        } 

        else if (message.status === 'cancelled') {
            gameInDownload = null;
            removePath(outputPath);
            mainWindow.webContents.send('download-cancelled', gameId, gameBranch, gameTitle);
        }
    });
  
    downloadProcess.on('error', (error) => {
        gameInDownload = null;
        console.error('Error in download process:', error);
        removePath(outputPath);
        mainWindow.webContents.send('download-error', 'Error in download process', gameId, gameBranch, gameTitle);
    });

});
  
ipcMain.on('cancel-download', () => {
    if (downloadProcess) { downloadProcess.send({ action: 'cancel' }); }
});

// --------------------------------------------------------------------------------------

// INSTALLATION MANAGEMENT
// --------------------------------------------------------------------------------------

function handleGameInstall(outputPath, gameId, gameBranch, gameVersion, gameTitle, callback) {
    const gameDir = path.join(app.getPath('userData'), `games/${gameId}_${gameBranch}/${gameVersion.replaceAll(".", "_")}`);
    if (!fs.existsSync(gameDir)) { fs.mkdirSync(gameDir, { recursive: true }); }

    extractZip(outputPath, gameDir, gameId, gameBranch, (err) => {
        if (err) {
            gameInDownload = null;
            extractionActive = false;
            removePath(outputPath);

            console.error(err);
            mainWindow.webContents.send('extract-error', err, gameId, gameBranch, gameTitle);
        }
        else { callback(); }
    });
}

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
            removePath(zipPath);
            callback(null);
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
            if (code === 0) { mainWindow.webContents.send('play-finished', gameId, gameBranch); } 
            else if (code === 1) { } // FORCE STOPPED
            else { mainWindow.webContents.send('launch-error', gameId, gameBranch, `Game exited with code: ${code}`) }
        });

        coreGameProcess.on('error', (err) => {
            mainWindow.webContents.send('launch-error', gameId, gameBranch, `Failed to launch core game: ${err.message}`);
            coreGameProcess = null;
            coreGameProcessPID = null;
        });

    } 
    catch (err) { mainWindow.webContents.send('launch-error', gameId, gameBranch, err.message); }
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