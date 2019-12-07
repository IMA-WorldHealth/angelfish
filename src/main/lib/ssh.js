const SSH = require('node-ssh');
const path = require('path');
const debug = require('debug')('angelfish:ssh');
const { getFileStat } = require('./util');

const client = new SSH();

/**
 * @function copy
 *
 * @description
 * Fetches the database file using SSH over the network.
 */
async function copy(credentials, database) {
  try {
    debug('Connecting to remove SSH instance...');

    await client.connect({
      host: credentials.hostname,
      username: credentials.username,
      password : credentials.password,
    });

    const remotePath = path.join(credentials.remotebackupdir, '/', database);

    debug(`Looking up latest file in ${remotePath}.`);

    // get the latest file changed on the server
    const lastChangedFile = await client.exec(`cd ${remotePath}; ls -Art *.xz | tail -n 1`);

    debug(`Found: ${lastChangedFile}`);

    const remoteFilePath = path.join(remotePath, lastChangedFile);
    const localFilePath = path.join(credentials.localbackupdir, database, lastChangedFile);

    debug(`Path is: ${remoteFilePath}`);

    // download it to local directory
    await client.getFile(localFilePath, remoteFilePath);

    debug(`Downloaded to ${localFilePath}`);

    return getFileStat(localFilePath);
  } catch (e) {
    debug('Something went wrong');
    debug(e);
  }

  return '';
}

/**
 * Adds the ssh handlers to the main IPC process.
 */
function addIPCHandlers(ipc) {

  // handle the ssh copy method
  ipc.handle('ssh.copy', (event, ...args) => copy(...args));
}

exports.addIPCHandlers = addIPCHandlers;

