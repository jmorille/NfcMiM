'use strict';
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();


// Help
require('gulp-task-list')(gulp);
var taskListing = require('gulp-task-listing');


// Cache
var cache = require('gulp-cached'),
//  remember = require('gulp-remember'),
    newer = require('gulp-newer'),
    changed = require('gulp-changed');

// Build
var del = require('del');
var vulcanize = require('gulp-vulcanize');
var crisper = require('gulp-crisper');

// Debug
var debug = require('gulp-debug');
//var sourcemaps = require('gulp-sourcemaps');

// Command line conf
var gutil = require('gulp-util'),
    prod = gulp.prod = gutil.env.prod;

// Browser reload
//var livereload = require('gulp-livereload');
//var filter = require('gulp-filter');
var browserSync = require('browser-sync');
var browserSyncReload = browserSync.reload;


// Notification
var notifier = require('node-notifier');


var notGlob = function (elt) {
    if (!elt) {
        return undefined;
    }
    if ('string' === typeof elt) {
        if ('!' === elt.slice(0, 1)) {
            return elt.slice(1);
        } else {
            return '!' + elt;
        }
    } else if (Array.isArray(elt)) {
        return elt.reduce(function (acc, current) {
            var notelt = notGlob(current);
            if (notelt) {
                acc = [].concat(acc, notelt);
            }
            return acc;
        }, []);
    }
};

var withNotGlob = function (include, excludes) {
    return [].concat.apply([], [].concat.call([], include, notGlob(excludes)));
};

var AUTOPREFIXER_BROWSERS = [
    'ie >= 10',
    'ie_mob >= 10',
    'ff >= 30',
    'chrome >= 34',
    'safari >= 7',
    'opera >= 23',
    'ios >= 7',
    'android >= 4.4',
    'bb >= 10'
];

// Config
var path = gulp.paths = {
    app: 'web',
    build: 'build',
    buildMap: 'build/maps',
    buildVulcanized: 'build/vulcanized',
    buildCCA: 'build/cca',
    buildCordova: 'build/cordova',
    dist: 'dist',
    distWeb: 'dist/web',
    distCa: 'dist/ca',
    distCcaAndroid: 'dist/cca_android',
    distCordovaAndroid: 'dist/cordova_android',
    distCcaIOS: 'dist/cca_ios',
    sources: ['elements/**/*.html', 'scripts/{,*/}*.js']
};


//bower_components: ['bower_components{,/**/*}', '!bower_components{,/**/package.json,/**/bower.json,/**/index.html,/**/metadata.html,/**/*.md,/**/demo*,/**/demo**/**,/**/test,/**/test/**}'],
var src = {
    bowerComponents: ['bower_components{,/**}'],
    images: ['**/*.{gif,jpg,jpeg,png}'],
    polymerElements: 'elements/**/*.{html,css,js}'
};

//TODO in module cf https://github.com/greypants/gulp-starter/tree/master/gulp/tasks

var dockerOpt = gulp.dockerOpt = {
    namespace: 'jmorille',
    image: 'nginx-webapp',
    registryHost: '178.255.97.203:5000'
};


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Load FOR 'gulp' Tasks
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
var requireDir = require('require-dir');
requireDir('./tasks');


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// DEFAULT FOR 'gulp' COMMAND
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
gulp.task('default', ['help']);

// Help like command gulp --tasks
gulp.task('help', ['task-list']);

// Add a task to render the output
gulp.task('help2', taskListing);


// Clean all files
gulp.task('clean', function (cb) {
    del([path.build, path.dist], cb); // Delete dist and build to allow for nice, clean files!
});

// CLean css file
gulp.task('clean:css', function (cb) {
    del(withNotGlob([path.app + '/**/*.css'], [path.app + '/' + src.bowerComponents]), cb);
});

// Build app
gulp.task('build', ['clean', 'build:vulcanize'], function (cb) {
    cb();
});


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Watch TASKS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var isErrorEatByWatch = false;


// Watch all files changes
gulp.task('watch', ['cp:watch', 'watch:images', 'watch:vulcanize'], function (cb) {
    console.log('watch isErrorEatByWatch before', isErrorEatByWatch);
    isErrorEatByWatch = true;
    console.log('watch isErrorEatByWatch after', isErrorEatByWatch);
    // livereload.listen();
    cb();
});


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Lint TASKS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Lint - the sources App
gulp.task('lint', function () {
    return gulp.src(path.sources, {cwd: path.app})
        .pipe(cache('appSrc'))
        .pipe($.jshint.extract('auto'))
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish'));
});

