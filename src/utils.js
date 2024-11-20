exports.getSettingAction = function (key, value) {
    switch (key) {
        case 'gamesPath':
            return {
                type : "open",
                button: "open",
                icon: "fa-solid fa-folder",
                target : "explorer",
                path : value,
            };
        case 'appVersion':
            return {
                type : "ipc",
                valueInDesc: true,
                button: "checkForUpdates",
                icon: "fa-solid fa-wrench",
                callbacks : [
                    ["set-window-forward", ['settings']],
                    ["open-window-preset", ['update']]
                ]
            };
        case 'gameDataCache':
            return {
                type : "ipc",
                valueInDesc: false,
                button: "clearCache",
                icon: "fa-solid fa-sd-card",
                callbacks : [
                    ["clear-all-game-data-caches", []],
                    ["reload", []],
                ]
            };
        case 'betaEnabled':
            return { type : "toggle", icon: "fa-solid fa-flask" };
        case 'autoUpdateEnabled':
            return { type : "toggle", icon: "fa-solid fa-cloud-arrow-down" };
        case 'updateServer':
            return { type : "input", icon: "fa-solid fa-server" };
        case 'authFailBehaviour':
            return { type : "dropdown", icon: "fa-solid fa-user-xmark", options : [0,1,2] };
        case 'language' : {
            return { 
                type : "dropdown",
                icon: "fa-solid fa-language",
                options : ['en','ru', 'cz', 'nl']
            };
        }
        case 'devConsole':
            return {
                type : "ipc",
                valueInDesc: false,
                button: "openDevConsole",
                icon: "fa-solid fa-terminal",
                callbacks : [
                    ["open-popout-window-preset", ["console"]]
                ]
            };
        default:
            return  { type: "unknown", icon: "fa-solid fa-question" };
    }
}

exports.mergeObjects = function (baseObject, overlayedObject) {
    for (const [key, value] of Object.entries(overlayedObject)) baseObject[key] = value;
    return baseObject;
}