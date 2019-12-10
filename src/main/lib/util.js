const fs = require('fs');
const path = require('path');
const hr = require('human-readable-bytes');

const i18next = require('i18next');
const LanguageDetector = require('i18next-electron-language-detector');
const SyncBackend = require('i18next-sync-fs-backend');

const cfg = {
  lng : 'fr',
  backend : {
    loadPath: path.resolve(__dirname, '../i18n/{{lng}}.json'),
  },
  initImmediate: false
};

i18next
  .use(SyncBackend)
  .use(LanguageDetector)
  .init(cfg);

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
  const parameters = Object.assign(params, { interpolation : { escapeValue : false } });
  return i18next.t(key, parameters);
}

exports.i18n = i18n;
exports.getFileStat = getFileStat;
