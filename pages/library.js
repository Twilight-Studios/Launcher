const { ipcRenderer } = require('electron');
const { notify } = require("../src/frontend/notification");
const popout = require("../src/frontend/popout");
const localiser = require("../src/frontend/localiser");

window.addEventListener('DOMContentLoaded', () => {
    let libraryLoaded = false;
    let reloadStarted = false;
    
    localiser.onLanguageChanged = () => { localiser.localiseHtml(); };

    const grid = document.querySelector('.grid');
    const reloadButton = document.querySelector("#reload");
    const settingsButton = document.querySelector("#settings");
    const logoutButton = document.querySelector("#logout");
    const notificationObject = document.querySelector('.notification');

    popout.setup(
        document.querySelector('.popout'), 
        document.querySelector('.primary.button'), 
        document.querySelector('.cancel.button')
    );

    function displayMessage(message) {
        let messageObject = document.createElement('div');
        messageObject.classList.add('empty');
        messageObject.textContent = message;
        grid.appendChild(messageObject);
    }
    
    function createGameElement(game) {
        let gameElement = document.createElement("div");
        gameElement.classList.add("game");
    
        let title = `${game.settings.name} - ${game.branch}`;
        let thumbnailUrl = "data:image/png;base64," + game.art.cover;
        
        gameElement.innerHTML = `<div class="thumbnail">\
        <div class="open">${localiser.getLocalString('open')}</div>\
        <img src="${thumbnailUrl}" id="thumbnail">\
        </div>\
        <h3>${title}</h3>`;
    
        return grid.appendChild(gameElement);    
    }
    
    ipcRenderer.on('library-loaded', (event, response, { accessKey, serverUrl }) => {
        libraryLoaded = true;
        grid.innerHTML = '';
        let games = response.payload;

        document.querySelector('.login-info').textContent = localiser.getLocalString('loginInfo', { accessKey, serverUrl });

        if (!response.success) displayMessage(`${localiser.getLocalString('libraryLoadFailed')} ${localiser.getLocalString(response.status)}.`);
        else if (!games || !(games instanceof Array)) displayMessage(`${localiser.getLocalString('libraryLoadFailed')} ${localiser.getLocalString('invalidSchema')}`);
        else if (games.length === 0) displayMessage(localiser.getLocalString('emptyLibrary'));

        else {
            games.forEach(game => {
                let gameElement = createGameElement(game);
                gameElement.querySelector('.open').addEventListener("click", (event) => { ipcRenderer.send('open-game', game); });
            });
        }
    });

    reloadButton.addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!libraryLoaded) notify(notificationObject, localiser.getLocalString('wait'), localiser.getLocalString('libraryLoadNotFinished'), 2000, false, null);
        else {
            reloadStarted = true;
            notify(notificationObject, localiser.getLocalString('reloading'), localiser.getLocalString("libraryReloading"), 500, false, () => {
                ipcRenderer.send("reload");
            });
        }
    });

    settingsButton.addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!libraryLoaded) notify(notificationObject, localiser.getLocalString('wait'), localiser.getLocalString('libraryLoadNotFinished'), 2000, false, null);
        else ipcRenderer.send("open-window-preset", 'settings');
    });

    logoutButton.addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!libraryLoaded) {
            if (!libraryLoaded) notify(notificationObject, localiser.getLocalString('wait'), localiser.getLocalString('libraryLoadNotFinished'), 2000, false, null);
            return;
        }

        let logoutDesc = "By logging out, all your games will be uninstalled for privacy reasons. This is irrreversible!";
        
        popout.activate(
            localiser.getLocalString("areYouSure"),
            logoutDesc,
            localiser.getLocalString("logout"),
            "remove",
            () => { notify(
                notificationObject, 
                localiser.getLocalString("loggingOut"), 
                localiser.getLocalString("clearingSession"), 
                1500, 
                false, 
                () => { ipcRenderer.send("logout"); }) 
            }
        );
    });

});