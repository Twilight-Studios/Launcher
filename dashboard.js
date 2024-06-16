// Retrieve games
// Populate dashboard
// Register logout click
// Register open clicks

const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.thumbnail').forEach(thumbnail => {
            thumbnail.addEventListener('mouseover', (event) => {
                const shadowColor = event.currentTarget.dataset.shadow;
                event.currentTarget.style.boxShadow = `0px 0px 30px 5px ${shadowColor}`;
            });

            thumbnail.addEventListener('mouseout', (event) => {
                event.currentTarget.style.boxShadow = 'none';
        });
    });

    document.querySelector('.grid').addEventListener("scroll", (event) => {
        if (document.querySelector('.grid').scrollTop !== 0)
            document.querySelector('.header').classList.add('color');
        else
            document.querySelector('.header').classList.remove('color');
    });

    document.getElementById("refresh").addEventListener("click", (event) => {
        ipcRenderer.send('refresh');
    });

    ipcRenderer.on('success-refresh', (event) => {
        document.querySelector('h1').textContent = "Success";
        document.querySelector('span').textContent = "Refreshed your access and catalog!";
        document.querySelector('.notification').classList.add('active');
        setTimeout(() => {
            document.querySelector('.notification').classList.remove('active');
        }, 3000);
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