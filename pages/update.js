const { ipcRenderer } = require('electron');

ipcRenderer.on('update-found', (event) => {
    document.querySelector('h2').textContent = "Downloading Update";
});

ipcRenderer.on('update-error', (event, errorMessage) => {
    document.querySelector('.loader').classList.remove('active');
    document.querySelector('i').classList.add('active');
    document.querySelector('h2').textContent = `Error Occured: ${errorMessage}`;
});