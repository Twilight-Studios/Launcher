const { ipcRenderer } = require('electron');
const notification = require("../src/frontend/notification");
const modal = require("../src/frontend/modal");
const localiser = require("../src/frontend/localiser");
const utils = require("../src/utils");

window.addEventListener('DOMContentLoaded', () => {
    let reloadStarted = false;
    let settingsLoaded = false;
    let guestMode = false;

    const content = document.querySelector('.content');
    const libraryButton = document.querySelector('#library');
    const resetButton = document.querySelector('#reset');
    const reloadButton = document.querySelector('#reload');
    const logoutButton = document.querySelector('#logout');

    notification.injectUi();
    modal.injectUi();

    ipcRenderer.on('settings-loaded', (event, settings, userInfo, openInGuestMode) => {
        settingsLoaded = true;
        guestMode = openInGuestMode;
        
        document.querySelector('.login-info').textContent = localiser.getLocalString('loginInfo', userInfo);
        document.querySelector('.loader').classList.remove('active');
        document.querySelector('.content').classList.remove('center');

        if (openInGuestMode) {
            document.querySelector('.login-info').textContent = localiser.getLocalString('notLoggedIn');
            libraryButton.remove();
    
            logoutButton.querySelector('i').className = "fa-solid fa-xmark"
            let newLogoutButton = logoutButton.cloneNode(true);
            newLogoutButton.addEventListener('click', (event) => { ipcRenderer.send('open-window-preset', 'login'); });
            logoutButton.replaceWith(newLogoutButton);
        }

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

            if (!action.icon) action.icon = "fa-solid fa-gear";

            setting.innerHTML = `<div class="text">
                <div class="title"><i class="${action.icon}"></i><span>${title}</span></div>
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
                    if (guestMode) ipcRenderer.send('open-settings-as-guest');
                    ipcRenderer.send(channel, ...params);
                });
            }
        }

        else if (action.type == 'toggle') {
            return () => { modal.activate(
                `${localiser.getLocalString("toggle")} ${localiser.getLocalString(key)}`,
                localiser.getLocalString(`${key}Toggle${value ? "Off" : "On"}`),
                localiser.getLocalString("confirm"),
                value,
                () => {
                    if (guestMode) ipcRenderer.send('open-settings-as-guest'); 
                    ipcRenderer.send('new-settings-value', key, !value); 
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

            return () => { modal.activate(
                `${localiser.getLocalString("change")} ${localiser.getLocalString(key)}`,
                localiser.getLocalString(`${key}ModalDesc`),
                localiser.getLocalString("confirm"),
                false,
                ({ dropdownValue }) => {
                    if (guestMode) ipcRenderer.send('open-settings-as-guest'); 
                    ipcRenderer.send('new-settings-value', key, dropdownValue); 
                },
                { dropdownOptions: dropdownOptions }
            ) }
        }

        else if (action.type == 'input') {        
            return () => { modal.activate(
                `${localiser.getLocalString("change")} ${localiser.getLocalString(key)}`,
                localiser.getLocalString(`${key}ModalDesc`),
                localiser.getLocalString("confirm"),
                false,
                ({ inputValue }) => { 
                    if (guestMode) ipcRenderer.send('open-settings-as-guest');
                    ipcRenderer.send('new-settings-value', key, inputValue); 
                },
                { inputPlaceholder: value }
            ) }
        }
    }

    libraryButton.addEventListener("click", (event) => {
        if (reloadStarted) return;
        if (!settingsLoaded) { 
            notification.activate(localiser.getLocalString('wait'), localiser.getLocalString('settingsLoadNotFinished'), 2000);
            return;
        }

        ipcRenderer.send("open-window-preset", 'library');
    });

    resetButton.addEventListener("click", (event) => {
        if (reloadStarted) return;
        if (!settingsLoaded) { 
            notification.activate(localiser.getLocalString('wait'), localiser.getLocalString('settingsLoadNotFinished'), 2000);
            return;
        }
        
        modal.activate(
            localiser.getLocalString("resetSettings"),
            localiser.getLocalString("resetSettingsDesc"),
            localiser.getLocalString("reset"),
            true,
            () => {
                if (guestMode) ipcRenderer.send('open-settings-as-guest');
                ipcRenderer.send('reset-settings');
            }
        );
    });

    reloadButton.addEventListener("click", (event) => {
        if (reloadStarted) return;
        if (!settingsLoaded) { 
            notification.activate(localiser.getLocalString('wait'), localiser.getLocalString('settingsLoadNotFinished'), 2000);
            return;
        }

        reloadStarted = true;
        if (guestMode) ipcRenderer.send('open-settings-as-guest');
        ipcRenderer.send("reload");
    });

    logoutButton.addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!settingsLoaded) { 
            notification.activate(localiser.getLocalString('wait'), localiser.getLocalString('settingsLoadNotFinished'), 2000);
            return;
        }
        
        modal.activate(
            localiser.getLocalString("areYouSure"),
            localiser.getLocalString("logoutDesc"),
            localiser.getLocalString("logout"),
            true,
            () => { notification.activate( 
                localiser.getLocalString("loggingOut"), 
                localiser.getLocalString("clearingSession"), 
                1500, 
                false, 
                () => { ipcRenderer.send("logout"); }) 
            }
        );
    });
});