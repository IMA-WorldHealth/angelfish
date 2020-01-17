const fs = require('fs');
const path = require('path');
const MySQLImporter= require('node-mysql-import');
const debug = require('debug')('angelfish:vfs');
const util = require('util');
const zlib = require('zlib');
const EventEmitter = require('events');
const { app } = require('electron');
const { getFileStat, i18n } = require('./util');
const { exec } = require('child_process');

const pubsub = new EventEmitter();

function logger(i18nKey, params, isError = false) {
  const message = i18n(i18nKey, params);
  debug(message);
  pubsub.emit('vfs.log', { message, timestamp: Date.now(), type: isError ? 'error' : 'info' });
}

// preprocess and gets absolute local path of database file(s)
function getLocalPath(params, database) {
  return path.join(params.localbackupdir, database);
}

/**
 * @function getLocalFileList
 *
 * @description
 * Pulls in a list of the local files stored on the system in the local
 */
async function getLocalFileList(params, database) {
  const db = getLocalPath(params, database);
  const paths = await fs.promises.readdir(db);
  const files = await Promise.all(paths.map(file => getFileStat(path.join(db, file))));
  return files;
}

/**
 * @function removeLocalBackup
 *
 * @description
 * Removes the local backup from the filesystem.
 */
async function removeLocalBackup(params, database, fname) {
  const directory = getLocalPath(params, database);
  const fullpath = path.join(directory, fname);
  logger('RM.START', { fullpath });
  await fs.promises.unlink(fullpath);
  logger('RM.END');
}


/**
 * @function gunzip
 *
 * @description
 * Async wrapper for zlib's gunzip that unzips the file
 * to a temporary directory.
 */
async function gunzip(fpath) {
  const tmpDir = app.getPath('temp');
  const baseName = path.basename(fpath).replace('.gz', '');

  const newFilePath = path.resolve(tmpDir, baseName);

  logger('UNZIP.CONVERTING', { fpath, newFilePath });

  // wrap the entire stream decompression in a promise and wait for its finish
  await new Promise((resolve, reject) => {
    logger('UNZIP.READ_INTO_MEMORY');

    const rejection = (err) => {
      logger('UNZIP.ERRORED', { message: err.message });
      reject(err);
    }

    fs.createReadStream(fpath)
      .on('error', rejection)
      .pipe(zlib.createGunzip())
      .on('error', rejection)
      .pipe(fs.createWriteStream(newFilePath))
      .on('error', rejection)
      .on('finish', () => resolve());
  });

  logger('UNZIP.FILE_WRITTEN', {newFilePath});

  return newFilePath;
}

async function build(params, database, fname) {
  logger('BUILD.START', { fname });

  const backuppath = getLocalPath(params, database);
  const dbpath = path.join(backuppath, fname);

  logger('BUILD.USING_PATH', { dbpath });
  logger('BUILD.UNZIPPING_PATH', { dbpath});

  const unzippedPath= await gunzip(dbpath);

  logger('BUILD.UNZIPPED_TO', { unzippedPath });

  const importer = await new MySQLImporter('localhost', 3306, params.mysqluser, params.mysqlpassword, database, unzippedPath);

  logger('BUILD.MYSQL_INIT', { user : params.mysqluser });

  await importer.init();

  logger('BUILD.MYSQL_CONNECT', { unzippedPath });
  await importer.dropDatabaseIfExists();
  logger('BUILD.MYSQL_DROP_DB', { database });
  await importer.createDatabaseIfDoesNotExist();
  logger('BUILD.MYSQL_CREATE_DB', { database });
  logger('BUILD.MYSQL_IMPORT_DB', { database});

  await importer.execute();

  logger('BUILD.END', { database });

  return true;
}

async function blank({installdir}) {
  const execp = util.promisify(exec);
  const env = {
    NODE_ENV : 'development',
    DB_NAME : 'blank',
  }
  await execp('bash sh/build-init-database.sh', { cwd : installdir, env });
  return true;
}

function addIPCHandlers(ipc, wc) {
  ipc.handle('vfs.list-local',
    (event, ...args) => getLocalFileList(...args));

  ipc.handle('vfs.rm-local',
    (event, ...args) => removeLocalBackup(...args));

  ipc.handle('vfs.build-local',
    (event, ...args) => build(...args));

  ipc.handle('vfs.build-blank',
    (event, ...args) => blank(...args));

  pubsub.on('vfs.log', (data) => {
    wc.send('vfs.log', data)
  });
}

exports.addIPCHandlers = addIPCHandlers;
