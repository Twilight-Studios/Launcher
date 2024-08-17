// MODULE IMPORTS
// --------------------------------------------------------------------------------------

const { app } = require('electron');

const wm = require("./modules/backend/windowManager");
const updateManager = require("./modules/backend/updateManager");
const auth = require("./modules/backend/auth");
const utils = require("./modules/utils");

// --------------------------------------------------------------------------------------

// APP CUSTOMISATION
// --------------------------------------------------------------------------------------

const DEFAULT_SERVER_URL = "https://twilightdev.replit.app"; // Only used as an automatic value for the server value for login
wm.devMode = false; // Used to provide access to chromium dev tools (MUST BE SET TO FALSE BEFORE LEAVING DEV ENVIRONMENT)

// --------------------------------------------------------------------------------------

// WINDOW START UP PROCESSES
// --------------------------------------------------------------------------------------

auth.onLoginSuccess = () => { setTimeout(() => { wm.createLibraryWindow(); }, 1000); }

auth.onAuthLost = function (code) {
    wm.createLoginWindow();
    wm.sendMessage('auth-lost', utils.getErrorMessage(code));
}

wm.onUpdateWindowCreated = function () {
    updateManager.checkForUpdates().then(updateAvailable => { 
        if (updateAvailable) wm.sendMessage('update-found');
        else wm.createLoginWindow(() => { autoAuthProcess() });
    });
}

async function autoAuthProcess() {
    if (!auth.isUserValid()) return;
    wm.sendMessage('started-auto-auth');

    let {ok, status} = await auth.authenticateUser();

    if (ok) { wm.sendMessage('success-auto-auth'); }
    else wm.sendMessage('failed-auto-auth', utils.getErrorMessage(status));
}

wm.onLoginWindowCreated = function () {
    auth.loadUser();
    wm.sendMessage('fill-input-fields', auth.getUser(), DEFAULT_SERVER_URL);  
}

wm.onLibraryWindowCreated = function () {
    wm.sendMessage('library-loaded', null, auth.getUser());
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