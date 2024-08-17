// MODULE IMPORTS
// --------------------------------------------------------------------------------------

const { app, ipcMain, Notification } = require('electron');
const path = require('path');
const windowManager = require("./modules/windowManager");

// --------------------------------------------------------------------------------------

// APP CUSTOMISATION
// --------------------------------------------------------------------------------------

const DEFAULT_SERVER_URL = "https://twilightdev.replit.app"; // Only used as an automatic value for the server value for login
const DEV_MODE_ENABLED = false; // Used to provide access to chromium dev tools (MUST BE SET TO FALSE BEFORE LEAVING DEV ENVIRONMENT)

// --------------------------------------------------------------------------------------

// APP INIT AND EVENTS
// --------------------------------------------------------------------------------------

if (!app.requestSingleInstanceLock()) { app.quit(); }

windowManager.setDevMode(DEV_MODE_ENABLED);
windowManager.setDefaultServerUrl(DEFAULT_SERVER_URL);

app.on("ready", () => {
    if (process.platform == 'win32') { app.setAppUserModelId("com.twilightstudios.twilightstudioslauncher"); }
    windowManager.createUpdateWindow();
});

app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (windowManager.getMainWindow()) {
        if (windowManager.getMainWindow().isMinimized()) { windowManager.getMainWindow().restore(); }
        windowManager.getMainWindow().focus();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') { app.quit(); }
});

// --------------------------------------------------------------------------------------

// IPC CALLBACKS
// --------------------------------------------------------------------------------------

ipcMain.on('notify', (event, title, description) => {
    let notification = new Notification({ title: title, body: description, icon: path.join(__dirname, 'resources/logo.ico') });
    notification.show();
    notification.on('click', (event, arg) => { windowManager.showMainWindow(); });
});

// --------------------------------------------------------------------------------------