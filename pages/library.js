const { ipcRenderer } = require('electron');
const notification = require("../src/frontend/notification");
const modal = require("../src/frontend/modal");
const localiser = require("../src/frontend/localiser");

window.addEventListener('DOMContentLoaded', () => {
    let libraryLoaded = false;
    let reloadStarted = false;

    const grid = document.querySelector('.grid');
    const reloadButton = document.querySelector("#reload");
    const settingsButton = document.querySelector("#settings");
    const logoutButton = document.querySelector("#logout");
    
    notification.injectUi();
    modal.injectUi();

    function displayMessage(message) {
        let messageObject = document.createElement('div');
        messageObject.classList.add('empty');
        messageObject.textContent = message;
        grid.appendChild(messageObject);
    }
    
    function createGameElement(game) {
        let gameElement = document.createElement("div");
        gameElement.classList.add("game");
    
        let title = `${game.name}`;
        let thumbnailUrl = "data:image/png;base64," + game.cover;
        
        gameElement.innerHTML = `<div class="thumbnail">\
        <div class="open">${localiser.getLocalString('open')}</div>\
        <img src="${thumbnailUrl}" id="thumbnail">\
        </div>\
        <h3>${title}</h3>`;
    
        return grid.appendChild(gameElement);    
    }
    
    ipcRenderer.on('library-loaded', (event, response, { playtesterId, serverUrl }) => {
        libraryLoaded = true;
        grid.innerHTML = '';
        let games = response.payload;

        document.querySelector('.login-info').textContent = localiser.getLocalString('loginInfo', { playtesterId, serverUrl });

        if (!response.success) displayMessage(`${localiser.getLocalString('libraryLoadFailed')} ${localiser.getLocalString(response.status)}.`);
        else if (!games || !(games instanceof Array)) displayMessage(`${localiser.getLocalString('libraryLoadFailed')} ${localiser.getLocalString('invalidSchema')}`);
        else if (games.length === 0) displayMessage(localiser.getLocalString('emptyLibrary'));

        else {
            try {
                games.forEach(game => {
                    let gameElement = createGameElement(game);
                    gameElement.querySelector('.open').addEventListener("click", (event) => { 
                        ipcRenderer.send("set-current-game-id", game.id)
                        ipcRenderer.send('open-window-preset', 'game'); 
                    });
                });
            }
            catch (err) {
                displayMessage(`${localiser.getLocalString('libraryLoadFailed')} ${localiser.getLocalString('unknownError')}`)
            }
        }
    });

    reloadButton.addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!libraryLoaded) {
            notification.activate(localiser.getLocalString('wait'), localiser.getLocalString('libraryLoadNotFinished'), 2000);
            return;
        }

        reloadStarted = true;
        ipcRenderer.send("reload");
    });

    settingsButton.addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!libraryLoaded) notification.activate(localiser.getLocalString('wait'), localiser.getLocalString('libraryLoadNotFinished'), 2000);
        else ipcRenderer.send("open-window-preset", 'settings');
    });

    logoutButton.addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!libraryLoaded) {
            if (!libraryLoaded) notification.activate(localiser.getLocalString('wait'), localiser.getLocalString('libraryLoadNotFinished'), 2000);
            return;
        }
        
        modal.activate(
            localiser.getLocalString("areYouSure"),
            localiser.getLocalString("logoutDesc"),
            localiser.getLocalString("logout"),
            true,
            () => { 
                notification.activate(
                    localiser.getLocalString("loggingOut"), 
                    localiser.getLocalString("clearingSession"), 
                    1500, 
                    false, 
                    () => { ipcRenderer.send("logout"); }
                ) 
            }
        );
    });

});