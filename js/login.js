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

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const accessKey = document.getElementById('accesskey').value;
        const serverUrl = document.getElementById('serverurl').value;
        
        const response = await ipcRenderer.invoke('login', { accessKey, serverUrl });

        if (response.success) 
            notify("Success", "Logging you in...", 1000, () => { ipcRenderer.send('login-success'); });
        else
            notify("Failed to Login", response.message || "Something went wrong!", 3000, null);
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

    ipcRenderer.on('success-logout', (event) => {
        notify("Success", "Logged out and uninstalled all games!", 3000, null);
    });
    
    ipcRenderer.on('invalid-credentials', (event, errorMessage) => {
        notify("Uh-oh! Your access has been lost!", errorMessage, 3000, null);
    });

    ipcRenderer.on('failed-to-validate', (event, errorMessage) => {
        notify("Failed to Validate Access", errorMessage, 3000, null);
    });
    // --------------------------------------------------------------------------------------
    
});