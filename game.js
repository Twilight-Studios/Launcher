const { ipcRenderer } = require('electron');

let id;
let state;
let title;
let platform = "windows";
let hovering = false;
let lastSpeed = 0;
let lastProgress = 0;
let actionState;
let localGameVersion;
let globalGameVersion;

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
    document.getElementById("home").addEventListener("click", (event) => {
        ipcRenderer.send('refresh', false);
    });

    document.getElementById("uninstall").addEventListener("click", (event) => {
        ipcRenderer.send('uninstall-game', id, state, title);
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


    // GAME DATA INIT
    // --------------------------------------------------------------------------------------
    ipcRenderer.on('game-id', async (event, gameId, gameState, gameVersion) => {
        id = gameId;
        state = gameState;
        globalGameVersion = gameVersion;

        let { game, localVersion, installing } = await ipcRenderer.invoke('get-game', gameId, gameState, gameVersion);
        localGameVersion = localVersion;

        fillGame(game, installing);
    })

    function fillGame(game, installing) {
        logo = document.getElementsByTagName("img")[0];
        logo.src = "data:image/png;base64, " + game.art.logo;
        document.getElementsByClassName("window")[0].style.backgroundImage = `url('data:image/png;base64, ${game.art.background}')`;

        const gameStateSettings = game.settings.game_states[game.state]
        globalGameVersion = gameStateSettings.latest_version;
        title = game.settings.name;

        document.getElementsByClassName("news")[0].style.backgroundImage = `url('data:image/png;base64, ${game.art.patch}')`;
        document.getElementsByClassName("tag")[0].textContent = game.notes.titles[globalGameVersion].type;
        document.getElementsByTagName("h3")[0].textContent = game.notes.titles[globalGameVersion].title;

        document.getElementsByClassName("news")[0].addEventListener("click", (event) => {
            notify("Come Back Later", "Patch notes are not ready yet!", 3000, null);
        });

        platforms = ['windows', 'linux', 'macos'];
        platformAliases = ['Windows 10/11', "Linux", "MacOS"];

        for (let i = 0; i < platforms.length; i++) {
            let platform = platforms[i];
            let p_alias = platformAliases[i];

            let icon = document.getElementById(platform);
            let tooltip = document.getElementById(`${platform}-tooltip`);

            if (!gameStateSettings.platforms.includes(platform)) {
                icon.classList.add("disabled");
                tooltip.classList.add("disabled");
                tooltip.textContent = `No ${p_alias} support`
            }
            else {
                tooltip.textContent = `Compatible with ${p_alias}`
            }
        }

        let onlineIcon = document.getElementById("online");
        let onlineTooltip = document.getElementById("online-tooltip");
        if (!gameStateSettings.requires_online) {
            onlineIcon.classList.add("disabled");
            onlineTooltip.classList.add("disabled");
            onlineTooltip.textContent = "Can be played offline";
        }
        else {
            onlineTooltip.textContent = "Requires an internet connection";
        }

        requirements = ['steam', "xbox"]
        requirementAliases = ['Steam', "Xbox Launcher"]

        for (let i = 0; i < requirements.length; i++) {
            let requirement = requirements[i];
            let r_alias = requirementAliases[i];

            let icon = document.getElementById(requirement);
            let tooltip = document.getElementById(`${requirement}-tooltip`);

            if (!gameStateSettings.requirements.includes(requirement)) {
                icon.classList.add("disabled");
                tooltip.classList.add("disabled");
                tooltip.textContent = `${r_alias} is not required`
            }
            else {
                tooltip.textContent = `${r_alias} must be launched`
            }
        }

        let actionButton = document.querySelector('.action-button');

        if (installing === "installing") {
            actionState = "installing";
        }
        else if (localGameVersion === null) {
            actionState = "not_installed";
        }
        else if (localGameVersion !== globalGameVersion) {
            actionState = "req_update";
        }
        else {
            actionState = "installed";
        }

        updateActionButton();

        actionButton.addEventListener('click', (event) => {
           actionButtonClick();
        });

        actionButton.addEventListener('mouseover', (event) => {
            hovering = true;
            if (actionState === "installing") {
                actionButton.querySelector('.status').innerHTML = '<i class="fa-solid fa-x"></i>';
                actionButton.querySelector('.text').innerHTML = "<h2>Stop</h2>";
            }
        });

        actionButton.addEventListener('mouseout', (event) => {
            hovering = false;
            updateActionButton(lastProgress, lastSpeed);
        });

        document.getElementsByClassName("loader-wrapper")[0].classList.remove("active");
    }
    // --------------------------------------------------------------------------------------

    // GAME MANAGEMENT
    // --------------------------------------------------------------------------------------
    function updateActionButton(localInstallProgress = 0, localInstallSpeed = 0) {
        let actionButton = document.querySelector('.action-button');

        if (actionState == "not_installed") {
            lastProgress = 0;
            lastSpeed = 0;
            localGameVersion = null;
            actionButton.querySelector('.status').innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i>';
            actionButton.querySelector('.text').innerHTML = "<h2>Install</h2>";
        }
        else if (actionState == "installing") {
            lastProgress = localInstallProgress;
            lastSpeed = localInstallSpeed;
            localGameVersion = null;
            if (!hovering) {
                actionButton.querySelector('.status').innerHTML = `<span>${localInstallProgress}</span>`;
                actionButton.querySelector('.text').innerHTML = `<h2>Installing</h2><p>${localInstallSpeed} Mb/s</p>`;
            }
        } 
        else if (actionState == "extracting") {
            localGameVersion = null;
            actionButton.querySelector('.status').innerHTML = '<i class="fa-solid fa-file-zipper"></i>';
            actionButton.querySelector('.text').innerHTML = "<h2>Extracting</h2>";
        }
        else if (actionState == "stopping") {
            localGameVersion = null;
            actionButton.querySelector('.status').innerHTML = '<i class="fa-solid fa-hourglass-start"></i>';
            actionButton.querySelector('.text').innerHTML = "<h2>Stop</h2>";
        }
        else if (actionState == "req_update") {
            lastProgress = 0;
            lastSpeed = 0;
            actionButton.querySelector('.status').innerHTML = '<i class="fa-solid fa-arrows-rotate"></i>';
            actionButton.querySelector('.text').innerHTML = "<h2>Update</h2>";
        }
        else {
            lastProgress = 0;
            lastSpeed = 0;
            localGameVersion = globalGameVersion;
            actionButton.querySelector('.status').innerHTML = '<i class="fa-solid fa-play"></i>';
            actionButton.querySelector('.text').innerHTML = "<h2>Play</h2>";
        }
    }

    function actionButtonClick() {
        if (actionState == "not_installed") {
            actionState = "installing";
            hovering = false;
            updateActionButton();
            ipcRenderer.send('start-download', id, state, platform, title, globalGameVersion);
        }
        else if (actionState == "installing") {
            actionState = "stopping";
            updateActionButton();
            ipcRenderer.send('cancel-download');
        }
        else if (actionState == "req_update") {
            actionState = "installing";
            hovering = false;
            updateActionButton();
            ipcRenderer.send('start-download', id, state, platform, title, globalGameVersion);
        }
        else if (actionState == "installed") {
            notify("Come Back Later", "Game launching is not ready yet!", 3000, null);
        }
    }

    ipcRenderer.on('download-progress', (event, gameId, gameState, progress, speed) => {
        if (gameId !== id || gameState !== state) return;
        actionState = "installing";
        updateActionButton(progress, speed)
    });

    ipcRenderer.on('download-success', (event, gameId, gameState, gameTitle) => {
        notify("Game Installed", `${gameTitle} - ${gameState} has finished installing!`, 3000, null, true);
        if (gameId !== id || gameState !== state) return;

        actionState = "installed";
        updateActionButton();
    });

    ipcRenderer.on('download-cancelled', (event, gameId, gameState, gameTitle) => {
        notify("Installation Cancelled", `${gameTitle} - ${gameState} installation has been cancelled.`, 3000, null);
        if (gameId !== id || gameState !== state) return;

        actionState = "not_installed";
        updateActionButton();
    });

    ipcRenderer.on('download-extracting', (event, gameId, gameState) => {
        if (gameId !== id || gameState !== state) return;

        actionState = "extracting";
        updateActionButton();
    });

    ipcRenderer.on('download-error', (event, errorMessage, gameId, gameState, gameTitle) => {
        notify("Installation Failed", `${gameTitle} - ${gameState} faced an error during install: ${errorMessage}`, 3000, null, true);
        if (gameId !== id || gameState !== state) return;

        actionState = "not_installed";
        updateActionButton();
    });

    ipcRenderer.on('game-uninstalled', (event, gameId, gameState, gameTitle) => {
        if (gameId !== id || gameState !== state) return;

        notify("Game Uninstalled", `${gameTitle} - ${gameState} was uninstalled!`, 3000, null);
        actionState = "not_installed";
        updateActionButton();
    });

    ipcRenderer.on('cant-uninstall-download', (event, gameId, gameState, gameTitle) => {
        if (gameId !== id || gameState !== state) return;
        notify("Waiting for Download", `${gameTitle} - ${gameState} cannot be uninstalled while installing a game.`, 3000, null);
    });

    ipcRenderer.on('game-uninstalled', (event, gameId, gameState, gameTitle) => {
        if (gameId !== id || gameState !== state) return;

        notify("Game Uninstalled", `${gameTitle} - ${gameState} was uninstalled!`, 3000, null);
        actionState = "not_installed";
        updateActionButton();
    });
    // --------------------------------------------------------------------------------------
});