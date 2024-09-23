const { ipcRenderer } = require('electron');

let localisationStrings = {};
let lang = 'en';

ipcRenderer.invoke('get-localisation-strings').then((data) => { localisationStrings = data; });

exports.getLocalString = function (tag, variables = {}) {
    tag = String(tag);

    if (!(tag in localisationStrings)) {
        console.error(`Tried to localise tag ${tag}, which doesn't exist.`);
        return;
    }

    let localisedString = localisationStrings[tag][lang] || localisationStrings[tag].en;

    // Replace placeholders in the localized string with actual values
    for (const [key, value] of Object.entries(variables)) {
        localisedString = localisedString.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    return localisedString;
}

exports.localiseHtml = function () {
    const customTagPattern = /\[!:(.*?)\]/g;

    function replaceTextNodes(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            let textNodeValue = node.nodeValue;
            let match;
            while ((match = customTagPattern.exec(textNodeValue)) !== null) {
                const tag = match[1];
                const localString = exports.getLocalString(tag);
                textNodeValue = textNodeValue.replace(match[0], localString);
            }
            node.nodeValue = textNodeValue;
        } else {
            node.childNodes.forEach(child => replaceTextNodes(child));
        }
    }

    replaceTextNodes(document.body);
}

ipcRenderer.on('localise', (event, newLang) => {
    if (newLang) lang = newLang;
    exports.localiseHtml();
});