const { ipcRenderer } = require('electron');
const notification = require("../src/frontend/notification");
const popout = require("../src/frontend/popout");
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

    popout.setup(
        document.querySelector('.popout'), 
        document.querySelector('.primary.button'), 
        document.querySelector('.cancel.button')
    );
    
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

        let activeBranchFound = false;
        for (let branch of Object.values(game.branches)) {
            if (branch.name == launchSettings.activeBranchId) activeBranchFound = branch; // Temporary fix
            branches.push({ value: branch.name, alias: `${branch.id} [${branch.version}]`, selected: (branch.name == launchSettings.activeBranchId) });
        }
        
        if (!activeBranchFound) { // Should be !Object.keys(game.branches).includes(launchSettings.activeBranchId) but GitHub jsons are to be updated
            ipcRenderer.send("reset-game-launch-settings", game);
            ipcRenderer.send("reload");
            return;
        }
        activeBranch = activeBranchFound;

        if (branches.length <= 1) branchButton.remove();

        document.querySelector(".tag").textContent = activeBranch.version;
        document.querySelector("h3").textContent = game.patch_notes_metadata[activeBranch.version].title;
        document.querySelector(".news").addEventListener("click", (event) => { ipcRenderer.send("open-popout-window-preset", "patchnotes") })

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

        if (!gameLoaded) notification.notify(localiser.getLocalString('wait'), localiser.getLocalString('gameLoadNotFinished'), 2000);
        else {
            ipcRenderer.send("close-popout-window", 'patchnotes');
            ipcRenderer.send("open-window-preset", 'library');
        }
    });

    reloadButton.addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!gameLoaded) {
            notification.notify(localiser.getLocalString('wait'), localiser.getLocalString('gameLoadNotFinished'), 2000);
            return;
        }

        reloadStarted = true;
        ipcRenderer.send("reload");
    });

    branchButton.addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!gameLoaded) {
            notification.notify(localiser.getLocalString('wait'), localiser.getLocalString('gameLoadNotFinished'), 2000);
            return;
        }

        popout.activate(
            localiser.getLocalString("changeBranch"),
            localiser.getLocalString("changeBranchDesc"),
            localiser.getLocalString("confirm"),
            "add",
            (branchValue) => {
                ipcRenderer.send('update-active-branch', game, { name: branchValue }); // Update to ID once GitHub jsons are converted
                ipcRenderer.send('reload');
            },
            branches
        );
    });

    logoutButton.addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!gameLoaded) {
            if (!gameLoaded) notification.notify(localiser.getLocalString('wait'), localiser.getLocalString('gameLoadNotFinished'), 2000);
            return;
        }
        
        popout.activate(
            localiser.getLocalString("areYouSure"),
            localiser.getLocalString("logoutDesc"),
            localiser.getLocalString("logout"),
            "remove",
            () => { notification.notify(
                localiser.getLocalString("loggingOut"), 
                localiser.getLocalString("clearingSession"), 
                1500, 
                false, 
                () => { ipcRenderer.send("logout"); }) 
            }
        );
    });

});