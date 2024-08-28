let currentCallback = null;
let popout = null;
let primaryButton = null;
let cancelButton = null;
let extraContent = null;

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

    if (extraContent) extraContent.innerHTML = '';

    currentCallback = null;
    popout = null;
    primaryButton = null;
    cancelButton = null;
    extraContent = null;
}

exports.setup = function (popoutEl, primaryEl, cancelEl) {
    exports.clear();

    popout = popoutEl;
    primaryButton = primaryEl;
    cancelButton = cancelEl;
    extraContent = popoutEl.querySelector('.extra');

    primaryButton.addEventListener("click", () => {
        popout.classList.remove('active');

        let extraValue = null;

        let dropdown = extraContent.querySelector('select');
        if (dropdown != null) extraValue = dropdown.value;

        let input = extraContent.querySelector('input');
        if (input != null) extraValue = input.value;

        currentCallback(extraValue);
    });
    
    cancelButton.addEventListener("click", (event) => {
        popout.classList.remove('active');
    });
}

exports.activate = function (title, description, buttonText, buttonClass, successCallback, dropdownOptions=null, inputFieldPlaceholder=null) {
    if (!document.contains(popout)) {
        exports.clear();
        return;
    }

    if (!popout || !primaryButton || !cancelButton) return;
    if (popout.classList.contains("active")) return;

    currentCallback = successCallback;

    primaryButton.classList.remove(...primaryButton.classList);
    primaryButton.textContent = buttonText;
    primaryButton.classList.add('button');
    primaryButton.classList.add(buttonClass);

    popout.children[0].getElementsByTagName("h2")[0].textContent = title;
    popout.children[0].getElementsByTagName("p")[0].textContent = description;

    extraContent.innerHTML = '';

    if (dropdownOptions) {
        let selectEl = document.createElement('select');
        selectEl.classList.add('dropdown');
        selectEl = extraContent.appendChild(selectEl);

        dropdownOptions.forEach(option => {
            let optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.innerText = option.alias;
            optionEl.selected = option.selected;

            selectEl.appendChild(optionEl);
        });
    }
    
    if (inputFieldPlaceholder) {
        let inputEl = document.createElement('input');
        inputEl.classList.add('inputfield');
        inputEl.placeholder = inputFieldPlaceholder;
        extraContent.appendChild(inputEl);
    }

    popout.classList.add('active');
}