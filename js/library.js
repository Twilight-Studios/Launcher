const { ipcRenderer } = require('electron');
const { notify } = require("../modules/frontend/notification");
const popout = require("../modules/frontend/popout");

window.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('.grid');
    const logoutButton = document.querySelector("#logout")
    const notificationObject = document.querySelector('.notification');

    popout.setup(
        document.querySelector('.popout'), 
        document.querySelector('.primary.button'), 
        document.querySelector('.cancel.button')
    );

    function displayEmptyMessage(message) {
        grid.innerHTML = '';
        let messageObject = document.createElement('div');
        messageObject.classList.add('empty');
        messageObject.textContent = message;
        grid.appendChild(messageObject);
    }
    
    function createThumbnail(thumbnailObject) {
        return;
    }
    
    function createGameUi(game) {
        let gameElement = document.createElement("div");
        gameElement.classList.add("game");
    
        let title = `${game.name} - ${gameInfo.branch} [${game.latest_version}]`;
        let thumbnailUrl = "data:image/png;base64," + gameInfo.art.cover;
        
        gameElement.innerHTML = `<div class="thumbnail">\
        <div class="open">Open</div>\
        <img src="${thumbnailUrl}" id="thumbnail">\
        </div>\
        <h3>${title}</h3>`;
    
        let gameObj = grid.appendChild(gameElement);    
        createThumbnail(gameObj.querySelector('#thumbnail'));
    
        gameObj.querySelector('.open').addEventListener("click", (event) => {
            ipcRenderer.send('open-game', game);
        });
    
        gameObj.querySelector('.thumbnail').addEventListener('mouseover', (event) => {
            event.currentTarget.style.boxShadow = `0px 0px 30px 5px ${rgba}`;
        });
    
        gameObj.querySelector('.thumbnail').addEventListener('mouseout', (event) => {
            event.currentTarget.style.boxShadow = 'none';
        });
    }
    
    ipcRenderer.on('library-loaded', (event, games, { accessKey, serverUrl }) => {
        document.querySelector('.login-info').textContent = `> Logged in as ${accessKey} on ${serverUrl}`;

        if (!games || !(games instanceof Array)) {
            displayEmptyMessage("Failed to load games library! Please reload the page");
            return;
        }
    
        if (games.length === 0) {
            displayEmptyMessage("You don't have any games in your library");
            return;
        }
    
        games.forEach(game => { createGameUi(game) });
    });

    logoutButton.addEventListener("click", (event) => {
        popout.activate(
            "Are you sure?",
            "By logging out, all your games will be uninstalled for privacy reasons. This is irrreversible!",
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