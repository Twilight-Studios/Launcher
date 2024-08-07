const { ipcRenderer } = require('electron');

ipcRenderer.on('update-found', (event) => {
    document.querySelector('h2').textContent = "Downloading Update";
});