const { app, ipcMain, globalShortcut } = require('electron');

const wm = require("./src/backend/windowManager");
const gm = require("./src/backend/gameManager");
const sm = require("./src/backend/settingsManager");
const updateManager = require("./src/backend/updateManager");
const auth = require("./src/backend/auth");
const fm = require("./src/fileManager.js");

const DEFAULT_SERVER_URL = "http://127.0.0.1:5000"; // Only used as an automatic value for the server value for login

// Dev/testing tools (MUST BE SET TO FALSE BEFORE LEAVING DEV ENVIRONMENT)
wm.enableChromiumTools = false; // Used to provide access to chromium dev tools
let forceOpenCallbackConsole = false; // Used to force open a developer IPC callback console
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
let openSettingsAsGuest = false;
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
    let gamesData = await gm.getAllGameData(auth.getUser());
    if (!gamesData.success && !onFailedRequest(gamesData.status)) return;
    wm.sendMessage('library-loaded', gamesData, auth.getUser());
});

wm.addWindowPreset('game', 1280, 720, async () => {
    let gameData = await gm.getGameData(auth.getUser(), null);

    if (!gameData.success) {
        if (!onFailedRequest(gameData.status)) return;
        wm.openWindowPreset('library', () => { wm.sendNotification('[!:gameLoadFailed]', `[!:${gameData.status}]`, 3000); });
        return;
    }

    gameData.filesData = gm.loadGameFilesData(gameData.payload);
    wm.sendMessage("game-loaded", gameData);
});

wm.addWindowPreset('settings', 1280, 720, () => {
    wm.sendMessage("settings-loaded", currentSettings, auth.getUser(), openSettingsAsGuest);
    openSettingsAsGuest = false;
});

wm.addPopoutWindowPreset('patchnotes', 1000, 600, false, () => {
    let game = gm.getCurrentGame();

    if (!game || !game.patch_notes || !game.patch_notes_metadata) {
        wm.closePopoutWindow("patchnotes");
        wm.sendNotification("[!:patchNotesLoadFailed]", "[!:-1]", 3000);
        return;
    }

    let patchNotes = {};
    for (let i = 0; i < game.patch_notes.length; i++) {
        let version = Object.keys(game.patch_notes_metadata)[i];
        let { title, type } = Object.values(game.patch_notes_metadata)[i];
        let content = game.patch_notes[i];

        patchNotes[version] = {
            title: title,
            type: type,
            content: content
        };
    }

    if (Object.keys(patchNotes).length == 0) {
        wm.closePopoutWindow("patchnotes");
        wm.sendNotification("[!:patchNotesLoadFailed]", "[!:-1]", 3000);
        return;
    }

    wm.sendPopoutMessage("patchnotes", "patchnotes-loaded", game, patchNotes);
})

wm.addPopoutWindowPreset('console', 600, 900, forceOpenCallbackConsole);

wm.onWindowPresetOpened = function (fileName) {
    fm.makePath("games", true); // Temporary
    currentSettings = sm.getSettings();

    return {
        domCallbacks : { 'localise' : currentSettings.language },

        // This section should be uncommented if users should be manually authenticated on page loads. Currently unused as all server requests handle this logic behind the scenes.
        /* asyncTask : async () => {
            if (fileName == "login" || fileName == "update") return;
            
            let {ok, status} = await auth.authenticateUser();
            if (!ok) return onFailedRequest(status);
            return true;
        } */
    }
}

wm.onPopoutWindowPresetOpened = function (fileName) { 
    currentSettings = sm.getSettings();
    return { domCallbacks : { 'localise' : currentSettings.language } }
};

sm.onSettingsChanged = (key, value) => {
    wm.reloadCurrentWindow();
    wm.reloadAllPopoutWindows(); 
}

auth.onLogout = (silent) => {
    // sm.resetSettings(); This is a maybe, idk if settings should be kept between logout
    gm.clearAllGameDataCaches();
    if (silent) return;

    wm.openWindowPreset('login', () => {
        wm.sendNotification("[!:success]", "[!:successLogoutText]", 3000);
    });
};

function onFailedRequest(code) {
    let behaviour = currentSettings.authFailBehaviour;
    let logoutCodes = [0, 403, 500]

    if (!logoutCodes.includes(code)) return true;

    if (behaviour == 2 || auth.bypassAuth) { // Simply notify that access was failed and continue as usual
        wm.sendNotification('[!:loginFailed]', `[!:${code}]`, 3000);
        return true;
    }
        
    if (behaviour == 0) { // Default behaviour, should logout as usual and the window should not be loaded.
        auth.logout(true);
        wm.openWindowPreset('login', () => {
            wm.sendNotification('[!:accessLost]', `[!:${code}]`, 3000);
        });
        return false;
    }
            
    if (behaviour == 1) { // Logout but game files should be kept (To be added)
        auth.logout(true);
        wm.openWindowPreset('login', () => {
            wm.sendNotification('[!:accessLost]', `[!:${code}]`, 3000);
        });
        return false;
    }

    return false;
}

gm.onGameInstallProgress = (stage, progress) => {
    if (stage == 'download') {
        wm.sendMessage('download-progress', progress);
    }

    if (stage == 'finished') { // Actually get this properly communicated
        wm.sendMessage('install-finished');
    }
}

updateManager.onError = (error) => { wm.sendMessage('update-error', error.message) }

app.on("ready", () => {
    if (!app.requestSingleInstanceLock()) { 
        console.error("Failed to obtain instance lock. Quitting...")
        app.quit();
        return;
    }

    if (process.platform == 'win32') { app.setAppUserModelId("com.thenebulo.forgekitlauncher"); }
    wm.openWindowPreset('update');
    if (forceOpenCallbackConsole) { wm.openPopoutWindowPreset('console'); return; }

    globalShortcut.register('Alt+`', () => {  // Might be a dev tool to enable idk
        if (wm.getMainWindow().isFocused()) { wm.openPopoutWindowPreset('console'); return; }

        Object.values(wm.getAllPopoutWindows()).forEach(popoutWindow => {
            if (popoutWindow.isFocused()) { wm.openPopoutWindowPreset('console'); return; }
        });
    });
});

app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (wm.getMainWindow()) {
        if (wm.getMainWindow().isMinimized()) { wm.getMainWindow().restore(); }
        wm.getMainWindow().focus();
    }
});

app.on('window-all-closed', () => {
    wm.closeMainWindow();
    wm.closeAllPopoutWindows();
    gm.cancelInstall(true);
    if (process.platform !== 'darwin') { app.quit(); }
});

ipcMain.on('open-settings-as-guest', (event) => { openSettingsAsGuest = true; })
ipcMain.on('set-window-forward', (event, windowToForward) => { windowForward = windowToForward; });