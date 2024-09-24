const { app, ipcMain } = require('electron');

const wm = require("./src/backend/windowManager");
const gm = require("./src/backend/gameManager");
const sm = require("./src/backend/settingsManager");
const updateManager = require("./src/backend/updateManager");
const auth = require("./src/backend/auth");
const fm = require("./src/fileManager.js");

const DEFAULT_SERVER_URL = "http://127.0.0.1:5000"; // Only used as an automatic value for the server value for login

// Dev/testing tools (MUST BE SET TO FALSE BEFORE LEAVING DEV ENVIRONMENT)
wm.enableDevTools = false; // Used to provide access to chromium dev tools 
auth.bypassAuth = false; // Used to skip auth to access UI offline

// Localisation setup
let localisationStrings = {};

fm.getAllJsons(fm.getPathInAppDir("/resources/locales/")).forEach(([fileName, jsonPath]) => {
    localeContent = fm.readJson(jsonPath);
    for (const [key, value] of Object.entries(localeContent)) {
        if (!(key in localisationStrings)) localisationStrings[key] = {};
        localisationStrings[key][fileName.split(".")[0]] = value;
    }
});

ipcMain.handle('get-localisation-strings', () => { return localisationStrings; });

let currentSettings = {};
let windowForward = null;

wm.addWindowPreset('update', 400, 600, () => {
    updateManager.checkForUpdates().then(updateAvailable => { 
        if (updateAvailable) wm.sendMessage('update-found');

        else {
            if (windowForward) {
                wm.openWindowPreset(windowForward, null);
                windowForward = null;
                return;
            }

            wm.openWindowPreset('login', async () => { // Auto-auth occurs here
                if (!auth.isUserValid()) return;
                wm.sendMessage('try-login');
            });
        }
    });
});

wm.addWindowPreset('login', 400, 600, () => {
    auth.loadUser();
    wm.sendMessage('fill-input-fields', auth.getUser(), DEFAULT_SERVER_URL);  
})

wm.addWindowPreset('library', 1280, 720, async () => {
    let gamesData = await gm.getAllGameData(auth.getUser(), true);
    if (!gamesData.success && !auth.onAuthLost(gamesData.status)) return;
    wm.sendMessage('library-loaded', gamesData, auth.getUser());
});

wm.addWindowPreset('game', 1280, 720, async () => {
    let gameData = await gm.getGameData(auth.getUser(), null, false);
    if (!gameData.success && !auth.onAuthLost(gameData.status)) return;
    wm.sendMessage("game-loaded", gameData);
});

wm.addWindowPreset('settings', 1280, 720, () => {
    wm.sendMessage("settings-loaded", currentSettings, auth.getUser());
});

wm.onWindowPresetOpened = function (fileName) {
    fm.makePath("games", true); // Temporary
    currentSettings = sm.getSettings();

    return {
        domCallbacks : { 'localise' : currentSettings.language },

        // This section should be uncommented if users should be manually authenticated on page loads. Currently unused as all server requests handle this logic behind the scenes.
        /* asyncTask : async () => {
            if (fileName == "login" || fileName == "update") return;
            
            let {ok, status} = await auth.authenticateUser();
            if (!ok) return auth.onAuthLost(status);
            return true;
        } */
    }
}

auth.onLoginSuccess = () => { setTimeout(() => { wm.openWindowPreset('library'); }, 1250); }

auth.onLogout = () => {
    // sm.resetSettings(); This is a maybe, idk if settings should be kept between logout
    wm.openWindowPreset('login', () => {
        wm.sendNotification("[!:success]", "[!:successLogoutText]", 3000);
    });
};

auth.onAuthLost = function (code) {
    let behaviour = currentSettings.authFailBehaviour;

    if (behaviour == 2) { // Simply notify that access was failed and continue as usual
        wm.sendNotification('[!:loginFailed]', `[!:${code}]`, 3000);
        return true;
    }
        
    if (behaviour == 0) { // Default behaviour, should logout as usual and the window should not be loaded.
        wm.openWindowPreset('login', () => {
            wm.sendNotification('[!:accessLost]', `[!:${code}]`, 3000);
        });
        return false;
    }
            
    if (behaviour == 1) { // Logout but game files should be kept (To be added)
        wm.openWindowPreset('login', () => {
            wm.sendNotification('[!:accessLost]', `[!:${code}]`, 3000);
        });
        return false;
    }

    return false;
}

updateManager.onError = (error) => { wm.sendMessage('update-error', error.message) }

if (!app.requestSingleInstanceLock()) { app.quit(); }

app.on("ready", () => {
    if (process.platform == 'win32') { app.setAppUserModelId("com.thenebulo.forgekitlauncher"); }
    wm.openWindowPreset('update');
});

app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (wm.getMainWindow()) {
        if (wm.getMainWindow().isMinimized()) { wm.getMainWindow().restore(); }
        wm.getMainWindow().focus();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') { app.quit(); }
});

ipcMain.on('set-window-forward', (event, windowToForward) => { windowForward = windowToForward; });