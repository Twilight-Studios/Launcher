const { ipcRenderer } = require('electron');
const { notify } = require("../src/frontend/notification");
const popout = require("../src/frontend/popout");
const utils = require("../src/utils");

window.addEventListener('DOMContentLoaded', () => {
    let libraryLoaded = false;
    let reloadStarted = false;

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
        <div class="open">Open</div>\
        <img src="${thumbnailUrl}" id="thumbnail">\
        </div>\
        <h3>${title}</h3>`;
    
        return grid.appendChild(gameElement);    
    }
    
    ipcRenderer.on('library-loaded', (event, response, { accessKey, serverUrl }) => {
        libraryLoaded = true;
        grid.innerHTML = '';
        let games = response.payload;

        document.querySelector('.login-info').textContent = `> Logged in as ${accessKey} on ${serverUrl}`;

        if (!response.success) displayMessage(`Failed to load games library. ${utils.getErrorMessage(response.status)}.`);
        else if (!games || !(games instanceof Array)) displayMessage("Failed to load games library! Server sent an invalid payload.");
        else if (games.length === 0) displayMessage("You don't have any games in your library");
        else {
            games.forEach(game => {
                let gameElement = createGameElement(game);

                gameElement.querySelector('.open').addEventListener("click", (event) => { ipcRenderer.send('open-game', game); });
            });
        }
    });

    ipcRenderer.on('success-reload', (event) => {
        notify(notificationObject, "Success", "Reloaded your library!", 3000, false, null);
    });

    reloadButton.addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!libraryLoaded) notify(notificationObject, "Please Wait", "Your library hasn't loaded yet!", 2000, false, null);
        else {
            reloadStarted = true;
            notify(notificationObject, "Reloading", "Reloading library...", 3000, false, null);
            ipcRenderer.send("reload");
        }
    });

    settingsButton.addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!libraryLoaded) notify(notificationObject, "Please Wait", "Your library hasn't loaded yet!", 2000, false, null);
        else ipcRenderer.send("open-window-preset", 'settings');
    });

    logoutButton.addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!libraryLoaded) {
            notify(notificationObject, "Please Wait", "Your library hasn't loaded yet!", 2000, false, null);
            return;
        }

        let logoutDesc = "By logging out, all your games will be uninstalled for privacy reasons. This is irrreversible!";
        
        popout.activate(
            "Are you sure?",
            logoutDesc,
            "Logout",
            "remove",
            () => { notify(
                notificationObject, 
                "Logging Out", 
                "Clearing your session...", 
                1500, 
                false, 
                () => { ipcRenderer.send("logout"); }) 
            }
        );
    });

});