const { ipcRenderer } = require('electron');
const notification = require("../src/frontend/notification");
const localiser = require("../src/frontend/localiser");

window.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#form');
    const button = document.querySelector('button');
    const openSettings = document.querySelector('#open-settings');
    notification.injectUi(null, false);

    document.getElementById('playtesterid').ariaPlaceholder = localiser.getLocalString("playtesterIdPlaceholder");

    let inLogin = false;

    async function login() {
        if (inLogin) return;
        inLogin = true;

        const playtesterId = document.getElementById('playtesterid').value;
        const serverUrl = document.getElementById('serverurl').value;
        
        notification.activate(localiser.getLocalString("loggingIn"), localiser.getLocalString("attemptingLogin"), 3000);
        button.classList.add("disabled");
        button.textContent = localiser.getLocalString("loggingIn");
        
        const response = await ipcRenderer.invoke('login', { playtesterId, serverUrl });

        if (response.success) {
            notification.activate(localiser.getLocalString("success"), localiser.getLocalString("loading"), 1000, false, () => {
                ipcRenderer.send("open-window-preset", "library");
            });
        }
        else {
            inLogin = false;
            button.classList.remove("disabled");
            button.textContent = localiser.getLocalString("login");
            notification.activate(localiser.getLocalString("loginFailed"), localiser.getLocalString(response.status), 3000);
        }
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        await login();
    });

    openSettings.addEventListener('click', () => {
        ipcRenderer.send('open-settings-as-guest');
        ipcRenderer.send('open-window-preset', 'settings')
    })

    ipcRenderer.on('try-login', async (event) => {
        await login();
    })

    ipcRenderer.on('fill-input-fields', (event, { playtesterId, serverUrl }, defaultServerUrl) => {
        document.getElementById('serverurl').value = defaultServerUrl;

        if (playtesterId) { document.getElementById('playtesterid').value = playtesterId; }
        if (serverUrl) { document.getElementById('serverurl').value = serverUrl; }
    });
});