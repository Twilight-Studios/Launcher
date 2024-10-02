const { ipcRenderer } = require('electron');
const { notify } = require("../src/frontend/notification");
const popout = require("../src/frontend/popout");
const localiser = require("../src/frontend/localiser");

window.addEventListener('DOMContentLoaded', () => {
    let gameLoaded = false;
    let reloadStarted = false;
    let activeBranch = null;
    let branches = [];

    const libraryButton = document.querySelector("#library");
    const reloadButton = document.querySelector("#reload");
    const branchButton = document.querySelector("#branch");
    const logoutButton = document.querySelector("#logout");
    const notificationObject = document.querySelector('.notification');

    popout.setup(
        document.querySelector('.popout'), 
        document.querySelector('.primary.button'), 
        document.querySelector('.cancel.button')
    );
    
    ipcRenderer.on('game-loaded', (event, response) => {
        document.querySelector('.loader-wrapper').classList.remove('active');
        gameLoaded = true;
        let game = response.payload;

        logo = document.querySelector("img");
        logo.src = "data:image/png;base64, " + game.logo;
        document.querySelector(".window").style.backgroundImage = `url('data:image/png;base64, ${game.background}')`;

        document.querySelector(".news").style.backgroundImage = `url('data:image/png;base64, ${game.patch}')`;
        document.querySelector(".tag").textContent = localiser.getLocalString("patchNotes");
        document.querySelector("h3").textContent = localiser.getLocalString("unavailable");

        for (const [branchId, branch] of Object.entries(game.game_branches)) {
            branches.push({ value: branch.name, alias: `${branchId} [${branch.latest_version}]` }); // TODO: Rename latest_version to version on the server side
        }

        // Temporary active branch allocation
        let firstBranchId = Object.keys(game.game_branches)[0];
        activeBranch = game.game_branches[firstBranchId];
        activeBranch.id = firstBranchId;

        platforms = ['windows', 'linux', 'macos'];
        platformAliases = ['Windows 10/11', "Linux", "MacOS"];

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
        

        requirements = ['steam', "xbox"];
        requirementAliases = ['Steam', "Xbox Launcher"];

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

        if (!gameLoaded) notify(notificationObject, localiser.getLocalString('wait'), localiser.getLocalString('gameLoadNotFinished'), 2000, false, null);
        else ipcRenderer.send("open-window-preset", 'library');
    });

    reloadButton.addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!gameLoaded) {
            notify(notificationObject, localiser.getLocalString('wait'), localiser.getLocalString('gameLoadNotFinished'), 2000, false, null);
            return;
        }

        reloadStarted = true;
        ipcRenderer.send("reload");
    });

    branchButton.addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!gameLoaded) {
            notify(notificationObject, localiser.getLocalString('wait'), localiser.getLocalString('gameLoadNotFinished'), 2000, false, null);
            return;
        }

        popout.activate(
            localiser.getLocalString("changeBranch"),
            localiser.getLocalString("changeBranchDesc"),
            localiser.getLocalString("confirm"),
            "add",
            () => { },
            branches
        );
    });

    logoutButton.addEventListener("click", (event) => {
        if (reloadStarted) return;

        if (!gameLoaded) {
            if (!gameLoaded) notify(notificationObject, localiser.getLocalString('wait'), localiser.getLocalString('gameLoadNotFinished'), 2000, false, null);
            return;
        }
        
        popout.activate(
            localiser.getLocalString("areYouSure"),
            localiser.getLocalString("logoutDesc"),
            localiser.getLocalString("logout"),
            "remove",
            () => { notify(
                notificationObject, 
                localiser.getLocalString("loggingOut"), 
                localiser.getLocalString("clearingSession"), 
                1500, 
                false, 
                () => { ipcRenderer.send("logout"); }) 
            }
        );
    });

});