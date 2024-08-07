const { ipcRenderer } = require('electron');

let gameName;
let latestVersion;
let patchTitles;
let patchHTMLFiles;
let currentPatchIndex;
let upperIndexBound;

window.addEventListener('DOMContentLoaded', () => {

    function updatePatchNoteContent(index) {
        let version = Object.keys(patchTitles)[index];
        document.querySelector('.version').textContent = version;
        document.querySelector('.notes').innerHTML = atob(patchHTMLFiles[index]);

        document.querySelector(".title").textContent = patchTitles[version].title
        document.querySelector(".tag").textContent = patchTitles[version].type
    }
    
    ipcRenderer.on('load-patchnotes', (event, patchNoteInfo) => {
        gameName = patchNoteInfo.gameName;
        latestVersion = patchNoteInfo.latestVersion;
        patchTitles = patchNoteInfo.notes.titles;
        patchHTMLFiles = patchNoteInfo.notes.patch_notes;
    
        upperIndexBound = Object.keys(patchTitles).indexOf(latestVersion);
        document.querySelector('.name').textContent = gameName;
        document.querySelector('title').textContent = `${gameName} - Patch Notes`
    
        currentPatchIndex = upperIndexBound;
        updatePatchNoteContent(upperIndexBound);
    });
    
    function goBack() {
        if (currentPatchIndex == 0) return;
        currentPatchIndex -= 1;
        updatePatchNoteContent(currentPatchIndex);
    }
    
    function goForward() {
        if (currentPatchIndex == upperIndexBound) return;
        currentPatchIndex += 1;
        updatePatchNoteContent(currentPatchIndex);
    }
    
    document.getElementById("left-swap").addEventListener('click', goBack);
    document.getElementById("right-swap").addEventListener('click', goForward);

});