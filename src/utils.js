exports.getErrorMessage = function (status) {
    switch (status) {
        case 403:
            return "Your access key is not valid";
        case 404:
            return "The server address is invalid";
        case 406:
            return "The resource couldn't be found";
        case 500:
            return "The server faced an error";
        case 0:
            return "The server couldn't be reached";
        default:
            return "An unknown error occurred";
    }
}

exports.getSettingAction = function (key, value) {
    switch (key) {
        case 'gamesPath':
            return {
                type : "open",
                button: "open",
                target : "explorer",
                path : value,
            };
        case 'appVersion':
            return {
                type : "ipc",
                valueInDesc: true,
                button: "checkForUpdates",
                callbacks : [
                    ["set-window-forward", ['settings']],
                    ["open-window-preset", ['update']]
                ]
            };
        case 'betaEnabled':
            return { type : "toggle" };
        case 'autoUpdateEnabled':
            return { type : "toggle" };
        case 'updateServer':
            return { type : "input" };
        case 'authFailBehaviour':
            return { type : "dropdown", options : [0,1,2] };
        case 'language' : {
            return { 
                type : "dropdown",
                options : ['en','ru']
            };
        }
        default:
            return  {type: "unknown" };
    }
}