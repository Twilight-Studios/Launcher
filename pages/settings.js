const { ipcRenderer } = require('electron');
const notification = require("../src/frontend/notification");
const popout = require("../src/frontend/popout");
const localiser = require("../src/frontend/localiser");
const utils = require("../src/utils");

window.addEventListener('DOMContentLoaded', () => {
    let reloadStarted = false;
    let settingsLoaded = false;
    const content = document.querySelector('.content');

    notification.injectUi();

    popout.setup(
        document.querySelector('.popout'), 
        document.querySelector('.primary.button'), 
        document.querySelector('.cancel.button')
    );

    ipcRenderer.on('settings-loaded', (event, settings, { playtesterId, serverUrl }) => {
        settingsLoaded = true;
        document.querySelector('.login-info').textContent = localiser.getLocalString('loginInfo', { playtesterId, serverUrl });
        document.querySelector('.loader').classList.remove('active');
        document.querySelector('.content').classList.remove('center');

        for (const [key, value] of Object.entries(settings)) {
            const action = utils.getSettingAction(key, value);

            let setting = document.createElement('div');
            setting.classList.add('setting');

            let title;
            let desc;
            let button;

            if (action.type == 'unknown') {
                title = localiser.getLocalString("unknown", { setting: key });
                desc = localiser.getLocalString("unknownDesc");
                button = localiser.getLocalString("currentValue", { value: value })
            }
            else {
                title = localiser.getLocalString(key);
                if (action.valueInDesc) desc = localiser.getLocalString(`${key}Desc`, { value: value });
                else desc = localiser.getLocalString(`${key}Desc`);
            }

            if (action.type == 'open' || action.type == 'ipc') button = localiser.getLocalString(action.button);
            if (action.type == 'toggle') button = localiser.getLocalString('toggle');
            if (action.type == 'input' || action.type == 'dropdown') button = localiser.getLocalString('change');

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
            return () => {
                action.callbacks.forEach(([channel, params]) => {
                    ipcRenderer.send(channel, ...params);
                });
            }
        }

        else if (action.type == 'toggle') {
            return () => { popout.activate(
                `${localiser.getLocalString("toggle")} ${localiser.getLocalString(key)}`,
                localiser.getLocalString(`${key}Toggle${value ? "Off" : "On"}`),
                localiser.getLocalString("confirm"),
                value ? "remove" : "add",
                () => {
                    ipcRenderer.send('new-settings-value', key, !value);
                    ipcRenderer.send('reload');
                }
            ) }
        }

        else if (action.type == 'dropdown') {
            let dropdownOptions = [];

            action.options.forEach(option => {
                dropdownOptions.push({
                    alias: localiser.getLocalString(`${key}_${option}`),
                    value: option,
                    selected: option == value 
                });
            });

            return () => { popout.activate(
                `${localiser.getLocalString("change")} ${localiser.getLocalString(key)}`,
                localiser.getLocalString(`${key}PopoutDesc`),
                localiser.getLocalString("confirm"),
                "add",
                (dropwdownValue) => {
                    ipcRenderer.send('new-settings-value', key, dropwdownValue);
                    ipcRenderer.send('reload');
                },
                dropdownOptions
            ) }
        }

        else if (action.type == 'input') {        
            return () => { popout.activate(
                `${localiser.getLocalString("change")} ${localiser.getLocalString(key)}`,
                localiser.getLocalString(`${key}PopoutDesc`),
                localiser.getLocalString("confirm"),
                "add",
                (inputValue) => {
                    ipcRenderer.send('new-settings-value', key, inputValue);
                    ipcRenderer.send('reload');
                },
                null,
                value
            ) }
        }
    }

    document.querySelector('#library').addEventListener("click", (event) => {
        if (reloadStarted) return;
        if (!settingsLoaded) { 
            notification.notify(localiser.getLocalString('wait'), localiser.getLocalString('settingsLoadNotFinished'), 2000);
            return;
        }

        ipcRenderer.send("open-window-preset", 'library');
    });

    document.querySelector('#reset').addEventListener("click", (event) => {
        if (reloadStarted) return;
        if (!settingsLoaded) { 
            notification.notify(localiser.getLocalString('wait'), localiser.getLocalString('settingsLoadNotFinished'), 2000);
            return;
        }
        
        popout.activate(
            localiser.getLocalString("resetSettings"),
            localiser.getLocalString("resetSettingsDesc"),
            localiser.getLocalString("reset"),
            "remove",
            () => {
                ipcRenderer.send('reset-settings');
                ipcRenderer.send('reload');
            }
        );
    });

    document.querySelector('#reload').addEventListener("click", (event) => {
        if (reloadStarted) return;
        if (!settingsLoaded) { 
            notification.notify(localiser.getLocalString('wait'), localiser.getLocalString('settingsLoadNotFinished'), 2000);
            return;
        }

        reloadStarted = true;
        ipcRenderer.send("reload");
    });

    document.querySelector('#logout').addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!settingsLoaded) { 
            notification.notify(localiser.getLocalString('wait'), localiser.getLocalString('settingsLoadNotFinished'), 2000);
            return;
        }
        
        popout.activate(
            localiser.getLocalString("areYouSure"),
            localiser.getLocalString("logoutDesc"),
            localiser.getLocalString("logout"),
            "remove",
            () => { notification.notify( 
                localiser.getLocalString("loggingOut"), 
                localiser.getLocalString("clearingSession"), 
                1500, 
                false, 
                () => { ipcRenderer.send("logout"); }) 
            }
        );
    });
});