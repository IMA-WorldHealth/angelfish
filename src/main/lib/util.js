const fs = require('fs');
const path = require('path');
const hr = require('human-readable-bytes');

function convertToReadable(size) {
  return hr.default(size, 1024);
}

// runs a file through stat and collects relevant info
async function getFileStat(fpath) {
  const stat = await fs.promises.stat(fpath);
  stat.hrSize = convertToReadable(stat.size);
  stat.name = path.basename(fpath);
  return stat;
}

exports.getFileStat = getFileStat;
