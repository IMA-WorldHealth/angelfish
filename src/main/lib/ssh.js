const SSH = require('node-ssh');
const path = require('path');
const fs = require('fs');
const debug = require('debug')('angelfish:ssh');
const EventEmitter = require('events');
const { getFileStat, i18n } = require('./util');

const client = new SSH();

const pubsub = new EventEmitter();

function logger(i18nKey, params, isError = false) {
  const message = i18n(i18nKey, params);
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
    logger('SSH.CONNECT', { user : credentials.username, host : credentials.hostname });

    await client.connect({
      host: credentials.hostname,
      username: credentials.username,
      password : credentials.password,
    });

    logger('SSH.CONNECTED', { user : credentials.username, host : credentials.hostname });

    const remotePath = path.posix.join(credentials.remotebackupdir, '/', database);

    logger('SSH.LOOKUP_BACKUP', { remotePath });

    // get the latest file changed on the server
    const lastChangedFile = await client.exec(`cd ${remotePath}; ls -Art *.gz | tail -n 1`);

    logger('SSH.LAST_CHANGED', { lastChangedFile });

    const remoteFilePath = path.posix.join(remotePath, lastChangedFile);

    const localFileDir = path.join(credentials.localbackupdir, database);

    try {
      await fs.promises.access(localFileDir, fs.constants.F_OK);
      logger('SSH.LOCATED_DIR', { localFileDir });
    } catch (e) {
      logger('SSH.CREATING_DIR', { localFileDir });
      await fs.promises.mkdir(localFileDir, { recursive : true });
    }

    const localFilePath = path
      .join(credentials.localbackupdir, database, lastChangedFile)
      .replace(':', 'T');

    try {
      await fs.promises.access(localFilePath, fs.constants.F_OK);
      logger('SSH.LOCAL_FILE_EXISTS', { localFilePath });
    } catch (e) {
      logger('SSH.DOWNLOADING_FILE', { remoteFilePath });

      // download it to local directory
      await client.getFile(localFilePath, remoteFilePath);

      logger('SSH.DOWNLOADED_TO', { localFilePath });
    }



    return getFileStat(localFilePath);
  } catch (e) {
    logger('SSH.ERROR',  { error : e.toString() }, true);
    logger('SSH.ERROR_STACK',  { stack : e.stack }, true);
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

