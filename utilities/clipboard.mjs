import clipboardy from 'clipboardy';
import isWsl from 'is-wsl';
import childProcess from 'node:child_process';

/**
 * clipboardy performance is terrible in a WSL shell,
 * so we use Windows's API directly in that case.
 */
export function write(data) {
    if (!isWsl) {
        return clipboardy.write(data);
    }

    return new Promise((resolve, reject) => {
        const child = childProcess.exec(`echo -n '${data}' | clip.exe`);
        child.on('close', (code, sig) => {
            if (code === 0) {
                resolve();
            } else {
                reject(sig);
            }
        });
    });
}

export function read() {
    if (!isWsl) {
        return clipboardy.readSync();
    }

    const child = childProcess.execSync('powershell.exe -c Get-Clipboard');

    return child.toString('utf-8');
}
