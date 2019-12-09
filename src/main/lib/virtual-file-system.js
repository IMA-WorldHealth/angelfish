const fs = require('fs');
const path = require('path');
const lzma = require('lzma-native');
const MySQLImporter= require('node-mysql-import');
const debug = require('debug')('angelfish:vfs');
const EventEmitter = require('events');
const { app } = require('electron');
const { getFileStat, i18n } = require('./util');

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
 * @function unxz
 *
 * @description
 * Async wrapper for lzma.decompress() that unzips the file
 * to a temporary directory.
 */
async function unxz(fpath) {
  const tmpDir = app.getPath('temp');
  const baseName = path.basename(fpath).replace('.xz', '');

  const newFilePath = path.resolve(tmpDir, baseName);

  logger('UNZIP.CONVERTING', { fpath, newFilePath });

  const input = await fs.promises.readFile(fpath);

  logger('UNZIP.READ_INTO_MEMORY');
  logger('UNZIP.DECOMPRESS_FILE');

  const output = await lzma.decompress(input);

  logger('UNZIP.DECOMPRESS_WRITE');

  await fs.promises.writeFile(newFilePath, output, 'utf8');

  logger('UNZIP.FILE_WRITTEN', {newFilePath});

  return newFilePath;
}

async function build(params, database, fname) {
  logger('BUILD.START', { fname });

  const backuppath = getLocalPath(params, database);
  const dbpath = path.join(backuppath, fname);

  logger('BUILD.USING_PATH', { dbpath });
  logger('BUILD.UNZIPPING_PATH', { dbpath});

  const unzippedPath= await unxz(dbpath);

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

function addIPCHandlers(ipc, wc) {
  ipc.handle('vfs.list-local',
    (event, ...args) => getLocalFileList(...args));

  ipc.handle('vfs.rm-local',
    (event, ...args) => removeLocalBackup(...args));

  ipc.handle('vfs.build-local',
    (event, ...args) => build(...args));

  pubsub.on('vfs.log', (data) => {
    wc.send('vfs.log', data)
  });
}

exports.addIPCHandlers = addIPCHandlers;
