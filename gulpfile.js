'use strict';
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();


// Help
require('gulp-task-list')(gulp);
var taskListing = require('gulp-task-listing');

// Lint
//var jshint = require('gulp-jshint');
//var stylish = require('jshint-stylish');

// Cache
var cache = require('gulp-cached'),
//  remember = require('gulp-remember'),
    newer = require('gulp-newer'),
    changed = require('gulp-changed');

// Build
var del = require('del');
//var runSequence = require('run-sequence');
//var usemin = require('gulp-usemin');
//var imagemin = require('gulp-imagemin');
//var sass = require('gulp-sass');
//var autoprefixer = require('gulp-autoprefixer');
var vulcanize = require('gulp-vulcanize');
var crisper = require('gulp-crisper');

// Debug
var debug = require('gulp-debug');
//var sourcemaps = require('gulp-sourcemaps');

// Command line conf
var gutil = require('gulp-util'),
    prod = gulp.prod = gutil.env.prod;

// Browser reload
var livereload = require('gulp-livereload');
//var filter = require('gulp-filter');
var browserSync = require('browser-sync');
var browserSyncReload = browserSync.reload;

//var source = require('vinyl-source-stream');
//var buffer = require('vinyl-buffer');

// Mobile
//var shell = require('gulp-shell');

// Dist Packaging
//var gzip = require('gulp-gzip');
//var zip = require('gulp-zip');

