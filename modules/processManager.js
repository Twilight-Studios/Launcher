// MODULE IMPORTS
// --------------------------------------------------------------------------------------

const { exec, execSync, spawn } = require('child_process');
const os = require('os');
const { readJson, getGamePath, getGameLaunchJsonPath } = require('./fileManager');
const windowManager = require('./windowManager');

// --------------------------------------------------------------------------------------

// GLOBAL VARIABLES
// --------------------------------------------------------------------------------------

let coreGameProcess = null;
let coreGameProcessPID = null;

// --------------------------------------------------------------------------------------

// COMMAND EXECUTION
// --------------------------------------------------------------------------------------

exports.executeCommand = function (command, critical, commandDir, callback) {
    execSync(command, { cwd: commandDir ``}, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            if (critical) { return callback(new Error(`Critical command failed: ${command}`)); }
        }
        callback(null);
    });
}

exports.runCommands = function (commandsArray, commandDir, callback) {
    for (let i = 0; i < commandsArray.length; i++) {
        executeCommand(commandsArray[i].command, commandsArray[i].critical, commandDir, (err) => {
            if (err) { return callback(err); }
        });
    }
    callback(null);
}

// --------------------------------------------------------------------------------------

// GAME LAUNCHING
// --------------------------------------------------------------------------------------

exports.launchGame = function (game) {
    let launchJson = readJson(getGameLaunchJsonPath(game));

    if (launchJson === null) {
        windowManager.sendMessage('launch-error', game.id, game.branch, "launcher.json is missing from the game build!");
        return;
    }

    try {
        let coreExecCommand = launchJson.core_exec_command;
        let relativeDependencyCommands = launchJson.relative_dependency_commands;
        let systemDependencyCommands = launchJson.system_dependency_commands;

        const userRoot = process.env.HOME || process.env.USERPROFILE;
        const gameFolder = getGamePath(game);

        if (systemDependencyCommands.length !== 0) {
            windowManager.sendMessage('launch-progress', game.id, game.branch, "Executing System Dependency Commands");

            exports.runCommands(systemDependencyCommands, userRoot, (err) => {
                if (err) {
                    windowManager.sendMessage('launch-error', game.id, game.branch, `Failed to execute system dependencies: ${err.message}`);
                    return;
                }
            });
        }

        if (relativeDependencyCommands.length !== 0) {
            windowManager.sendMessage('launch-progress', game.id, game.branch, "Executing Relative Dependency Commands");

            exports.runCommands(relativeDependencyCommands, gameFolder, (err) => {
                if (err) {
                    windowManager.sendMessage('launch-error', game.id, game.branch, `Failed to execute relative dependencies: ${err.message}`);
                    return;
                }
            });
        }

        windowManager.sendMessage('play-start', game.id, game.branch);

        coreGameProcess = spawn(coreExecCommand, { cwd: gameFolder, shell: true });
        coreGameProcessPID = coreGameProcess.pid;

        coreGameProcess.on('close', (code) => {
            coreGameProcess = null;
            coreGameProcessPID = null; 
            if (code === 0) { windowManager.sendMessage('play-finished', game.id, game.branch); } 
            else if (code === 1) { } // FORCE STOPPED
            else { windowManager.sendMessage('launch-error', game.id, game.branch, `Game exited with code: ${code}`) }
        });

        coreGameProcess.on('error', (err) => {
            windowManager.sendMessage('launch-error', game.id, game.branch, `Failed to launch core game: ${err.message}`);
            coreGameProcess = null;
            coreGameProcessPID = null;
        });

    } 
    catch (err) { windowManager.sendMessage('launch-error', game.id, game.branch, err.message); }
};

// --------------------------------------------------------------------------------------

// GAME STOPPING
// --------------------------------------------------------------------------------------

exports.stopGame = function (game=null) {
    if (coreGameProcessPID !== null) {
        if (game) { windowManager.sendMessage('stop-start', game.id, game.branch);}
        try {
            if (os.platform() === 'win32') {
                exec(`taskkill /PID ${coreGameProcessPID} /T /F`, (err) => {
                    if (err && game) {
                        windowManager.sendMessage('stop-error', game.id, game.branch, err.message);
                    } 
                    else if (game) {
                        windowManager.sendMessage('play-finished', game.id, game.branch);
                    }
                });
            } else {
                try {
                    process.kill(coreGameProcessPID, 0);
                    process.kill(coreGameProcessPID, 'SIGKILL');
                    if (game) windowManager.sendMessage('play-finished', game.id, game.branch);

                } catch (err) {
                    if (game) windowManager.sendMessage('stop-error', game.id, game.branch, err.message);
                }
            }
        } catch (err) {
           if (game) windowManager.sendMessage('stop-error', game.id, game.branch, err.message);
        }

        coreGameProcess = null;
        coreGameProcessPID = null;
    }
}

// --------------------------------------------------------------------------------------