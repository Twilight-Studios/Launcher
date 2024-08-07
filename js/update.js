const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    ipcRenderer.on('update-found', (event) => {
        document.querySelector('h2').textContent = "Downloading Update";
    })
});