//var rev = require('gulp-rev');
//var revReplace = require('gulp-rev-replace');

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
    sass: 'sass',
    build: 'build',
    buildSass: 'build/sass',
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
    sass: ['**/*.{scss,sass}', '!includes/**/*.*'],
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
requireDir('./gulp_tasks');


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
gulp.task('watch', ['watch:sass', 'cp:watch', 'watch:images', 'watch:vulcanize'], function (cb) {
    console.log('watch isErrorEatByWatch before', isErrorEatByWatch);
    isErrorEatByWatch = true;
    console.log('watch isErrorEatByWatch after', isErrorEatByWatch);
    livereload.listen();
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
    cpGlob: withNotGlob(['**/**.*'], [src.sass, src.bowerComponents, src.polymerElements, src.images]),
    imgGlob: withNotGlob([src.images], [src.bowerComponents])
};

// Copy - Internal
var cpFunc = function () {
    var DEST_DIR = path.buildSass;
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
        .pipe(gulp.dest(DEST_DIR))
        .pipe(gulp.dest(path.buildVulcanized))
        .pipe(livereload());
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
        .pipe(gulp.dest(DEST_DIR))
        .pipe(livereload());
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


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Saas TASKS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Sass - Internal
var sassFunc = function () {
    var DEST_DIR = path.app;
    var SASS_OPTS = {
        includePaths: [
            'sass/includes'
        ],
        errLogToConsole: false,
        sourceComments: !prod,
        outputStyle: prod ? 'compressed' : 'expanded'
    };
    return gulp.src(src.sass, {cwd: path.sass, base: path.sass})
        .pipe(cache('sassing'))
        .pipe(changed(DEST_DIR, {extension: '.css'}))
        .pipe($.if(isErrorEatByWatch, $.plumber({errorHandler: errorNotif('Vulcanize Error')})))
        .pipe(debug({title: 'sass changed:'}))
        .pipe($.sourcemaps.init())
        .pipe($.sass(SASS_OPTS))
        // Pass the compiled sass through the prefixer with defined
        .pipe($.autoprefixer({
            browsers: AUTOPREFIXER_BROWSERS,
            cascade: !prod
        }))
        .pipe($.if('*.css', $.cssmin()))
        .pipe($.sourcemaps.write('../' + path.buildMap, {
            includeContent: true
        }))
        .pipe(gulp.dest(DEST_DIR))
        .pipe(livereload())
        .pipe(browserSyncReload({stream: true}));
};


// Sass - Build
gulp.task('build:sass', ['clean'], sassFunc);

// Sass - Task
gulp.task('sass', sassFunc);

// Sass - Watch for Sass generation
gulp.task('watch:sass', ['sass'], function (cb) {
    gulp.watch(src.sass, {cwd: path.sass}, sassFunc);
    cb();
});

/**
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * Vulcanize TASKS
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 */

// Vulcanize - Internal
var vulcanizeFunc = function (cb) {
    var DEST_DIR = path.buildVulcanized+'/elements/' ;
    console.log('Vulcanize isErrorEatByWatch = ', isErrorEatByWatch);
    return gulp.src('elements/elements.html', {cwd: path.app, base: path.app})
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
        .pipe($.size() )
  //      .pipe(debug({title: 'vulcanize htmlMinifier :'}))
  //      .pipe($.htmlMinifier({collapseWhitespace: true}))
  //      .pipe($.size() )
//        .pipe($.if('*.html', $.htmlMinifier({})))
 //       .pipe($.debug({title: 'vulcanize Save :'}))
        .pipe(gulp.dest(DEST_DIR))
        .pipe(livereload());
    //  .pipe(browserSyncReload({stream: true}));
};


// Vulcanize - build
gulp.task('build:vulcanize', ['build:sass', 'build:cp', 'build:images'], vulcanizeFunc);

// Vulcanize - Tasks
gulp.task('vulcanize', ['sass', 'cp', 'images'], vulcanizeFunc);

// Vulcanize - Watch for html files
gulp.task('watch:vulcanize', ['vulcanize'], function (cb) {
    gulp.watch(src.polymerElements, {cwd: path.app}, vulcanizeFunc)
        .on('change', browserSyncReload);
    cb();
});

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//  Chrome App TASKS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Browserify TASKS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~

//var bundler = watchify(browserify('./src/index.js', watchify.args));
//// add any other browserify options or transforms here
//bundler.transform('brfs');
//
//gulp.task('js', bundle); // so you can run `gulp js` to build the file
//bundler.on('update', bundle); // on any dep update, runs the bundler
//
//function bundle() {
//  return bundler.bundle()
//    // log errors if they happen
//    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
//    .pipe(source('bundle.js'))
//    // optional, remove if you dont want sourcemaps
//    .pipe(buffer())
//    .pipe(sourcemaps.init({loadMaps: true})) // loads map from browserify file
//    .pipe(sourcemaps.write('./')) // writes .map file
//    //
//    .pipe(gulp.dest('./dist'));
//}
//


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Browsers TASKS
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
var server = {
    httpHost: 'localhost',
    httpPort: '9000',
    httpsHost: 'localhost',
    httpsPort: '9001'
};

// Server Livereload - Test
gulp.task('connect2', function () {
    var srcApp = gutil.env.build ? path.buildVulcanized : path.app;
    var connect = require('gulp-connect');
    // var cros = require('connect-cors');
    connect.server({
        root: srcApp,
        port: 9000,
        middleware: function (connect, o) {
            return [
                (function () {
                    var url = require('url');
                    var proxy = require('proxy-middleware');
                    var options = url.parse('http://localhost:8000/s');
                    options.route = 's';
                    return proxy(options);
                })
                ()];
        }
    });
});

// Server Livereload
gulp.task('connect', function () {
    // http://stackoverflow.com/questions/24546450/use-proxy-middleware-with-gulp-connect
    var serveStatic = require('serve-static');
    var serveIndex = require('serve-index');
    var srcApp = gutil.env.build ? path.buildVulcanized : path.app;
    // Proxy Options
    var fs = require('fs');
    var url = require('url');
    var proxyOptions = url.parse('http://127.0.0.1:8000/s/');
    proxyOptions.route = '/s/';


    // Connect Configuration
    var app = require('connect')()
        //  .use(require('connect-modrewrite')(['^/s/(.*)$ http://localhost:8000/s/$1 [P]']))
        .use(require('proxy-middleware')(proxyOptions))
        // .use(require('cors')({origin: 'http://127.0.0.1:8000', methods: ['HEAD', 'GET', 'POST']}))
        .use(require('connect-livereload')({port: 35729}))
//    .use(serveStatic('.tmp'))
        .use(serveStatic(srcApp))
        // paths to bower_components should be relative to the current file
        //  .use('/bower_components', serveStatic('bower_components'))
        .use(serveIndex(srcApp));

    // Https Option
    var tlsOptions = {
        key: fs.readFileSync('../docker/nginx-spdy/build/ssl/server.key', 'utf8'),
        cert: fs.readFileSync('../docker/nginx-spdy/build/ssl/server.crt', 'utf8')
    };
    require('https').createServer(tlsOptions, app).listen(server.httpsPort).on('listening', function () {
        console.log('Started connect web server on https://' + server.httpsHost + ':' + server.httpsPort + ' on directory ' + srcApp);
    });
    // Http Server
    require('http').createServer(app)
        .listen(server.httpPort)
        .on('listening', function () {
            console.log('Started connect web server on http://' + server.httpHost + ':' + server.httpPort + ' on directory ' + srcApp);
        });
});

// Start liveReload Server. Options : --build
gulp.task('serveLR', ['connect', 'watch'], function () {
    return require('opn')('http://' + server.httpHost + ':' + server.httpPort);
});


// Start CSS Injection Server. Options : --build
gulp.task('serve', ['watch'], function () {
    // Proxy Server
    // -------------
    var url = require('url');
    var proxy = require('proxy-middleware');
    var proxyOptions = url.parse('http://127.0.0.1:8000/s/');
    proxyOptions.route = '/s/';
    var proxies = [proxy(proxyOptions)];
    // browserSync Server
    // ------------------
    var srcApp = gutil.env.build ? path.buildVulcanized : path.app;
    // https://github.com/BrowserSync/gulp-browser-sync/issues/16#issuecomment-43597240
    browserSync({
        server: {
            baseDir: srcApp,
            online: false,
            middleware: proxies,
            notify: false,
            logLevel: 'info'
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



