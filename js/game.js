// TODO: Refactor
const { ipcRenderer } = require('electron');

let id;
let branch;
let title;
let platform = "windows";
let hovering = false;
let lastSpeed = 0;
let lastProgress = 0;
let actionState;
let localGameVersion;
let globalGameVersion;
let globalGame;

window.addEventListener('DOMContentLoaded', () => {

    // POPOUT INIT
    // --------------------------------------------------------------------------------------
    var currentCallback = null;
    var popout = document.getElementsByClassName('popout')[0];
    var primaryButton = document.getElementsByClassName('primary button')[0];
    var cancelButton = document.getElementsByClassName('cancel button')[0];

    function successCallbackBuffer(event) {
        popout.classList.remove('active');
        currentCallback();
    }

    primaryButton.addEventListener("click", successCallbackBuffer);

    cancelButton.addEventListener("click", (event) => {
        popout.classList.remove('active');
    });

    function activatePopout(title, description, buttonText, buttonClass, successCallback) {
        if (popout.classList.contains("active")) return;
    
        currentCallback = successCallback;
    
        primaryButton.classList.remove(buttonClass);
        primaryButton.textContent = buttonText;
        currentClass = buttonClass;
        primaryButton.classList.add(buttonClass);
    
        popout.children[0].getElementsByTagName("h2")[0].textContent = title;
        popout.children[0].getElementsByTagName("p")[0].textContent = description;
    
        popout.classList.add('active');
    }
    // --------------------------------------------------------------------------------------


    // NOTIFICATION INIT
    // --------------------------------------------------------------------------------------
    let activateNotifications = 0;

    function notify(title, description, length, callback, notifyOs = false) {
        document.querySelector('h1').textContent = title;
        document.querySelector('.noti-desc').textContent = description;
        document.querySelector('.notification').classList.add('active');
        activateNotifications++;

        if (notifyOs) {
            ipcRenderer.send("notify", title, description);
        }

        setTimeout(() => {
            if (callback) callback();
            activateNotifications--;

            if (activateNotifications == 0) {
                document.querySelector('.notification').classList.remove('active');
            }
        }, length);
    }
    // --------------------------------------------------------------------------------------


    // HEADER EVENTS
    // --------------------------------------------------------------------------------------
    document.getElementById("home").addEventListener("click", (event) => {
        ipcRenderer.send('refresh', false);
    });

    document.getElementById("refresh").addEventListener("click", (event) => {
        ipcRenderer.send('refresh', false, { gameId : id, gameBranch: branch, gameVersion: globalGameVersion });
    });

    document.getElementById("uninstall").addEventListener("click", (event) => {
        ipcRenderer.send('uninstall-game', id, branch, title);
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
    ipcRenderer.on('game-id', async (event, gameId, gameBranch, gameVersion) => {
        id = gameId;
        branch = gameBranch;
        globalGameVersion = gameVersion;

        let { game, localVersion, installing } = await ipcRenderer.invoke('get-game', gameId, gameBranch);

        if (!game) {
            ipcRenderer.send('cant-access-game', gameId, gameBranch, installing);
            return;
        }

        globalGame = game;
        localGameVersion = localVersion;

        fillGame(game, installing);
    });

    function fillGame(game, installing) {
        logo = document.getElementsByTagName("img")[0];
        logo.src = "data:image/png;base64, " + game.art.logo;
        document.getElementsByClassName("window")[0].style.backgroundImage = `url('data:image/png;base64, ${game.art.background}')`;

        const gameBranchSettings = game.settings.game_branches[game.branch]
        globalGameVersion = gameBranchSettings.latest_version;
        title = game.settings.name;

        document.getElementsByClassName("news")[0].style.backgroundImage = `url('data:image/png;base64, ${game.art.patch}')`;
        document.getElementsByClassName("tag")[0].textContent = globalGameVersion;
        document.getElementsByTagName("h3")[0].textContent = game.notes.titles[globalGameVersion].title;

        document.getElementsByClassName("news")[0].addEventListener("click", (event) => {
            let patchNotes = {
                gameName : game.settings.name,
                latestVersion : globalGameVersion,
                notes : game.notes
            };
    
            ipcRenderer.send("open-patchnotes", patchNotes);
        });

        platforms = ['windows', 'linux', 'macos'];
        platformAliases = ['Windows 10/11', "Linux", "MacOS"];

        for (let i = 0; i < platforms.length; i++) {
            let platform = platforms[i];
            let pAlias = platformAliases[i];

            let icon = document.getElementById(platform);
            let tooltip = document.getElementById(`${platform}-tooltip`);

            if (!gameBranchSettings.platforms.includes(platform)) {
                icon.classList.add("disabled");
                tooltip.classList.add("disabled");
                tooltip.textContent = `No ${pAlias} support`
            }
            else {
                tooltip.textContent = `Compatible with ${pAlias}`
            }
        }

        let onlineIcon = document.getElementById("online");
        let onlineTooltip = document.getElementById("online-tooltip");
        if (!gameBranchSettings.requires_online) {
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
            let rAlias = requirementAliases[i];

            let icon = document.getElementById(requirement);
            let tooltip = document.getElementById(`${requirement}-tooltip`);

            if (!gameBranchSettings.requirements.includes(requirement)) {
                icon.classList.add("disabled");
                tooltip.classList.add("disabled");
                tooltip.textContent = `${rAlias} is not required`
            }
            else {
                tooltip.textContent = `${rAlias} must be launched`
            }
        }

        let actionButton = document.querySelector('.action-button');

        if (installing === "installing") {
            actionState = "installing";
        }
        else if (localGameVersion === null) {
            actionState = "not-installed";
        }
        else if (localGameVersion !== globalGameVersion) {
            actionState = "req-update";
        }
        else {
            actionState = "installed";
        }

        updateActionButton();

        actionButton.addEventListener('click', (event) => {
           actionButtonClick();
        });

        document.querySelector('.stop-play').addEventListener('click', (event) => {
            ipcRenderer.send('stop-game', id, branch);
         });

        actionButton.addEventListener('mouseover', (event) => {
            hovering = true;
            if (actionState === "installing") {
                actionButton.querySelector('.status').innerHTML = '<i class="fa-solid fa-x"></i>';
                actionButton.querySelector('.text').innerHTML = "<h2>Stop</h2>";
            }
            else {
                hovering = false;
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
    function updateActionButton(localProgress = 0, localSpeed = 0) {
        let actionButton = document.querySelector('.action-button');

        if (actionState == "not-installed") {
            lastProgress = 0;
            lastSpeed = 0;
            localGameVersion = null;
            actionButton.querySelector('.status').innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i>';
            actionButton.querySelector('.text').innerHTML = "<h2>Install</h2>";
        }
        else if (actionState == "preparing") {
            lastProgress = 0;
            lastSpeed = 0;
            localGameVersion = null;
            actionButton.querySelector('.status').innerHTML = '<i class="fa-solid fa-hourglass-start"></i>';
            actionButton.querySelector('.text').innerHTML = "<h2>Preparing</h2>";
        } 
        else if (actionState == "installing") {
            lastProgress = localProgress;
            lastSpeed = localSpeed;
            localGameVersion = null;
            if (!hovering) {
                actionButton.querySelector('.status').innerHTML = `<span>${localProgress}</span>`;
                actionButton.querySelector('.text').innerHTML = `<h2>Installing</h2><p>${localSpeed} Mb/s</p>`;
            }
        } 
        else if (actionState == "extract-progress") {
            lastProgress = 0;
            lastSpeed = 0
            localGameVersion = null;
            actionButton.querySelector('.status').innerHTML = `<span>${localProgress}</span>`;
            actionButton.querySelector('.text').innerHTML = "<h2>Extracting</h2>";
        }
        else if (actionState == "stopping") {
            localGameVersion = null;
            actionButton.querySelector('.status').innerHTML = '<i class="fa-solid fa-hourglass-start"></i>';
            actionButton.querySelector('.text').innerHTML = "<h2>Stop</h2>";
        }
        else if (actionState == "req-update") {
            lastProgress = 0;
            lastSpeed = 0;
            actionButton.querySelector('.status').innerHTML = '<i class="fa-solid fa-arrows-rotate"></i>';
            actionButton.querySelector('.text').innerHTML = "<h2>Update</h2>";
        }
        else if (actionState == "launching") {
            lastProgress = 0;
            lastSpeed = 0;
            actionButton.querySelector('.status').innerHTML = '<i class="fa-solid fa-rocket"></i>';
            actionButton.querySelector('.text').innerHTML = "<h2>Playing</h2>";
        }
        else {
            lastProgress = 0;
            lastSpeed = 0;
            localGameVersion = globalGameVersion;
            actionButton.querySelector('.status').innerHTML = '<i class="fa-solid fa-play"></i>';
            actionButton.querySelector('.text').innerHTML = "<h2>Launch</h2>";
        }
    }

    function createLaunchingScreen() {
        document.querySelector('.launch-text').textContent = "Starting Game Launch";
        document.querySelector('.stop-play').classList.remove("active");
        document.querySelector('.launch-screen').classList.add("active");
    }

    function destroyLaunchingScreen() {
        document.querySelector('.launch-screen').classList.remove("active");
    }

    function actionButtonClick() {
        if (actionState == "not-installed") {
            actionState = "preparing";
            hovering = false;
            updateActionButton();
            ipcRenderer.send('start-download', id, branch, platform, title, globalGameVersion);
        }
        else if (actionState == "installing") {
            actionState = "stopping";
            updateActionButton();
            ipcRenderer.send('cancel-download');
        }
        else if (actionState == "req-update") {
            actionState = "installing";
            hovering = false;
            updateActionButton();
            ipcRenderer.send('start-download', id, branch, platform, title, globalGameVersion);
        }
        else if (actionState == "installed") {
            actionState = "launching";
            hovering = false;
            updateActionButton();
            createLaunchingScreen();
            ipcRenderer.send('launch-game', id, branch, globalGameVersion);
        }
    }

    ipcRenderer.on('launch-error', (event, gameId, gameBranch, error) => {
        if (gameId !== id || gameBranch !== branch) return;
        actionState = "installed";
        updateActionButton();
        destroyLaunchingScreen();
        notify("Game Launch Failed", `Game couldn't be launched: ${error}`, 3000, null, true);
    });

    ipcRenderer.on('play-finished', (event, gameId, gameBranch) => {
        if (gameId !== id || gameBranch !== branch) return;
        actionState = "installed";
        updateActionButton();
        destroyLaunchingScreen();
    });

    ipcRenderer.on('play-start', (event, gameId, gameBranch) => {
        if (gameId !== id || gameBranch !== branch) return;
        document.querySelector('.launch-text').textContent = "Playing Game";
        document.querySelector('.stop-play').classList.add("active");
    });

    ipcRenderer.on('stop-error', (event, gameId, gameBranch, error) => {
        if (gameId !== id || gameBranch !== branch) return;
        actionState = "installed";
        updateActionButton();
        destroyLaunchingScreen();
        notify("Game Stop Failed", `Game couldn't be stopped: ${error}`, 3000, null, true);
    });

    ipcRenderer.on('stop-start', (event, gameId, gameBranch) => {
        if (gameId !== id || gameBranch !== branch) return;
        document.querySelector('.launch-text').textContent = "Stopping Game";
        document.querySelector('.stop-play').classList.remove("active");
    });

    ipcRenderer.on('launch-progress', (event, gameId, gameBranch, newMessage) => {
        if (gameId !== id || gameBranch !== branch) return;
        document.querySelector('.launch-text').textContent = newMessage;
    });

    ipcRenderer.on('download-progress', (event, gameId, gameBranch, progress, speed) => {
        if (gameId !== id || gameBranch !== branch) return;
        actionState = "installing";
        updateActionButton(progress, speed);
    });

    ipcRenderer.on('download-success', (event, gameId, gameBranch, gameTitle) => {
        notify("Game Installed", `${gameTitle} - ${gameBranch} has finished installing!`, 3000, null, true);
        if (gameId !== id || gameBranch !== branch) return;

        actionState = "installed";
        updateActionButton();
    });

    ipcRenderer.on('download-cancelled', (event, gameId, gameBranch, gameTitle) => {
        notify("Installation Cancelled", `${gameTitle} - ${gameBranch} installation has been cancelled.`, 3000, null);
        if (gameId !== id || gameBranch !== branch) return;

        actionState = "not-installed";
        updateActionButton();
    });

    ipcRenderer.on('download-error', (event, errorMessage, gameId, gameBranch, gameTitle) => {
        notify("Installation Failed", `${gameTitle} - ${gameBranch} faced an error during download: ${errorMessage}`, 3000, null, true);
        if (gameId !== id || gameBranch !== branch) return;

        actionState = "not-installed";
        updateActionButton();
    });

    ipcRenderer.on('extract-start', (event, gameId, gameBranch) => {
        if (gameId !== id || gameBranch !== branch) return;

        actionState = "preparing";
        updateActionButton();
    });

    ipcRenderer.on('extract-progress', (event, gameId, gameBranch, progress) => {
        if (gameId !== id || gameBranch !== branch) return;

        actionState = "extract-progress";
        updateActionButton(progress);
    });

    ipcRenderer.on('extract-error', (event, errorMessage, gameId, gameBranch, gameTitle) => {
        notify("Installation Failed", `${gameTitle} - ${gameBranch} faced an error during extraction: ${errorMessage}`, 3000, null, true);
        if (gameId !== id || gameBranch !== branch) return;

        actionState = "not-installed";
        updateActionButton();
    });

    ipcRenderer.on('game-uninstalled', (event, gameId, gameBranch, gameTitle) => {
        if (gameId !== id || gameBranch !== branch) return;

        notify("Game Uninstalled", `${gameTitle} - ${gameBranch} was uninstalled!`, 3000, null);
        actionState = "not-installed";
        updateActionButton();
    });

    ipcRenderer.on('cant-uninstall-download', (event, gameId, gameBranch, gameTitle) => {
        if (gameId !== id || gameBranch !== branch) return;
        notify("Waiting for Download", `${gameTitle} - ${gameBranch} cannot be uninstalled while installing a game.`, 3000, null);
    });

    ipcRenderer.on('cant-install-download', (event, gameId, gameBranch, gameTitle) => {
        if (gameId !== id || gameBranch !== branch) return;
        actionState = "not-installed";
        updateActionButton();
        notify("Waiting for Download", `${gameTitle} - ${gameBranch} cannot be installed while installing another game.`, 3000, null);
    });

    ipcRenderer.on('game-already-uninstalled', (event, gameId, gameBranch, gameTitle) => {
        if (gameId !== id || gameBranch !== branch) return;

        notify("Game Already Uninstalled", `${gameTitle} - ${gameBranch} is already uninstalled!`, 3000, null);
        actionState = "not-installed";
        updateActionButton();
    });
    // --------------------------------------------------------------------------------------
});