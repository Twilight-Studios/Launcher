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

    /*
    Legend for action metadata (NONE CAN BE NULL IF ACTION IS NOT NULL)

    Type: open
        target: explorer, browser
        path: string (i.e. a path to a file or URL)
    
    Type: ipc
        channel: string (the channel on which the IPC message is sent)
        params: array (params for the message)

    Type: toggle
        title: string (title of the toggle popout)
        desc: string (description of the toggle popout)

    Type: dropdown
        title: string (title of the dropdown popout)
        desc: string (description of the toggle popout)
        options: [ [alias, value], [alias, value], ...]

    Type: input
        title: string (title of the input popout)
        desc: string (description of the input popout)

    */

    switch (key) {
        case 'gamesPath':
            return { 
                title : "Games Folder", 
                desc : "Where all games are installed",
                button : "Open Folder",
                action : {
                    type : "open",
                    target : "explorer",
                    path : value,
                }
            };
        case 'appVersion':
            return { 
                title : "App Version", 
                desc : `The current version of the app is ${value}`,
                button : "Check for Updates",
                action : {
                    type : "ipc",
                    channel : "open-window-preset",
                    params : ['update']
                }
            };
        case 'betaEnabled':
            return { 
                title : "Experimental Branch", 
                desc : `Use the experimental build of the launcher. Currently ${ value ? "enabled" : "disabled" }`,
                button : "Toggle Branch",
                action : {
                    type : "toggle",
                    title : value ? "Return to Stable Branch" : "Enable Experimental Branch",
                    desc : value ? "By returning to the stable branch, all experimental updates will be reverted and the launcher will restart." : "By enabling the experimental branch, you may be using a non-stable version of the launcher with possible bugs."
                }
            };
        case 'autoUpdateEnabled':
            return { 
                title : "Auto Update", 
                desc: `Update the launcher automatically on startup. Currently ${ value ? "enabled" : "disabled" }`,
                button: "Toggle Auto Update",
                action : {
                    type : "toggle",
                    title : value ? "Disable Auto Update" : "Enable Auto Update",
                    desc : value ? "By disabling auto update, all updates need to be manually downloaded by checking for updates, and critical updates can be missed." : "By enabling auto update, the launcher will automatically check for the latest launcher version and install it on startup."
                }
            };
        case 'updateServer':
            return { 
                title : "Update Server", 
                desc : "From where to download new launcher updates",
                button : "Change Update Server",
                action : {
                    type : "input",
                    title : "Change Update Server",
                    desc : "By changing the update server, the app will restart and download all updates from the new URL."
                }
            };
        case 'authFailBehaviour':
            return { 
                title : "On Authentication Fail", 
                desc : "What to do in case your credentials can't be authenticated",
                button : "Set Behaviour",
                action : {
                    type : "dropdown",
                    title : "Authentication Fail Behaviour",
                    desc : "What to do when the launcher fails to authenticate a logged-in user.",
                    options : [
                        ["Logout and remove game files", 0],
                        ["Logout and keep game files", 1],
                        ["Do not logout", 2],
                    ]
                }
            };
        default:
            return  { 
                title : `Unknown Setting: ${key}`, 
                desc : "This setting is unknown and has no meta data",
                button : `Value: ${value}`,
                action : null
            };
    }
}