const { app } = require('electron');

const wm = require("./modules/backend/windowManager");
const gm = require("./modules/backend/gameManager");
const sm = require("./modules/backend/settingsManager");
const updateManager = require("./modules/backend/updateManager");
const auth = require("./modules/backend/auth");
const utils = require("./modules/utils");

const DEFAULT_SERVER_URL = "https://twilightdev.replit.app"; // Only used as an automatic value for the server value for login

// Dev/testing tools (MUST BE SET TO FALSE BEFORE LEAVING DEV ENVIRONMENT)
wm.enableDevTools = false; // Used to provide access to chromium dev tools 
auth.bypassAuth = false; // Used to skip auth to access UI offline

let currentSettings = {};

wm.addWindowPreset('update', 400, 600, () => {
    updateManager.checkForUpdates().then(updateAvailable => { 
        if (updateAvailable) wm.sendMessage('update-found');

        else wm.openWindowPreset('login', async () => { // Auto-auth occurs here

            if (!auth.isUserValid()) return;
            wm.sendMessage('try-login');

        });
    });
});

wm.addWindowPreset('login', 400, 600, () => {
    auth.loadUser();
    wm.sendMessage('fill-input-fields', auth.getUser(), DEFAULT_SERVER_URL);  
})

wm.addWindowPreset('library', 1280, 720, async () => {
    let gamesData = await gm.getAllGameData(auth.getUser(), true);
    wm.sendMessage('library-loaded', gamesData, auth.getUser());
});

wm.addWindowPreset('settings', 1280, 720, () => {
    wm.sendMessage("settings-loaded", currentSettings, auth.getUser());
});

wm.onWindowPresetOpened = async function (fileName) {
    currentSettings = sm.getSettings();
    
    if (fileName == "login" || fileName == "update") return;

    let {ok, status} = await auth.authenticateUser();

    if (!ok) {
        
        // AUTH FAIL BEHAVIOURS ARE HANDLED HERE
        let behaviour = currentSettings.authFailBehaviour;
        
        if (behaviour == 0) { // Default behaviour, should logout as usual and the window should not be loaded.
            auth.onAuthLost(status);
            return false; 
        }
        
        if (behaviour == 1) { // Logout but game files should be kept (To be added)
            auth.onAuthLost(status);
            return false; 
        }

        if (behaviour == 2) { // Simply notify that access was failed and continue as usual
            wm.sendNotification('Failed to Authenticate', utils.getErrorMessage(status), 3000);
            return true;
        }
    }
    
    return true;
}

auth.onLoginSuccess = () => { setTimeout(() => { wm.openWindowPreset('library'); }, 1000); }

auth.onLogout = () => {
    wm.openWindowPreset('login', () => {
        wm.sendNotification("Success", "Logged out and uninstalled all games!", 3000);
    });
};

auth.onAuthLost = function (code) {
    wm.openWindowPreset('login', () => {
        wm.sendNotification("Your access has been lost!", utils.getErrorMessage(code), 3000);
    });
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