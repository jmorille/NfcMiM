'use strict';
// gulp
var gulp = require('gulp');

// config
var paths = gulp.paths;

// plugins
var $ = require('gulp-load-plugins')();

// packages
var path = require('path');

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Cordova Wrapper
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
var runCordova = function (command, options, stream) {
    // allow to overwrite command from option.cordova with parameter
    command = typeof command === 'string' ? [command] : command;
    options = options || {cwd: paths.buildCordova};
    var cordovaBin = path.resolve('node_modules/cordova/bin/cordova');
    var cmdLines = Array.prototype.map.call(command, function (elt) {
        return cordovaBin + ' ' + elt;
    });
    console.log('Run cordova : ', cmdLines);
    // create new stream if not provided
    stream = stream || gulp.src('.', {read: false});
    return stream.pipe($.shell(cmdLines, options));
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Cordova App Mobile TASKS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Cordova Mobile - Create Project
gulp.task('cordova:create', ['build'], function () {
    var ccaAction = ' --link-to=';
    //var ccaAction = ' --copy-from=';
    var cmd = 'create ' + paths.buildCordova + ccaAction + paths.buildVulcanized;
    return runCordova(cmd, {ignoreErrors: true});
});

// Cordova Mobile - Config Project
gulp.task('cordova:config', ['cordova:create'], function () {
    var configPlateform = 'android';
    var cmd = 'platform add ' + configPlateform;
    return runCordova(cmd);
});


// Cordova Mobile - Build (in ./build folder)
gulp.task('cordova:build', ['cordova:config'], function () {
    var releaseOpts = gulp.prod ? ' --release' : '';
    var cmd = 'build android ' + releaseOpts;
    return runCordova(cmd);
});

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Dist TASKS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~


// Cordova Mobile - Distribution (in ./dist folder)
gulp.task('dist:cordova', ['cordova:build'], function (cb) {
    gulp.src('platforms/android/ant-build/**/*.apk', {cwd: paths.buildCordova})
        .pipe($.debug({title: 'android dist :'}))
        .pipe($.flatten())
        .pipe(gulp.dest(paths.distCordovaAndroid));
    //gulp.src('platforms/ios/*.xcodeproj', {cwd: path.buildCordova})
    //  .pipe(debug({title: 'android dist :'}))
    //  .pipe(gulp.dest(path.distCcaIOS));
    cb();
});