gulp.task('watch:lint', ['lint'], function (cb) {
    gulp.watch(path.sources, {cwd: path.app}, ['lint']);
    cb();
});


// Lint - the build script
gulp.task('lint:gulp', function () {
    return gulp.src('gulpfile.js')
        .pipe($.jshint())
        .pipe(cache('gulpfile'))
        .pipe($.jshint.reporter('jshint-stylish'));
});

gulp.task('watch:lint:gulp', ['lint:gulp'], function (cb) {
    gulp.watch('gulpfile.js', ['lint:gulp']);
    cb();
});


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Watch Error Notification
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var errorNotif = function (title) {
    title = title || 'Build Error';
    return function (err) {
        var path = require('path');
        notifier.notify({
            'title': title,
            'message': err.message,
            category: 'gulp watch',
            icon: path.join(__dirname, '../exclamation.png'),
            time: 5000, // How long to show balloons in ms
            wait: false, // if wait for notification to end
            sound: true
        });
        gutil.log(gutil.colors.red(err));
        this.emit('end');
    };
};

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Copy COMMAND to Generated
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var configCp = {
    cpGlob: withNotGlob(['**/**.*'], [src.bowerComponents, src.polymerElements, src.images]),
    imgGlob: withNotGlob([src.images], [src.bowerComponents])
};

// Copy - Internal
var cpFunc = function () {
    var DEST_DIR = path.buildVulcanized;
    var assets = $.useref.assets();
    return gulp.src(configCp.cpGlob, {cwd: path.app, base: path.app})
        .pipe(cache('cping', {optimizeMemory: true}))
        .pipe(changed(DEST_DIR))
        .pipe(debug({title: 'cp changed:'}))
        .pipe(assets)
        //   .pipe($.if('*.js', $.uglify()))
        //   .pipe($.if('*.css', cssChannel()))
        .pipe(assets.restore())
        .pipe($.useref())
        .pipe(gulp.dest(DEST_DIR));
        //.pipe(livereload());
    // .pipe(browserSyncReload({stream: true}));

};


// Copy - Build
gulp.task('build:cp', ['clean'], cpFunc);

// Copy - Task
gulp.task('cp', cpFunc);


// Copy - Watch for Copy files
gulp.task('cp:watch', ['cp'], function (cb) {
    gulp.watch(configCp.cpGlob, {cwd: path.app}, cpFunc)
        .on('change', browserSyncReload);
    cb();
});

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Images TASKS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// images - Internal
var imagesFunc = function (cb) {
    var DEST_DIR = path.buildVulcanized;
    return gulp.src(configCp.imgGlob, {cwd: path.app, base: path.app})
        // .pipe(cache('imaging'))
        .pipe(newer(DEST_DIR))
        .pipe(debug({title: 'img changed:'}))
        .pipe($.imagemin({
            progressive: true,
            interlaced: true
        }))
        .pipe(gulp.dest(DEST_DIR));
//        .pipe(livereload());
    // .pipe(browserSyncReload({stream: true}));
};


// Images Optimization - Build
gulp.task('build:images', ['clean'], imagesFunc);

// Images Optimization - Tasks
gulp.task('images', imagesFunc);


// Images Optimization - Watch for images copy
gulp.task('watch:images', ['images'], function (cb) {
    gulp.watch(configCp.imgGlob, {cwd: path.app}, imagesFunc)
        .on('change', browserSyncReload);
    cb();
});


/**
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * Vulcanize TASKS
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 */

