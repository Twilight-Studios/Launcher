const { ipcRenderer } = require('electron');

// TODO: Make sure that the upperIndexBound is calculated based of latest available version of the active branch

window.addEventListener('DOMContentLoaded', () => {
    let patchNotes = null;
    let currentPatchIndex = 0;
    let upperIndexBound = 0;

    function updatePatchNoteContent(index) {
        let version = Object.keys(patchNotes)[index];
        let { title, type, content } = Object.values(patchNotes)[index];

        document.querySelector('.version').textContent = version;
        document.querySelector('.notes').innerHTML = atob(content);

        document.querySelector(".title").textContent = title;
        document.querySelector(".tag").textContent = type;
    }

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

    ipcRenderer.on('patchnotes-loaded', (event, gameName, recievedPatchNotes) => {
        patchNotes = recievedPatchNotes;
        upperIndexBound = Object.keys(patchNotes).length - 1;
        
        document.querySelector('.name').textContent = gameName;
    
        currentPatchIndex = upperIndexBound;
        updatePatchNoteContent(upperIndexBound);
    });
});