let currentCallback = null;
let popout = null;
let primaryButton = null;
let cancelButton = null;

exports.clear = () => {
    if (primaryButton) {
        let old_element = primaryButton;
        let new_element = old_element.cloneNode(true);
        old_element.parentNode.replaceChild(new_element, old_element);
    }

    if (cancelButton) {
        let old_element = cancelButton;
        let new_element = old_element.cloneNode(true);
        old_element.parentNode.replaceChild(new_element, old_element);
    }

    currentCallback = null;
    popout = null;
    primaryButton = null;
    cancelButton = null;
}

exports.setup = function (popoutEl, primaryEl, cancelEl) {
    exports.clear();

    popout = popoutEl;
    primaryButton = primaryEl;
    cancelButton = cancelEl;

    primaryButton.addEventListener("click", () => {
        popout.classList.remove('active');
        currentCallback();
    });
    
    cancelButton.addEventListener("click", (event) => {
        popout.classList.remove('active');
    });
}

exports.activate = function (title, description, buttonText, buttonClass, successCallback) {
    if (!document.contains(popout)) {
        exports.clear();
        return;
    }

    if (!popout || !primaryButton || !cancelButton) return;
    if (popout.classList.contains("active")) return;

    currentCallback = successCallback;

    primaryButton.classList.remove(buttonClass);
    primaryButton.textContent = buttonText;
    currentClass = buttonClass;
    primaryButton.classList.add(buttonClass);

    popout.children[0].getElementsByTagName("h2")[0].textContent = title;
    popout.children[0].getElementsByTagName("p")[0].textContent = description;

    popout.classList.add('active');
}