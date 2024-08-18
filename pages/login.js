const { ipcRenderer } = require('electron');
const { notify } = require("./../modules/frontend/notification");

window.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#form');
    const button = document.querySelector('button');
    const notificationObject = document.querySelector('.notification');

    let inLogin = false;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (inLogin) return;
        inLogin = true;

        const accessKey = document.getElementById('accesskey').value;
        const serverUrl = document.getElementById('serverurl').value;
        
        notify(notificationObject, "Logging in", "Trying to log you in...", 3000, false, null);
        button.classList.add("disabled");
        button.textContent = "Logging in...";
        
        const response = await ipcRenderer.invoke('login', { accessKey, serverUrl });

        if (response.success) notify(notificationObject, "Success", "Loading library...", 1000, false, null)
        else {
            inLogin = false;
            button.classList.remove("disabled");
            button.textContent = "Login";
            notify(notificationObject, "Failed to Login", response.message || "Something went wrong!", 3000, false, null);
        }
            
    });

    ipcRenderer.on('fill-input-fields', (event, { accessKey, serverUrl }, defaultServerUrl) => {
        document.getElementById('serverurl').value = defaultServerUrl;

        if (accessKey) { document.getElementById('accesskey').value = accessKey; }
        if (serverUrl) { document.getElementById('serverurl').value = serverUrl; }
    });

    ipcRenderer.on('started-auto-auth', (event) => {
        inLogin = true;
        button.classList.add("disabled");
        button.textContent = "Logging in...";
        notify(notificationObject, "Logging in", "Attempting to log you in...", 3000, false, null);
    });

    ipcRenderer.on('success-auto-auth', (event) => {
        notify(notificationObject, "Success", "Loading library...", 1000, false, () => { ipcRenderer.send('login-success'); });
    });

    ipcRenderer.on('failed-auto-auth', (event, errorMessage) => {
        inLogin = false;
        button.classList.remove("disabled");
        button.textContent = "Login";
        notify(notificationObject, "Failed to Validate Access", errorMessage, 3000, false, null);
    });
});