// Vulcanize - Internal
var vulcanizeFunc = function (cb) {
    var DEST_DIR = path.buildVulcanized + '/elements/';
    console.log('Vulcanize isErrorEatByWatch = ', isErrorEatByWatch);
    gulp.src('elements/elements.html', {cwd: path.app, base: path.app})
        //.pipe(cache('vulcanizingDD')) // NOT WORKING BUT WHY ?
        .pipe($.if(isErrorEatByWatch, $.plumber({errorHandler: errorNotif('Vulcanize Error')})))
        .pipe(debug({title: 'vulcanize :'}))
        //  .pipe($.rename('elements.vulcanized.html'))
        //  abspath: path.app,
        .pipe(vulcanize({
            abspath: '',
            excludes: [],
            stripExcludes: false,
            inlineScripts: true,
            inlineCss: true
        }))
        .pipe($.crisper())
        .pipe($.debug({title: 'vulcanize crisper :'}))
        .pipe($.size())
        //      .pipe(debug({title: 'vulcanize htmlMinifier :'}))
        //      .pipe($.htmlMinifier({collapseWhitespace: true}))
        //      .pipe($.size() )
//        .pipe($.if('*.html', $.htmlMinifier({})))
        //       .pipe($.debug({title: 'vulcanize Save :'}))
        .pipe(gulp.dest(DEST_DIR))
    // .pipe(livereload())


    if (typeof cb === 'function') {
        cb();
    } else {
        console.log('--- cb not a function :', cb);
    }
    //  .pipe(browserSyncReload({stream: true}));
};


// Vulcanize - build
gulp.task('build:vulcanize', ['build:cp', 'build:images'], vulcanizeFunc);

// Vulcanize - Tasks
gulp.task('vulcanize', ['cp', 'images'], vulcanizeFunc);

// Vulcanize - Watch for html files
gulp.task('watch:vulcanize', ['vulcanize'], function (cb) {
    gulp.watch(src.polymerElements, {cwd: path.app}, vulcanizeFunc)
        .on('change', browserSyncReload);
    cb();
});


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Browsers TASKS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~


// Start CSS Injection Server. Options : --build
gulp.task('serve', ['watch'], function () {
    // browserSync Server
    // ------------------
    var srcApp = gutil.env.build ? path.buildVulcanized : path.app;
    // https://github.com/BrowserSync/gulp-browser-sync/issues/16#issuecomment-43597240
    browserSync({
        //browserSync.init({
        server: {
            baseDir: srcApp,
            logLevel: 'info'
        }
    });
});

gulp.task('serve2', ['watch'], function () {
    // browserSync Server
    // ------------------
    //browserSync({
    browserSync.init({
        notify: false,
        server: {
            baseDir: './web'
        }
    });
});
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Dist TASKS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// All Desktop 's Distribution in ./dist folder
gulp.task('dist', ['dist:web', 'dist:ca']);

// Mobile 's Distribution in ./dist folder
gulp.task('dist:mobile', ['dist:cca', 'dist:cordova']);

// Web 's Distribution in ./dist folder
gulp.task('dist:web', ['build'], function (cb) {
    var DEST_DIR = path.distWeb;
    var gzipOptions = {};
//  var gzipGlob = '**/*.{html,xml,json,css,js}';
    var gzipGlob = ['**/*.*'];
    gulp.src(gzipGlob, {cwd: path.buildVulcanized, base: path.buildVulcanized})
        .pipe(debug({title: 'web dist :'}))
//    .pipe($.rev())
//    .pipe($.revReplace())
        .pipe(gulp.dest(DEST_DIR))
        .pipe($.gzip(gzipOptions))
        .pipe(gulp.dest(DEST_DIR));
    //gulp.src(['**', notGlob(gzipGlob)], {cwd: path.buildVulcanized, base: path.buildVulcanized})
    //  .pipe(debug({title: 'web dist gzip :'}))
    //  .pipe($.gzip(gzipOptions))
    //  .pipe(gulp.dest(DEST_DIR));
    cb();
});

// ChromeApp - Distribution (in ./dist folder)
gulp.task('dist:ca', ['build'], function (cb) {
    var DEST_DIR = path.distCa;
    gulp.src(['**/*.*'], {cwd: path.buildVulcanized, base: path.buildVulcanized})
        .pipe(debug({title: 'ca dist :'}))
        .pipe($.if('**/manifest.json', $.replace(/"\/scripts\/ca_chromereload\.js",/g, '')))
        .pipe(gulp.dest(DEST_DIR))
        .pipe($.size({title: 'Uncompressed'}))
        .pipe($.zip('chromeapp.zip'))
        .pipe($.size({title: 'Zip Compressed'}))
        .pipe(gulp.dest(path.dist));
    cb();
});



