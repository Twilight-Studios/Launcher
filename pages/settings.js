const { ipcRenderer } = require('electron');
const { notify } = require("./../modules/frontend/notification");
const popout = require("./../modules/frontend/popout");

window.addEventListener('DOMContentLoaded', () => {
    let grid = document.querySelector('.grid');
    grid.innerHTML = '';

    popout.setup(
        document.querySelector('.popout'), 
        document.querySelector('.primary.button'), 
        document.querySelector('.cancel.button')
    );

    let messageObject = document.createElement('div');
    messageObject.classList.add('empty');
    messageObject.textContent = "Settings aren't ready yet!";

    grid.appendChild(messageObject);

    document.querySelector('#library').addEventListener("click", (event) => {
        ipcRenderer.send("open-window-preset", 'library');
    });

    document.querySelector('#logout').addEventListener("click", (event) => {
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