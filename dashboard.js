const { ipcRenderer, ipcMain } = require('electron');

window.addEventListener('DOMContentLoaded', () => {

    // POPOUT INIT
    // --------------------------------------------------------------------------------------
    var current_callback = null;
    var current_class = null;
    var popout = document.getElementsByClassName('popout')[0];
    var primary_button = document.getElementsByClassName('primary button')[0];
    var cancel_button = document.getElementsByClassName('cancel button')[0];

    function successCallbackBuffer(event) {
        popout.classList.remove('active');
        current_callback();
    }

    primary_button.addEventListener("click", successCallbackBuffer);

    cancel_button.addEventListener("click", (event) => {
        popout.classList.remove('active');
    });

    function activatePopout(title, description, button_text, button_class, success_callback) {
        if (popout.classList.contains("active")) return;
    
        current_callback = success_callback;
    
        primary_button.classList.remove(button_class);
        primary_button.textContent = button_text;
        current_class = button_class;
        primary_button.classList.add(button_class);
    
        popout.children[0].getElementsByTagName("h2")[0].textContent = title;
        popout.children[0].getElementsByTagName("p")[0].textContent = description;
    
        popout.classList.add('active');
    }
    // --------------------------------------------------------------------------------------


    // NOTIFICATION INIT
    // --------------------------------------------------------------------------------------
    function notify(title, description, length, callback) {
        document.querySelector('h1').textContent = title;
        document.querySelector('span').textContent = description;
        document.querySelector('.notification').classList.add('active');
        setTimeout(() => {
            if (callback)
                callback();

            document.querySelector('.notification').classList.remove('active');
        }, length);
    }
    // --------------------------------------------------------------------------------------


    // HEADER EVENTS
    // --------------------------------------------------------------------------------------
    document.getElementById("refresh").addEventListener("click", (event) => {
        ipcRenderer.send('refresh', true);
    });

    document.getElementById("help").addEventListener("click", (event) => {
        window.open("https://github.com/Twilight-Studios"); // FIX TO PREVENT NAVIGATION
    });

    document.getElementById("logout").addEventListener("click", (event) => {
        activatePopout(
            "Are you sure?",
            "By logging out, all your games will be uninstalled for privacy reasons. This is irrreversible!",
            "Logout",
            "remove",
            () => { notify("Logging Out", "Clearing your session...", 1500, () => { ipcRenderer.send("logout"); }) }
        );
    });
    // --------------------------------------------------------------------------------------


    // IPC CALLBACKS
    // --------------------------------------------------------------------------------------
    ipcRenderer.on('success-refresh', (event) => {
        notify("Success", "Refreshed your access and catalog!", 3000, null);
    });
    // --------------------------------------------------------------------------------------


    // GAME LOGIC
    // --------------------------------------------------------------------------------------
    async function getGames() {
        let games = await ipcRenderer.invoke('get-games');
        fillGames(games)
    }

    function fillGames(games) {
        const grid = document.getElementsByClassName("grid")[0];
        
        document.getElementsByClassName("loader")[0].classList.remove("active");
    
        for (const [game_id, game_info] of Object.entries(games)) {
            let game = document.createElement("div");
            game.classList.add("game");
    
            rgba = "255, 0, 0, 0.8"; // LOAD COLOR FROM IMAGE
            thumbnail = "data:image/png;base64, " + game_info.art.cover;
            title = game_info.settings.name;
    
            const gameHtml = `<div class="thumbnail" data-shadow="rgba(${rgba})">\
            <div class="open">Open</div>\
            <img src="${thumbnail}">\
            </div>\
            <h3>${title}</h3>`;
    
            game.innerHTML = gameHtml;
    
            grid.appendChild(game).querySelector('.open').addEventListener("click", (event) => {
                ipcRenderer.send('open-game', game_id, game_info.state)
            });
        }

        document.querySelectorAll('.thumbnail').forEach(thumbnail => {
            thumbnail.addEventListener('mouseover', (event) => {
                const shadowColor = event.currentTarget.dataset.shadow;
                event.currentTarget.style.boxShadow = `0px 0px 30px 5px ${shadowColor}`;
            });
    
            thumbnail.addEventListener('mouseout', (event) => {
                event.currentTarget.style.boxShadow = 'none';
            });
        });
    }

    getGames();
    // --------------------------------------------------------------------------------------


    // OTHER UI EVENTS
    // --------------------------------------------------------------------------------------

    document.querySelector('.grid').addEventListener("scroll", (event) => {
        if (document.querySelector('.grid').scrollTop !== 0)
            document.querySelector('.header').classList.add('color');
        else
            document.querySelector('.header').classList.remove('color');
    });
    // --------------------------------------------------------------------------------------
    
});