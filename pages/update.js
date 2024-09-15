const { ipcRenderer } = require('electron');
const localiser = require('../src/frontend/localiser');

ipcRenderer.on('update-found', (event) => {
    document.querySelector('h2').textContent = localiser.getLocalString("downloadingUpdate");
});

ipcRenderer.on('update-error', (event, errorMessage) => {
    document.querySelector('.loader').classList.remove('active');
    document.querySelector('i').classList.add('active');
    document.querySelector('h2').textContent = errorMessage;
});