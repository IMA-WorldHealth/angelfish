const SSH = require('node-ssh');
const path = require('path');
const debug = require('debug')('angelfish:ssh');
const EventEmitter = require('events');
const { getFileStat } = require('./util');

const client = new SSH();

const pubsub = new EventEmitter();

function logger(message, isError = false) {
  debug(message);
  pubsub.emit('ssh.log', { message, type: isError ? 'error' : 'info' });
}

/**
 * @function copy
 *
 * @description
 * Fetches the database file using SSH over the network.
 */
async function copy(credentials, database) {
  try {
    logger('Connecting to remote SSH instance...');

    await client.connect({
      host: credentials.hostname,
      username: credentials.username,
      password : credentials.password,
    });

    const remotePath = path.join(credentials.remotebackupdir, '/', database);

    logger(`Looking up most recent file in ${remotePath}.`);

    // get the latest file changed on the server
    const lastChangedFile = await client.exec(`cd ${remotePath}; ls -Art *.xz | tail -n 1`);

    logger(`Most recent file is: ${lastChangedFile}`);

    const remoteFilePath = path.join(remotePath, lastChangedFile);
    const localFilePath = path.join(credentials.localbackupdir, database, lastChangedFile);

    logger(`Path is: ${remoteFilePath}`);
    logger(`Downloading ${remoteFilePath}`);

    // download it to local directory
    await client.getFile(localFilePath, remoteFilePath);

    logger(`Downloaded to ${localFilePath}`);

    return getFileStat(localFilePath);
  } catch (e) {
    logger(`An error occurred! It is ${e.toString()}`, true);
    logger(`Full stack: ${e.stack}`, true);
  }

  return '';
}

/**
 * Adds the ssh handlers to the main IPC process.
 */
function addIPCHandlers(ipc, wc) {
  // handle the ssh copy method
  ipc.handle('ssh.copy', (event, ...args) => copy(...args));

  pubsub.on('ssh.log', (data) => {
    wc.send('ssh.log', data)
  });
}

exports.addIPCHandlers = addIPCHandlers;

