const fs = require('fs');
const path = require('path');
const lzma = require('lzma-native');
const MySQLImporter= require('node-mysql-import');
const debug = require('debug')('angelfish:vfs');
const EventEmitter = require('events');
const { app } = require('electron');
const { getFileStat } = require('./util');

const pubsub = new EventEmitter();

function logger(message, isError = false) {
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
  logger(`rm: removing ${fullpath}.`);
  await fs.promises.unlink(fullpath);
  logger(`rm: done.`);
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

  logger(`unzip: Parsing ${fpath} into ${newFilePath}`);

  logger('unzip: Reading file into memory from the disk.');
  const input = await fs.promises.readFile(fpath);
  logger('unzip: File read into memory.');
  logger('unzip: Decompressing file with LZMA algorithm.');
  const output = await lzma.decompress(input);
  logger('unzip: File decompressed.  Writing decompressed output to disk.');
  await fs.promises.writeFile(newFilePath, output, 'utf8');
  logger(`unzip: File written to ${newFilePath}`);

  return newFilePath;
}

async function build(params, database, fname) {
  logger(`build: Starting build of ${fname}`);

  const backuppath = getLocalPath(params, database);
  const dbpath = path.join(backuppath, fname);

  logger(`build: Using ${dbpath} for build.`);
  logger(`build: Unzipping ${dbpath}.`);

  const unzippedPath= await unxz(dbpath);

  logger(`build: Done. Unzipped to ${unzippedPath}.`);

  const importer = await new MySQLImporter('localhost', 3306, params.mysqluser, params.mysqlpassword, database, unzippedPath);

  logger(`build: Created new MySQL importer with username ${params.mysqluser}`);

  await importer.init();

  logger(`build: Connected to MySQL.  Reading file from ${unzippedPath}`);

  await importer.dropDatabaseIfExists();
  logger(`build: Dropped database ${database}.`);
  await importer.createDatabaseIfDoesNotExist();
  logger(`build: Created database ${database}.`);
  logger(`build: Importing database ${database}.  This may take a while...`);
  await importer.execute();
  logger(`build: Imported ${database} successfully!`);

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
