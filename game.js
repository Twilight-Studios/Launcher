const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById("home").addEventListener("click", (event) => {
        ipcRenderer.send('refresh', false);
    });

    document.getElementById("help").addEventListener("click", (event) => {
        window.open("https://github.com/Twilight-Studios"); // FIX TO PREVENT NAVIGATION
    });

    document.getElementById("logout").addEventListener("click", (event) => {
        document.getElementsByClassName('logout-popout')[0].classList.add('active');
    });

    document.getElementsByClassName('cancel')[0].addEventListener("click", (event) => {
        document.getElementsByClassName('logout-popout')[0].classList.remove('active');
    });

    document.getElementsByClassName('logout')[0].addEventListener("click", (event) => {
        document.getElementsByClassName('logout-popout')[0].classList.remove('active');
        document.querySelector('h1').textContent = "Logging Out";
        document.querySelector('span').textContent = "Clearing your session...";
        document.querySelector('.notification').classList.add('active');
        setTimeout(() => {
            ipcRenderer.send('logout');
        }, 1500);
    });
});