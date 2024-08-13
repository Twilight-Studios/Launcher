// TODO: Clean up
const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    
    // NOTIFICATION INIT
    // --------------------------------------------------------------------------------------
    let activateNotifications = 0;

    function notify(title, description, length, callback, notifyOs = false) {
        document.querySelector('h1').textContent = title;
        document.querySelector('span').textContent = description;
        document.querySelector('.notification').classList.add('active');
        activateNotifications++;

        if (notifyOs) {
            ipcRenderer.send("notify", title, description);
        }

        setTimeout(() => {
            if (callback) callback();
            activateNotifications--;

            if (activateNotifications == 0) {
                document.querySelector('.notification').classList.remove('active');
            }
        }, length);
    }
    // --------------------------------------------------------------------------------------


    // FORM EVENTS
    // --------------------------------------------------------------------------------------
    const form = document.getElementById('form');
    const button = document.querySelector('button');
    let inLogin = false;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (inLogin) return;
        inLogin = true;

        const accessKey = document.getElementById('accesskey').value;
        const serverUrl = document.getElementById('serverurl').value;
        
        notify("Logging in", "Trying to log you in...", 3000, null);
        button.classList.add("disabled");
        button.textContent = "Logging in...";
        
        const response = await ipcRenderer.invoke('login', { accessKey, serverUrl });

        if (response.success) { notify("Success", "Loading home page...", 1000, () => { ipcRenderer.send('login-success'); }) }
        else {
            inLogin = false;
            button.classList.remove("disabled");
            button.textContent = "Login";
            notify("Failed to Login", response.message || "Something went wrong!", 3000, null);
        }
            
    });
    // --------------------------------------------------------------------------------------


    // IPC CALLBACKS
    // --------------------------------------------------------------------------------------
    ipcRenderer.on('fill-server-url', (event, serverUrl) => {
        document.getElementById('serverurl').value = serverUrl;
    })

    ipcRenderer.on('fill-credentials', (event, credentials) => {
        document.getElementById('accesskey').value = credentials.accessKey;
        document.getElementById('serverurl').value = credentials.serverUrl;
    });

    ipcRenderer.on('started-auto-validation', (event) => {
        inLogin = true;
        button.classList.add("disabled");
        button.textContent = "Logging in...";
        notify("Logging in", "Attempting to log you in...", 3000, null);
    });

    ipcRenderer.on('success-logout', (event) => {
        notify("Success", "Logged out and uninstalled all games!", 3000, null);
    });
    
    ipcRenderer.on('invalid-credentials', (event, errorMessage) => {
        notify("Your access has been lost!", errorMessage, 3000, null);
    });

    ipcRenderer.on('success-auto-validate', (event) => {
        notify("Success", "Loading home page...", 1000, () => { ipcRenderer.send('login-success'); });
    });

    ipcRenderer.on('failed-to-validate', (event, errorMessage) => {
        inLogin = false;
        button.classList.remove("disabled");
        button.textContent = "Login";
        notify("Failed to Validate Access", errorMessage, 3000, null);
    });
    // --------------------------------------------------------------------------------------
    
});