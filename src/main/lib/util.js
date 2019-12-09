const fs = require('fs');
const path = require('path');
const hr = require('human-readable-bytes');
const _ = require('lodash');

// set up i18n
const LANG = 'fr';
_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;
const dictFile = fs.readFileSync(path.resolve(__dirname, '../i18n/',  `${LANG.toLowerCase()}.json`));
const dict = JSON.parse(dictFile);

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

// poor man's i18n function
function i18n(key, params = {}) {
  const tmpl = _.get(dict, key, key);
  return _.template(tmpl)(params);
}

exports.i18n = i18n;
exports.getFileStat = getFileStat;
