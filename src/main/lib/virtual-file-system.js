const fs = require('fs');
const path = require('path');
const lzma = require('lzma-native');
const MySQLImporter= require('node-mysql-import');
const debug = require('debug')('angelfish:vfs');
const { app } = require('electron');
const { getFileStat } = require('./util');

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
  await fs.promises.unlink(fullpath);
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

  debug(`Parsing ${fpath} into ${newFilePath}`);

  const input = await fs.promises.readFile(fpath);
  debug('File read from disk');
  const output = await lzma.decompress(input);
  debug('File decompressed');
  await fs.promises.writeFile(newFilePath, output, 'utf8');
  debug(`File written to ${newFilePath}`);

  return newFilePath;
}

async function build(params, database, fname) {
  debug('Called build() on', database);

  const backuppath = getLocalPath(params, database);
  const dbpath = path.join(backuppath, fname);

  const unzippedPath= await unxz(dbpath);

  debug('Unzipped to', unzippedPath);

  const importer = await new MySQLImporter('localhost', 3306, params.mysqluser, params.mysqlpassword, database, unzippedPath);

  // const sql = await fs.promises.readFile(unzippedPath);
  await importer.init();

  debug(`Connected to MySQL.  Reading file from ${unzippedPath}`);

  await importer.dropDatabaseIfExists();
  await importer.createDatabaseIfDoesNotExist();
  await importer.execute();

  debug(`Imported successfully`);

  return true;
}

function addIPCHandlers(ipc) {
  ipc.handle('vfs.list-local',
    (event, ...args) => getLocalFileList(...args));

  ipc.handle('vfs.rm-local',
    (event, ...args) => removeLocalBackup(...args));

  ipc.handle('vfs.build-local',
    (event, ...args) => build(...args));
}

exports.addIPCHandlers = addIPCHandlers;
