const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    let patchNotes = null;
    let branchVersions = null;
    let currentPatchIndex = 0;
    let upperIndexBound = 0;

    function updatePatchNoteContent(index) {
        let version = Object.keys(patchNotes)[index];
        let { title, type, content } = Object.values(patchNotes)[index];

        document.querySelector('.version').textContent = version;
        document.querySelector('.notes').innerHTML = atob(content);

        document.querySelector(".title").textContent = title;
        document.querySelector("#type").textContent = type;

        if (typeof branchVersions == 'string') {
            if (branchVersions == version) document.querySelector("#extra-info").textContent = `Current playable version`;
            else document.querySelector("#extra-info").textContent = `Not currently playable`;
        }
        else if (version in branchVersions) {
            document.querySelector("#extra-info").textContent = `Available to play on branche(s): ${branchVersions[version].join(", ")}`;
        } 
        else {
            document.querySelector("#extra-info").textContent = `Not available to play on current branches`;
        }
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

    ipcRenderer.on('patchnotes-loaded', (event, game) => {
        patchNotes = game.patch_notes;
        upperIndexBound = Object.keys(patchNotes).length - 1;
        
        document.querySelector('.name').textContent = game.name;

        if (Object.keys(game.branches).length > 1) {
            branchVersions = {};

            Object.values(game.branches).forEach(branch => {
                if (!branchVersions[branch.version]) branchVersions[branch.version] = [];
                branchVersions[branch.version].push(branch.name);
            });
        }
        else {
            branchVersions = Object.values(game.branches)[0].version;
        }
    
        currentPatchIndex = upperIndexBound;
        updatePatchNoteContent(upperIndexBound);
    });
});