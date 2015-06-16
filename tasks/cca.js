'use strict';
// gulp
var gulp = require('gulp');


// config
var paths = gulp.paths;
var prod = gulp.prod;

// plugins
var $ = require('gulp-load-plugins')();

// packages
var path = require('path');

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chrome App Mobile Wrapper
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
var runCca = function (command, options, stream) {
    command = typeof command === 'string' ? [command] : command;
    options = options || {cwd: paths.buildCCA};
    var ccaBin = path.resolve('node_modules/cca/src/cca.js');
    var cmdLines = Array.prototype.map.call(command, function (elt) {
        return ccaBin + ' ' + elt;
    });
    console.log('Run CCA : ', cmdLines);
    // create new stream if not provided
    stream = stream || gulp.src('.', {read: false});
    return stream.pipe($.shell(cmdLines, options));
};


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
// Chrome App Mobile TASKS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// ChromeApp Mobile - Check Env configuration
gulp.task('cca:check', function () {
    return runCca('checkenv', {ignoreErrors: false});
});

// ChromeApp Mobile - Create Project
gulp.task('cca:create', ['build'], function () {
    var ccaAction = ' --link-to=';
    //var ccaAction = ' --copy-from=';
    return runCca([
        'checkenv',
        'create ' + paths.buildCCA + ccaAction + paths.buildVulcanized + '/manifest.json'
    ], {ignoreErrors: true});
});

// ChromeApp Mobile - Prepare for Build
gulp.task('cca:prepare', function () {
    return runCca('prepare');
    //return gulp.src('*', {read: false, cwd: paths.buildCCA})
    //    .pipe($.shell(['cca prepare'], {cwd: paths.buildCCA}));
});


// ChromeApp Mobile - Push to Mobile Device
gulp.task('cca:push', function () {
    return runCca('push --watch');
    //return gulp.src('*', {read: false, cwd: paths.buildCCA})
    //    .pipe($.shell(['cca push --watch'], {cwd: paths.buildCCA}));
});

// ChromeApp Mobile - Build (in ./build folder)
gulp.task('cca:build', ['cca:create'], function () {
    var releaseOpts = prod ? ' --release' : '';
    //return gulp.src('*', {read: false, cwd: paths.buildCCA})
    //    .pipe($.shell(['cca build' + releaseOpts], {cwd: paths.buildCCA}));
    return runCca('build android' + releaseOpts);
});

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Dist TASKS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~


// Chrome App Mobile - Distribution (in ./dist folder)
gulp.task('dist:cca', ['cca:build'], function (cb) {
    gulp.src('platforms/android/build/outputs/**/*.apk', {cwd: path.buildCCA})
        .pipe($.debug({title: 'android dist :'}))
        .pipe($.flatten())
        .pipe(gulp.dest(path.distCcaAndroid));
    //gulp.src('platforms/ios/*.xcodeproj', {cwd: path.buildCCA})
    //    .pipe($.debug({title: 'android dist :'}))
    //    .pipe(gulp.dest(path.distCcaIOS));
    cb();
});


