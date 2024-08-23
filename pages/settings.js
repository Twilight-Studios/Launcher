const { ipcRenderer } = require('electron');
const { notify } = require("./../modules/frontend/notification");
const popout = require("./../modules/frontend/popout");

window.addEventListener('DOMContentLoaded', () => {
    let reloadStarted = false;
    let settingsLoaded = true;

    popout.setup(
        document.querySelector('.popout'), 
        document.querySelector('.primary.button'), 
        document.querySelector('.cancel.button')
    );

    document.querySelector('#reload').addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!settingsLoaded) notify(null, "Please Wait", "Your settings haven't loaded yet!", 2000, false, null);
        else {
            reloadStarted = true;
            notify(null, "Reloading", "Started reloading settings...", 3000, false, null);
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