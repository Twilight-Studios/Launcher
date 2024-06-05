const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const accessKey = document.getElementById('accesskey').value;
        
        const response = await ipcRenderer.invoke('login', { accessKey });

        if (response.success) {
            document.querySelector('h1').textContent = "Success";
            document.querySelector('span').textContent = "Logging you in...";
            document.querySelector('.notification').classList.add('active');
            setTimeout(() => {
                ipcRenderer.send('login-success');
            }, 1000);
        } else {
            document.querySelector('h1').textContent = "Failed";
            document.querySelector('span').textContent = response.message || "Something went wrong";
            document.querySelector('.notification').classList.add('active');
            setTimeout(() => {
                document.querySelector('.notification').classList.remove('active');
            }, 3000);
        }
    });

    ipcRenderer.on('fill-credentials', (event, { accessKey }) => {
        document.getElementById('accesskey').value = accessKey;
    });

    ipcRenderer.on('success-logout', (event) => {
        document.querySelector('h1').textContent = "Success";
        document.querySelector('span').textContent = "Logged out and uninstalled all games!";
        document.querySelector('.notification').classList.add('active');
        setTimeout(() => {
            document.querySelector('.notification').classList.remove('active');
        }, 2000);
    });
    
    ipcRenderer.on('lost-access', (event) => {
        document.querySelector('h1').textContent = "Uh-oh!";
        document.querySelector('span').textContent = "Your access has been revoked. You've been logged out!";
        document.querySelector('.notification').classList.add('active');
        setTimeout(() => {
            document.querySelector('.notification').classList.remove('active');
        }, 3000);
    });

    ipcRenderer.on('failed-to-validate', (event) => {
        document.querySelector('h1').textContent = "Failed";
        document.querySelector('span').textContent = "Access key cannot be authenticated";
        document.querySelector('.notification').classList.add('active');
        setTimeout(() => {
            document.querySelector('.notification').classList.remove('active');
        }, 3000);
    });
});