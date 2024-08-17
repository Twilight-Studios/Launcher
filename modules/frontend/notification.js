const { Notification } = require("electron");
const path = require("path");

let activateNotifications = 0;

exports.notify = function (notificationObject, title, description, length, notifyOs, onEndCallback) {
    if (!notificationObject) notificationObject = document.querySelector('.notification');

    notificationObject.querySelector('#noti-title').textContent = title;
    notificationObject.querySelector('#noti-desc').textContent = description;
    notificationObject.classList.add('active');
    activateNotifications++;

    setTimeout(() => {

        let stillExists = document.contains(notificationObject) != null;
        if (!stillExists) return; // Assume that the page has changed and JS callbacks are no longer valid.

        activateNotifications--;
        if (activateNotifications == 0) { notificationObject.classList.remove('active'); }

        if (onEndCallback) onEndCallback();

    }, length);

    if (notifyOs) new Notification({ title: title, body: description, icon: path.join(__dirname, 'resources/logo.ico') }).show();
}