const { ipcRenderer } = require('electron');
const notification = require("../src/frontend/notification");
const modal = require("../src/frontend/modal");
const localiser = require("../src/frontend/localiser");

window.addEventListener('DOMContentLoaded', () => {
    let game = null;
    let launchSettings = null;
    let gameLoaded = false;
    let reloadStarted = false;
    let activeBranch = null;
    let branches = [];

    const libraryButton = document.querySelector("#library");
    const reloadButton = document.querySelector("#reload");
    const branchButton = document.querySelector("#branch");
    const logoutButton = document.querySelector("#logout");

    notification.injectUi();
    modal.injectUi();
    
    ipcRenderer.on('game-loaded', (event, response) => {
        document.querySelector('.loader-wrapper').classList.remove('active');
        gameLoaded = true;
        game = response.payload;
        launchSettings = response.launchSettings;

        ipcRenderer.send("set-current-game", game);

        logo = document.querySelector("img");
        logo.src = "data:image/png;base64, " + game.logo;
        document.querySelector(".window").style.backgroundImage = `url('data:image/png;base64, ${game.background}')`;

        document.querySelector(".news").style.backgroundImage = `url('data:image/png;base64, ${game.patch}')`;

        for (let [id, branch] of Object.entries(game.branches)) {
            branches.push({ value: id, alias: `${branch.name} [${branch.version}]`, selected: (id == launchSettings.activeBranchId) });
        }
        
        if (!Object.keys(game.branches).includes(launchSettings.activeBranchId)) {
            ipcRenderer.send("reset-game-launch-settings", game);
            ipcRenderer.send("reload");
            return;
        }

        activeBranch = game.branches[launchSettings.activeBranchId];

        document.querySelector(".tag").textContent = `${activeBranch.name} - ${activeBranch.version}`;
        document.querySelector("h3").textContent = game.patch_notes_metadata[activeBranch.version].title;
        document.querySelector(".news").addEventListener("click", (event) => { ipcRenderer.send("open-popout-window-preset", "patchnotes") });

        if (branches.length <= 1) { 
            document.querySelector(".tag").textContent = activeBranch.version;
            branchButton.remove(); 
        }

        let platforms = ['windows', 'linux', 'macos'];
        let platformAliases = ['Windows 10/11', "Linux", "MacOS"];

        for (let i = 0; i < platforms.length; i++) {
            let platform = platforms[i];
            let pAlias = platformAliases[i];

            let icon = document.getElementById(platform);
            let tooltip = document.getElementById(`${platform}-tooltip`);

            if (!activeBranch.platforms.includes(platform)) {
                icon.classList.add("disabled");
                tooltip.classList.add("disabled");
                tooltip.textContent = localiser.getLocalString("platformNotCompatible", { platform: pAlias })
            }
            else {
                tooltip.textContent = localiser.getLocalString("platformCompatible", { platform: pAlias });
            }
        }

        let onlineIcon = document.getElementById("online");
        let onlineTooltip = document.getElementById("online-tooltip");

        if (!activeBranch.requires_online) {
            onlineIcon.classList.add("disabled");
            onlineTooltip.classList.add("disabled");
            onlineTooltip.textContent = localiser.getLocalString("onlineNotRequired");
        }
        else {
            onlineTooltip.textContent = localiser.getLocalString("onlineRequired");
        }
        

        let requirements = ['steam', "xbox"];
        let requirementAliases = ['Steam', "Xbox Launcher"];

        for (let i = 0; i < requirements.length; i++) {
            let requirement = requirements[i];
            let rAlias = requirementAliases[i];

            let icon = document.getElementById(requirement);
            let tooltip = document.getElementById(`${requirement}-tooltip`);

            if (!activeBranch.requirements.includes(requirement)) {
                icon.classList.add("disabled");
                tooltip.classList.add("disabled");
                tooltip.textContent = localiser.getLocalString("notRequiredLaunchDependency", { dependency: rAlias })
            }
            else {
                tooltip.textContent = localiser.getLocalString("requiredLaunchDependency", { dependency: rAlias });
            }
        }

        let actionButton = document.querySelector('.action-button');
        actionButton.querySelector('.status').innerHTML = '<i class="fa-solid fa-lock"></i>';
        actionButton.querySelector('.text').innerHTML = `<h2>${localiser.getLocalString("unavailable")}</h2>`;
    });

    libraryButton.addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!gameLoaded) notification.activate(localiser.getLocalString('wait'), localiser.getLocalString('gameLoadNotFinished'), 2000);
        else {
            ipcRenderer.send("close-popout-window", 'patchnotes');
            ipcRenderer.send("open-window-preset", 'library');
        }
    });

    reloadButton.addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!gameLoaded) {
            notification.activate(localiser.getLocalString('wait'), localiser.getLocalString('gameLoadNotFinished'), 2000);
            return;
        }

        reloadStarted = true;
        ipcRenderer.send("reload");
    });

    branchButton.addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!gameLoaded) {
            notification.activate(localiser.getLocalString('wait'), localiser.getLocalString('gameLoadNotFinished'), 2000);
            return;
        }

        modal.activate(
            localiser.getLocalString("changeBranch"),
            localiser.getLocalString("changeBranchDesc"),
            localiser.getLocalString("confirm"),
            false,
            ({ dropdownValue }) => {
                ipcRenderer.send('update-active-branch', game, dropdownValue);
                ipcRenderer.send('reload');
            },
            { dropdownOptions: branches }
        );
    });

    logoutButton.addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!gameLoaded) {
            if (!gameLoaded) notification.activate(localiser.getLocalString('wait'), localiser.getLocalString('gameLoadNotFinished'), 2000);
            return;
        }
        
        modal.activate(
            localiser.getLocalString("areYouSure"),
            localiser.getLocalString("logoutDesc"),
            localiser.getLocalString("logout"),
            true,
            () => { notification.activate(
                localiser.getLocalString("loggingOut"), 
                localiser.getLocalString("clearingSession"), 
                1500, 
                false, 
                () => { ipcRenderer.send("logout"); }) 
            }
        );
    });

});