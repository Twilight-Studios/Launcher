const { ipcRenderer } = require('electron');
const notification = require("../src/frontend/notification");
const modal = require("../src/frontend/modal");
const localiser = require("../src/frontend/localiser");

window.addEventListener('DOMContentLoaded', () => {
    let game = null;
    let filesData = null;
    let gameLoaded = false;
    let reloadStarted = false;
    let activeBranch = null;
    let branches = [];
    let actionButtonState = null;

    const libraryButton = document.querySelector("#library");
    const reloadButton = document.querySelector("#reload");
    const branchButton = document.querySelector("#branch");
    const uninstallButton = document.querySelector("#uninstall");
    const logoutButton = document.querySelector("#logout");

    const window = document.querySelector(".window");
    const gameLogo = document.querySelector("img");

    const patchNotes = document.querySelector(".news");
    const patchNotesTag = document.querySelector(".tag");
    const patchNotesTitle = document.querySelector("h3");

    const actionButton = document.querySelector('.action-button');

    notification.injectUi();
    modal.injectUi();
    
    ipcRenderer.on('game-loaded', async (event, response) => {
        document.querySelector('.loader-wrapper').classList.remove('active');

        gameLoaded = true;
        game = response.payload;
        filesData = response.filesData;

        for (let [id, branch] of Object.entries(game.branches)) {
            branches.push({ value: id, alias: `${branch.name} [${branch.version}]`, selected: (id == filesData.activeBranchId) });
        }
        
        if (!Object.keys(game.branches).includes(filesData.activeBranchId)) {
            ipcRenderer.send("reset-game-files-data", game);
            ipcRenderer.send("reload");
            return;
        }

        activeBranch = game.branches[filesData.activeBranchId];

        gameLogo.src = "data:image/png;base64, " + game.logo;
        window.style.backgroundImage = `url('data:image/png;base64, ${game.background}')`;
        
        patchNotes.style.backgroundImage = `url('data:image/png;base64, ${game.patch}')`;
        patchNotes.addEventListener("click", (event) => { ipcRenderer.send("open-popout-window-preset", "patchnotes") });
        patchNotesTag.textContent = `${activeBranch.name} - ${activeBranch.version}`;
        patchNotesTitle.textContent = game.patch_notes_metadata[activeBranch.version].title;

        if (branches.length <= 1) { 
            patchNotesTag.textContent = activeBranch.version;
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
        
        let gameInInstallInfo = await ipcRenderer.invoke('get-game-in-install');

        if (filesData.downloadedVersions.includes(activeBranch.version)) actionButtonState = 'installed';
        else if (gameInInstallInfo && gameInInstallInfo.id == game.id) actionButtonState = 'installing';
        else if (gameInInstallInfo) actionButtonState = 'otherGameInstalling'
        else actionButtonState = 'notInstalled';

        updateActionButton();
        actionButton.addEventListener('click', onActionButtonClick);
    });

    async function onActionButtonClick() {
        switch (actionButtonState) {
            case 'installed':
                // Play the game
                break;
            case 'installing':
                // Cancel the installation
                break;
            case 'otherGameInstalling':
                notification.activate(
                    localiser.getLocalString("installUnavailable"),
                    localiser.getLocalString("otherGameInstalling"),
                    3000
                );
                break;
            case 'notInstalled':
                actionButtonState = 'installing';
                let userInfo = await ipcRenderer.invoke('get-user');
                ipcRenderer.send('install-game', game.id, activeBranch.version, userInfo);
                break;
        }

        updateActionButton();
    }

    function updateActionButton() {
        switch (actionButtonState) {
            case 'installed':
                actionButton.querySelector('.status').innerHTML = '<i class="fa-solid fa-play"></i>';
                actionButton.querySelector('.text').innerHTML = `<h2>${localiser.getLocalString("play")}</h2>`;
                break;
            case 'installing':
                actionButton.querySelector('.status').innerHTML = '<i class="fa-solid fa-cloud-arrow-down fa-fade"></i>';
                actionButton.querySelector('.text').innerHTML = `<h2>${localiser.getLocalString("installing")}</h2>`;
                break;
            case 'otherGameInstalling':
                actionButton.querySelector('.status').innerHTML = '<i class="fa-solid fa-lock"></i>';
                actionButton.querySelector('.text').innerHTML = `<h2>${localiser.getLocalString("unavailable")}</h2>`;
                break;
            case 'notInstalled':
                actionButton.querySelector('.status').innerHTML = '<i class="fa-solid fa-download"></i>';
                actionButton.querySelector('.text').innerHTML = `<h2>${localiser.getLocalString("install")}</h2>`;
                break;
        }
    }

    ipcRenderer.on('install-finished', async (event) => {
        
        let gameInInstallInfo = await ipcRenderer.invoke('get-game-in-install');

        if (filesData.downloadedVersions.includes(activeBranch.version)) actionButtonState = 'installed';
        else if (gameInInstallInfo && gameInInstallInfo.id == game.id) actionButtonState = 'installing';
        else if (gameInInstallInfo) actionButtonState = 'otherGameInstalling'
        else actionButtonState = 'notInstalled';

        updateActionButton();
    })

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

    branchButton.addEventListener("click", async (event) => {
        if (reloadStarted) return;

        if (!gameLoaded) {
            notification.activate(localiser.getLocalString('wait'), localiser.getLocalString('gameLoadNotFinished'), 2000);
            return;
        }

        let gameInInstallInfo = await ipcRenderer.invoke('get-game-in-install');

        if (gameInInstallInfo && gameInInstallInfo.id == game.id) {
            notification.activate(
                localiser.getLocalString("branchChangeUnavailable"),
                localiser.getLocalString("cannotChangeBranchWhileInstall"),
                2000
            );

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

    uninstallButton.addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!gameLoaded) {
            if (!gameLoaded) notification.activate(localiser.getLocalString('wait'), localiser.getLocalString('gameLoadNotFinished'), 2000);
            return;
        }

        let dropdownOptions = [ // Run proper checks on which ones are available
            { alias: localiser.getLocalString("currentVersionForBranch", { version: activeBranch.version }), value: 0 },
            { alias: localiser.getLocalString("currentVersionForAllBranches"), value: 1 },
            { alias: localiser.getLocalString("allInactiveVersions"), value: 2 },
            { alias: localiser.getLocalString("allVersions"), value: 3 },
        ]

        if (branches.length <= 1) {
            dropdownOptions = [
                { alias: localiser.getLocalString("currentVersion", { version: activeBranch.version }), value: 0 },
                { alias: localiser.getLocalString("allInactiveVersions"), value: 2 },
                { alias: localiser.getLocalString("allVersions"), value: 3 },
            ]    
        }

        modal.activate(
            localiser.getLocalString("uninstallGame"),
            localiser.getLocalString("uninstallGameDesc"),
            localiser.getLocalString("confirm"),
            true,
            null,
            { dropdownOptions: dropdownOptions }
        )
    })

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