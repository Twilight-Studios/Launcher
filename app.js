// MODULE IMPORTS
// --------------------------------------------------------------------------------------

const { app } = require('electron');

const wm = require("./modules/backend/windowManager");
const gm = require("./modules/backend/gameManager");
const updateManager = require("./modules/backend/updateManager");
const auth = require("./modules/backend/auth");
const utils = require("./modules/utils");

// --------------------------------------------------------------------------------------

// APP CUSTOMISATION
// --------------------------------------------------------------------------------------

const DEFAULT_SERVER_URL = "https://twilightdev.replit.app"; // Only used as an automatic value for the server value for login
wm.devMode = true; // Used to provide access to chromium dev tools (MUST BE SET TO FALSE BEFORE LEAVING DEV ENVIRONMENT)

// --------------------------------------------------------------------------------------

// CALLBACKS
// --------------------------------------------------------------------------------------

updateManager.onError = (error) => { wm.sendMessage('update-error', error.message) }

auth.onLoginSuccess = () => { setTimeout(() => { wm.createLibraryWindow(); }, 1000); }

auth.onLogout = () => {
    wm.createLoginWindow();
    wm.sendMessage("success-logout");
};

auth.onAuthLost = function (code) {
    wm.createLoginWindow();
    wm.sendMessage('auth-lost', utils.getErrorMessage(code));
}

wm.onWindowReloaded = function () {
    auth.authenticateUser(triggerLoginCallback=false).then(({ok, status}) => {
        if (!ok) wm.sendMessage("auth-lost", status);
        else wm.sendMessage("success-reload");
    });
}

wm.onUpdateWindowCreated = function () {
    updateManager.checkForUpdates().then(updateAvailable => { 
        if (updateAvailable) wm.sendMessage('update-found');
        else wm.createLoginWindow(async () => { // Auto-auth occurs here
            if (!auth.isUserValid()) return;
            wm.sendMessage('started-auto-auth');
        
            let {ok, status} = await auth.authenticateUser();        
            if (ok) { wm.sendMessage('success-auto-auth'); }
            else wm.sendMessage('failed-auto-auth', utils.getErrorMessage(status));
        });
    });
}

wm.onLoginWindowCreated = function () {
    auth.loadUser();
    wm.sendMessage('fill-input-fields', auth.getUser(), DEFAULT_SERVER_URL);  
}

wm.onLibraryWindowCreated = async function () {
    let games = await gm.getAllGameData(auth.getUser(), true);
    wm.sendMessage('library-loaded', games, auth.getUser());
}

// --------------------------------------------------------------------------------------

// APP INIT AND EVENTS
// --------------------------------------------------------------------------------------

if (!app.requestSingleInstanceLock()) { app.quit(); }

app.on("ready", () => {
    if (process.platform == 'win32') { app.setAppUserModelId("com.thenebulo.forgekitlauncher"); }
    wm.createUpdateWindow();
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

// --------------------------------------------------------------------------------------