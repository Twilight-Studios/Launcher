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
        case 'gameDataCache':
            return {
                type : "ipc",
                valueInDesc: false,
                button: "clearCache",
                callbacks : [
                    ["clear-game-data-cache", []],
                    ["reflect", ["notification", "[!:success]", "[!:clearedGameDataCache]", 3000]]
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

exports.mergeObjects = function (baseObject, overlayedObject) {
    for (const [key, value] of Object.entries(overlayedObject)) baseObject[key] = value;
    return baseObject;
}

exports.mergeObjectLists = function (baseList, overlayedList) {
    const mergedList = baseList.map((baseItem, index) => {
        const overlayedItem = overlayedList[index];

        if (overlayedItem) return Object.assign({}, baseItem, overlayedItem);
        return baseItem;
    });

    if (overlayedList.length > baseList.length) {
        mergedList.push(...overlayedList.slice(baseList.length));
    }

    return mergedList;
}
