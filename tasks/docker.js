'use strict';
// gulp
var gulp = require('gulp');

// config
var paths = gulp.paths;
var dockerOpt = gulp.dockerOpt;

// plugins
var $ = require('gulp-load-plugins')();


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Docker TASKS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Docker Web - Build Image
gulp.task('build:docker', ['dist:web'], function () {
  var DEST_DIR = paths.dist;
  return gulp.src('docker/Dockerfile')
    .pipe($.cached('Dockerfile'))
    .pipe($.debug({title: 'docker :'}))
    .pipe(gulp.dest(DEST_DIR))
    .pipe($.shell(['docker build --rm -t ' + dockerOpt.namespace + '/' + dockerOpt.image + ' .'], {
      cwd: paths.dist,
      ignoreErrors: false
    }));
});

// Docker Web - Distribution (in ./dist folder)
gulp.task('dist:docker', ['build:docker'], function () {
  var DEST_DIR = paths.dist + '/docker-web';
  var DEST_TAR = dockerOpt.image + '.tar';
  return gulp.src('docker/README.md')
    .pipe(gulp.dest(DEST_DIR))
    .pipe($.shell(['docker save --output ' + DEST_TAR + ' ' + dockerOpt.namespace + '/' + dockerOpt.image], {
      cwd: DEST_DIR,
      ignoreErrors: false
    }));
});

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Release TASKS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Docker Web - Tag and Push Image (to Docker Registry)
gulp.task('release:docker', ['build:docker'], function () {
  // Config Tag
  var fs = require('fs');
  var packageJson = JSON.parse(fs.readFileSync('package.json'));
  var dockerLocalName = dockerOpt.namespace + '/' + dockerOpt.image;
  var dockerRegistryName = dockerOpt.registryHost + '/' + dockerOpt.image;
  var dockerVersion = packageJson.version;
  // Call Docker Cmd
  return gulp.src('Dockerfile', {read: false, cwd: paths.dist})
    .pipe($.shell(['docker tag -f ' + dockerLocalName + ' ' + dockerRegistryName + ':latest'], {cwd: paths.dist}))
    .pipe($.shell(['docker tag -f ' + dockerLocalName + ' ' + dockerRegistryName + ':' + dockerVersion], {cwd: paths.dist}))
    .pipe($.shell(['docker push ' + dockerRegistryName], {cwd: paths.dist, ignoreErrors: false}));
});


