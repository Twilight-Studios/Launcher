const { ipcRenderer } = require('electron');

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
    document.getElementById("home").addEventListener("click", (event) => {
        ipcRenderer.send('refresh', false);
    });

    document.getElementById("uninstall").addEventListener("click", (event) => {
        notify("Not Ready Yet", "Game installation is still being worked on!", 3000, null)
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
    ipcRenderer.on('game-id', async (event, gameId, gameState) => {
        let game = await ipcRenderer.invoke('get-game', gameId, gameState);
        fillGame(game);
    })

    function fillGame(game) {
        document.getElementsByClassName("loader-wrapper")[0].classList.remove("active");

        logo = document.getElementsByTagName("img")[0];
        logo.src = "data:image/png;base64, " + game.art.logo;
        document.getElementsByClassName("window")[0].style.backgroundImage = `url('data:image/png;base64, ${game.art.background}')`;

        const gameStateSettings = game.settings.game_states[game.state]
        const version = gameStateSettings.latest_version;
        document.getElementsByClassName("news")[0].style.backgroundImage = `url('data:image/png;base64, ${game.art.patch}')`;
        document.getElementsByClassName("tag")[0].textContent = game.notes.titles[version].type;
        document.getElementsByTagName("h3")[0].textContent = game.notes.titles[version].title;

        platforms = ['windows', 'linux', 'macos']
        platformAliases = ['Windows 10/11', "Linux", "MacOS"]

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

        for (let i = 0; i < platforms.length; i++) {
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
    }
    // --------------------------------------------------------------------------------------
    
});