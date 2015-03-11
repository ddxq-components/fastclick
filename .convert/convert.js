'use strict';

var co = require('co');
var request = require('cogent');
var write = require('write-to');
var rimraf = require('rimraf');
var decompress = require('decompress');
var mkdirp = require('mkdirp');
var fs = require('graceful-fs');
var path = require('path');
var config = require('./config');

process.on('exit', function () {
  rimraf.sync(getTmpPath());
});

function getTmpPath(args) {
  args = [].slice.call(arguments);
  args.unshift(config.target, 'tmp');
  return path.resolve.apply(path, args);
}

// fetch and extract
function* fetch(repo, ref, target) {
  target = path.resolve(target);

  var archive = path.resolve(target, ref + '.tar.gz');
  var res = yield* request('https://codeload.github.com/' + repo + '/tar.gz/' + ref);
  if (res.statusCode !== 200) {
    res.destroy();
    throw new Error('error fetching archive ' + repo + '@' + ref);
  }

  yield write(res, archive);
  yield function (done) {
    var reader = fs.createReadStream(archive).on('error', cb);
    var writer = reader.pipe(decompress({
      ext: '.tar.gz',
      path: target,
      strip: 1,
    })).on('error', cb).on('close', cb);

    function cb(err) {
      reader.removeListener('error', cb);
      writer.removeListener('error', cb);
      writer.removeListener('close', cb);
      done(err);
    }
  };
}

function copy(fileMap, from, to) {
  var files = Object.keys(fileMap);
  files.forEach(function (f) {
    var target = path.resolve(to, f);
    mkdirp.sync(path.dirname(target));
    fs.createReadStream(path.resolve(from, fileMap[f]))
      .pipe(fs.createWriteStream(target));
  });
}

co(function* () {
  yield* fetch(config.orgiRepo, config.ref, getTmpPath());

  // generate component.json and copy files
  var manifest = {};
  var files = {}, target;
  var meta = JSON.parse(fs.readFileSync(getTmpPath('package.json')));
  manifest.version = meta.version;
  Object.keys(config).forEach(function (k) {
    switch (k) {
    case 'name':
    case 'repo':
    case 'keywords':
    case 'description':
      manifest[k] = config[k];
      break;
    case 'main':
      manifest[k] = Object.keys(config[k])[0];
      copy(config[k], getTmpPath(), config.target);
      break;
    case 'scripts':
    case 'styles':
    case 'json':
    case 'images':
    case 'templates':
    case 'fonts':
    case 'files':
      manifest[k] = Object.keys(config[k]);
      copy(config[k], getTmpPath(), config.target);
      break;
    }
  });

  yield fs.writeFile.bind(null, 'component.json',
    JSON.stringify(manifest, null, '  '));
})();