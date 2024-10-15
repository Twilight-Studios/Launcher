const { ipcRenderer } = require('electron');

let localisationStrings = {};
let lang = 'en';

ipcRenderer.invoke('get-localisation-strings').then((data) => { localisationStrings = data; });

exports.getLocalString = function (tag, variables = {}) {
    tag = String(tag);

    if (!(tag in localisationStrings)) {
        console.error(`Tried to localise tag ${tag}, which doesn't exist.`);
        return `[!:${tag}]`;
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

    function replaceInTextNode(node) {
        let textNodeValue = node.nodeValue;
        const matches = [...textNodeValue.matchAll(customTagPattern)];

        if (matches.length > 0) {
            matches.forEach(match => {
                const tag = match[1];
                const localString = exports.getLocalString(tag);
                textNodeValue = textNodeValue.replace(match[0], localString);
            });
        }

        node.nodeValue = textNodeValue;
    }
    

    function replaceInAttributes(node) {
        const attributes = node.attributes;
        if (attributes) {
            for (let attr of attributes) {
                let attrValue = attr.value;
                let match;
                customTagPattern.lastIndex = 0;  // Reset regex state for each attribute
                while ((match = customTagPattern.exec(attrValue)) !== null) {
                    const tag = match[1];
                    const localString = exports.getLocalString(tag);
                    attrValue = attrValue.replace(match[0], localString);
                    customTagPattern.lastIndex = 0;
                }
                node.setAttribute(attr.name, attrValue); // Set the replaced value back
            }
        }
    }

    function traverseAndReplace(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            replaceInTextNode(node);
        } else {
            replaceInAttributes(node); // Handle attributes for non-text nodes
            node.childNodes.forEach(child => traverseAndReplace(child)); // Recursively replace in children
        }
    }

    traverseAndReplace(document.body);
}


ipcRenderer.on('localise', (event, newLang) => {
    if (newLang) lang = newLang;
    exports.localiseHtml();
});