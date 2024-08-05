const { ipcRenderer, ipcMain } = require('electron');

window.addEventListener('DOMContentLoaded', () => {

    // POPOUT INIT
    // --------------------------------------------------------------------------------------
    var current_callback = null;
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
    function notify(title, description, length, callback, notify_os = false) {
        document.querySelector('h1').textContent = title;
        document.querySelector('span').textContent = description;
        document.querySelector('.notification').classList.add('active');

        if (notify_os) {
            ipcRenderer.send("notify", title, description);
        }

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

    ipcRenderer.on('download-success', (event, gameId, gameState, title) => {
        notify("Game Installed!", `${title} - ${gameState} has finished installing!`, 3000, null, true);
    });

    ipcRenderer.on('download-error', (event, errorMessage, gameId, gameState, gameTitle) => {
        notify("Installation Failed", `${gameTitle} - ${gameState} faced an error during download: ${errorMessage}`, 3000, null, true);
    });

    ipcRenderer.on('extract-error', (event, errorMessage, gameId, gameState, gameTitle) => {
        notify("Installation Failed", `${gameTitle} - ${gameState} faced an error during extraction: ${errorMessage}`, 3000, null, true);
    });
    // --------------------------------------------------------------------------------------


    // UI UTILS
    // --------------------------------------------------------------------------------------
    function getAverageRGB(imgEl) {
        // SOURCE: https://stackoverflow.com/questions/2541481/get-average-color-of-image-via-javascript
        var blockSize = 5,
            defaultRGB = {r:255,g:255,b:255},
            canvas = document.createElement('canvas'),
            context = canvas.getContext('2d'),
            data, width, height,
            i = -4,
            length,
            rgb = {r:0,g:0,b:0},
            count = 0;

        if (!context) {
            return defaultRGB;
        }

        height = canvas.height = imgEl.naturalHeight || imgEl.offsetHeight || imgEl.height;
        width = canvas.width = imgEl.naturalWidth || imgEl.offsetWidth || imgEl.width;

        context.drawImage(imgEl, 0, 0);

        try {
            data = context.getImageData(0, 0, width, height);
        } catch(e) {
            console.error("Error accessing the pixel data: ", e);
            return defaultRGB;
        }

        length = data.data.length;

        while ( (i += blockSize * 4) < length ) {
            ++count;
            rgb.r += data.data[i];
            rgb.g += data.data[i+1];
            rgb.b += data.data[i+2];
        }

        rgb.r = ~~(rgb.r/count);
        rgb.g = ~~(rgb.g/count);
        rgb.b = ~~(rgb.b/count);

        return rgb;
    }
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
    
        games.forEach((game_info) => {
            let game = document.createElement("div");
            game.classList.add("game");
    
            var thumbnail = "data:image/png;base64," + game_info.art.cover;
            
            (function(gameElement, thumbnailSrc, gameInfo) {
                var thumbanailColorLoadElement = document.createElement("img");
                thumbanailColorLoadElement.style.display = 'none';
                var rgba = null;
    
                thumbanailColorLoadElement.onload = function() {
                    var averageRGB = getAverageRGB(thumbanailColorLoadElement);
                    rgba = `rgba(${averageRGB.r}, ${averageRGB.g}, ${averageRGB.b}, 0.8)`;
    
                    thumbanailColorLoadElement.remove();
    
                    var title = `${gameInfo.settings.name} - ${gameInfo.state} [${gameInfo.settings.game_states[gameInfo.state].latest_version}]`;
    
                    const gameHtml = `<div class="thumbnail">\
                    <div class="open">Open</div>\
                    <img src="${thumbnailSrc}">\
                    </div>\
                    <h3>${title}</h3>`;
    
                    gameElement.innerHTML = gameHtml;
    
                    var game_obj = grid.appendChild(gameElement);
                    console.log(game_obj);
    
                    game_obj.querySelector('.open').addEventListener("click", (event) => {
                        ipcRenderer.send('open-game', gameInfo.id, gameInfo.state, gameInfo.settings.game_states[gameInfo.state].latest_version);
                    });
    
                    game_obj.querySelector('.thumbnail').addEventListener('mouseover', (event) => {
                        event.currentTarget.style.boxShadow = `0px 0px 30px 5px ${rgba}`;
                    });
    
                    game_obj.querySelector('.thumbnail').addEventListener('mouseout', (event) => {
                        event.currentTarget.style.boxShadow = 'none';
                    });
                };
    
                thumbanailColorLoadElement.src = thumbnailSrc;
                document.body.append(thumbanailColorLoadElement);
            })(game, thumbnail, game_info);
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