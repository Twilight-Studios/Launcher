const { ipcRenderer } = require('electron');
const localiser = require('../src/frontend/localiser');

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
            if (branchVersions == version) document.querySelector("#extra-info").textContent = localiser.getLocalString("currentlyPlayableVersion");
            else document.querySelector("#extra-info").textContent = localiser.getLocalString("notCurrentlyPlayable");
        }
        else if (version in branchVersions) {
            document.querySelector("#extra-info").textContent = localiser.getLocalString("currentlyPlayableBranchesForVersion", { branches: branchVersions[version].join(", ") });
        } 
        else {
            document.querySelector("#extra-info").textContent = localiser.getLocalString("notCurrentlyPlayableOnBranches");
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

    ipcRenderer.on('patchnotes-loaded', (event, game, passedPatchNotes) => {
        patchNotes = passedPatchNotes;
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