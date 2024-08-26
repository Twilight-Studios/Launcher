const { ipcRenderer } = require('electron');
const { notify } = require("./../modules/frontend/notification");
const popout = require("./../modules/frontend/popout");
const utils = require("./../modules/utils");

window.addEventListener('DOMContentLoaded', () => {
    let reloadStarted = false;
    let settingsLoaded = false;
    const content = document.querySelector('.content');

    popout.setup(
        document.querySelector('.popout'), 
        document.querySelector('.primary.button'), 
        document.querySelector('.cancel.button')
    );

    ipcRenderer.on('settings-loaded', (event, settings, { accessKey, serverUrl }) => {
        settingsLoaded = true;
        document.querySelector('.login-info').textContent = `> Logged in as ${accessKey} on ${serverUrl}`;

        for (const [key, value] of Object.entries(settings)) {
            const { title, desc, button, action } = utils.getSettingMetadata(key, value);

            let setting = document.createElement('div');
            setting.classList.add('setting');

            setting.innerHTML = `<div class="text">
                <span>${title}</span>
                <p>${desc}</p>
            </div>
            <div class="settingsbutton">${button}</div>`

            let buttonEl = content.appendChild(setting).querySelector('.settingsbutton');
            let actionCallback = createActionCallback(action, key, value);

            buttonEl.addEventListener('click', (event) => { actionCallback(); })
        }
    });

    function createActionCallback(action, key, value) {
        if (action.type == 'open') {
            if (action.target == 'explorer') return () => { ipcRenderer.send('open-file', action.path); }
            else if (action.target == 'browser') return () => { ipcRenderer.send('open-external-url', action.path); }
        }

        else if (action.type == 'ipc') {
            return () => { ipcRenderer.send(action.channel, action.params); }
        }

        else if (action.type == 'toggle') {
            return () => { popout.activate(
                action.title,
                action.desc,
                "Confirm",
                value ? "remove" : "add",
                () => {
                    ipcRenderer.send('new-settings-value', key, !value);
                    ipcRenderer.send('reload');
                }
            ) }
        }
    }

    document.querySelector('#reload').addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!settingsLoaded) notify(null, "Please Wait", "Your settings haven't loaded yet!", 2000, false, null);
        else {
            reloadStarted = true;
            notify(null, "Reloading", "Reloading settings...", 3000, false, null);
            ipcRenderer.send("reload");
        }
    });

    document.querySelector('#library').addEventListener("click", (event) => {
        if (reloadStarted) return;
        if (!settingsLoaded) notify(null, "Please Wait", "Your settings haven't loaded yet!", 2000, false, null);

        ipcRenderer.send("open-window-preset", 'library');
    });

    document.querySelector('#logout').addEventListener("click", (event) => {
        if (reloadStarted) return;
        if (!settingsLoaded) notify(null, "Please Wait", "Your settings haven't loaded yet!", 2000, false, null);

        let logoutDesc = "By logging out, all your games will be uninstalled for privacy reasons. This is irrreversible!";
        
        popout.activate(
            "Are you sure?",
            logoutDesc,
            "Logout",
            "remove",
            () => { notify(
                null, 
                "Logging Out", 
                "Clearing your session...", 
                1500, 
                false, 
                () => { ipcRenderer.send("logout"); }) 
            }
        );
    });
});