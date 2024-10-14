const { ipcRenderer } = require('electron');

let argumentsList = [];

window.addEventListener('DOMContentLoaded', () => {
    const output = document.getElementById('output');
    const modeSelector = document.getElementById('ipc-mode');
    const invokeSelector = document.getElementById('ipc-invoke');
    const methodInput = document.getElementById('method');
    const argValueInput = document.getElementById('arg-value');
    const argumentsListDiv = document.getElementById('arguments-list');
    const addArgumentButton = document.getElementById('add-argument');
    const sendButton = document.getElementById('send');
    const clearButton = document.getElementById('clear');
    
    function printToConsole(message, isError = false) {
        const div = document.createElement('div');
        div.textContent = message;
        if (isError) {
            div.style.color = 'red';
        }
        output.appendChild(div);
        output.scrollTop = output.scrollHeight;
    }
    
    clearButton.addEventListener('click', () => {
        output.innerHTML = '';
        argumentsList = [];
        argumentsListDiv.innerHTML = '';
    });
    
    addArgumentButton.addEventListener('click', () => {
        const value = argValueInput.value.trim();
        
        if (value) {
            let parsedValue;
    
            try {
                parsedValue = JSON.parse(value);
            } catch (e) {
                parsedValue = value;
            }
    
            argumentsList.push(parsedValue);
            printToConsole(`Added argument: ${JSON.stringify(parsedValue)}`);
            argValueInput.value = '';
    
            const listItem = document.createElement('div');
            listItem.textContent = JSON.stringify(parsedValue);
            argumentsListDiv.appendChild(listItem);
        } else {
            printToConsole('Please enter a valid argument.', true);
        }
    });
    
    sendButton.addEventListener('click', () => {
        const method = methodInput.value.trim();
        if (!method) {
            printToConsole('Please specify a method name.', true);
            return;
        }
    
        const mode = modeSelector.value;
        const invokeType = invokeSelector.value;
    
        if (mode === 'ipcMain') {
            if (invokeType === 'invoke') {
                ipcRenderer.invoke(method, ...argumentsList)
                    .then(response => {
                        printToConsole(`Response from ipcMain: ${JSON.stringify(response)}`);
                    })
                    .catch(error => {
                        printToConsole(`Error from ipcMain: ${error.message}`, true);
                    });
            } else {
                ipcRenderer.send(method, ...argumentsList);
                printToConsole(`Sent to ipcMain: ${method} with arguments ${JSON.stringify(argumentsList)}`);
            }
        } else {
            ipcRenderer.send('reflect', method, ...argumentsList);
            printToConsole(`Sent to ipcRenderer (via reflect): ${method} with arguments ${JSON.stringify(argumentsList)}`);
        }
    
        argumentsList = [];
        argumentsListDiv.innerHTML = '';
    });
    
});