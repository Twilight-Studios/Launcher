const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    
    // NOTIFICATION INIT
    // --------------------------------------------------------------------------------------
    function notify(title, description, length, callback) {
        document.querySelector('h1').textContent = title;
        document.querySelector('span').textContent = description;
        document.querySelector('.notification').classList.add('active');
        setTimeout(() => {
            if (callback)
                callback();

            document.querySelector('.notification').classList.remove('active');
        }, length);
    }
    // --------------------------------------------------------------------------------------


    // FORM EVENTS
    // --------------------------------------------------------------------------------------
    const form = document.getElementById('form');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const accessKey = document.getElementById('accesskey').value;
        
        const response = await ipcRenderer.invoke('login', { accessKey });

        if (response.success) 
            notify("Success", "Logging you in...", 1000, () => { ipcRenderer.send('login-success'); });
        else
            notify("Failed", response.message || "Something went wrong!", 3000, null);
    });

    document.querySelector('a').addEventListener('click', (event) => {
        ipcRenderer.send("open-server");
        event.preventDefault();
    });
    // --------------------------------------------------------------------------------------


    // IPC CALLBACKS
    // --------------------------------------------------------------------------------------
    ipcRenderer.on('fill-credentials', (event, accessKey) => {
        document.getElementById('accesskey').value = accessKey;
    });

    ipcRenderer.on('success-logout', (event) => {
        notify("Success", "Logged out and uninstalled all games!", 3000, null);
    });
    
    ipcRenderer.on('lost-access', (event) => {
        notify("Uh-oh!", "Your access has been revoked!", 3000, null);
    });

    ipcRenderer.on('failed-to-validate', (event) => {
        notify("Failed", "Access key cannot be authenticated!", 3000, null);
    });
    // --------------------------------------------------------------------------------------
    
});