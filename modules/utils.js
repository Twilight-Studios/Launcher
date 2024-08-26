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

exports.getSettingMetadata = function (key, value) {
    switch (key) {
        case 'gamesPath':
            return { 
                "title" : "Games Folder", 
                "desc": "Where all games are installed",
                "button": "Open Folder",
                "restart": false
            };
        case 'appVersion':
            return { 
                "title" : "App Version", 
                "desc": `The current version of the app is ${value}`,
                "button": "Check for Updates",
                "restart": false
            };
        case 'betaEnabled':
            return { 
                "title" : "Experimental Branch", 
                "desc": `Use the experimental build of the launcher. Currently ${ value ? "enabled" : "disabled" }`,
                "button": "Toggle Branch",
                "restart": false
            };
        case 'autoUpdateEnabled':
            return { 
                "title" : "Auto Update", 
                "desc": `Update the launcher automatically on startup. Currently ${ value ? "enabled" : "disabled" }`,
                "button": "Toggle Auto Update",
                "restart": false
            };
        case 'updateServer':
            return { 
                "title" : "Update Server", 
                "desc": "From where to download new launcher updates",
                "button": "Change Update Server",
                "restart": false
            };
        case 'authFailBehaviour':
            return { 
                "title" : "On Authentication Fail", 
                "desc": "What to do in case your credentials can't be authenticated",
                "button": "Set Behaviour",
                "restart": false
            };
        default:
            return  { 
                "title" : `Unknown Setting: ${key}`, 
                "desc": "This setting is unknown and has no meta data",
                "button": `Value: ${value}`,
                "restart": false
            };
    }
}