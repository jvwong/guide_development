var process = require('process');
var objectAssign = require('object-assign');
var gulp = require('gulp');
var livereload = require('gulp-livereload');
var browserify = require('browserify');
var babelify = require('babelify');
var watchify = require('watchify');
var del = require('del');
var paths = require('vinyl-paths');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var clean = function(){ return paths( del ); };
var notifier = require('node-notifier');
// Loads *gulp* plugins from package dependencies and attaches them to $
var $ = require('gulp-load-plugins')();
var runSequence = require('run-sequence');
var pkg = require('./package.json');
var deps = Object.keys( pkg.dependencies || {} );
var yaml = require('gulp-yaml');

var browserSync = require('browser-sync').create();
var cp          = require('child_process');
var jekyll   = process.platform === 'win32' ? 'jekyll.bat' : 'jekyll';
var messages = {
    jekyllBuild: '<span style="color: grey">Running:</span> $ jekyll build'
};

var app_root = './guide/'
var src_root = app_root + 'src/';
var site_root = app_root + '_site/';
var static_directory = 'public/';
var static_root = app_root + static_directory;

var logError = function( err ){
  notifier.notify({ title: pkg.name, message: 'Error: ' + err.message });
  $.util.log( $.util.colors.red(err) );
};

var handleErr = function( err ){
  logError( err );

  if( this.emit ){
    this.emit('end');
  }
};

var getBrowserified = function( opts ){
  opts = objectAssign({
    debug: true,
    cache: {}, //watchify requirement
    packageCache: {}, //watchify requirement
    fullPaths: true,
    bundleExternal: true,
    entries: [
      src_root + 'js/boot.js',
      src_root + 'js/efetch_panel.js'
    ]
  }, opts );

  return browserify( opts ).on( 'log', $.util.log );
};

var transform = function( b ){
  return ( b
    .transform( babelify.configure({
      presets: ['es2015', 'react'],
      ignore: 'node_modules/**/*',
      sourceMaps: 'inline'
    }) )
    .external( deps )
  ) ;
};

var bundle = function( b ){
  return ( b
    .bundle()
    .on( 'error', handleErr )
    .pipe( source('babel-compiled.js') )
    .pipe( buffer() )
  ) ;
};

/*
 * Bundle the src/js dependencies to babel-compiled.js
 */
gulp.task('js', function(){
  return bundle( transform( getBrowserified() ) )
    .pipe( gulp.dest(site_root + static_directory + 'js') ) //direct
    .pipe( browserSync.reload({stream:true}) )
    .pipe( gulp.dest(static_root + 'js') ) //in case of jekyll-build call
  ;
});

/*
 * Bundle the package.json dependencies to deps.js
 */
gulp.task('js-deps', function(){
  var b = browserify({
    debug: false
  });

  //deps is package.json dependencies
  deps.forEach(function( dep ){
    b.require( dep );
  });

  return ( b
    .bundle()
    .on( 'error', handleErr )
    .pipe( source('deps.js') )
    .pipe( buffer() )
    .pipe( gulp.dest(site_root + static_directory + 'js') ) //direct
    .pipe( browserSync.reload({stream:true}) )
    .pipe( gulp.dest(static_root + 'js') ) //in case of jekyll-build call
  );
});

var sass = function( s ){
  return ( s
    .pipe( $.plumber() )
    .pipe( $.sourcemaps.init() )
    .pipe( $.sass().on('error', $.sass.logError) )
    .pipe( $.sass({
      includePaths: [src_root + 'sass'], //import
      sourceMap: true,
      sourceMapRoot: '../',
      outputStyle: 'compressed',
      onError: browserSync.notify
    }) )
    .pipe( $.sourcemaps.write() )
    .pipe( $.rename('main.css') )
    .pipe( gulp.dest(site_root + static_directory + 'css') ) //direct
    .pipe( browserSync.reload({stream:true}) )
    .pipe( gulp.dest(static_root + 'css') ) //in case of jekyll-build call
  );
};

gulp.task('css', function(){
  return sass( gulp.src( src_root + 'sass/main.scss') );
});

/**
 * Build the Jekyll Site
 */
gulp.task('jekyll-build', function (done) {
    // browserSync.notify(messages.jekyllBuild);
    return cp.spawn( jekyll, [
        'build',
        '--config',
        '_config_development.yml'
      ], {
      stdio: 'inherit',
      cwd: app_root
    })
      .on('close', done);
});

/**
 * Rebuild Jekyll & do page reload
 */
gulp.task('jekyll-rebuild', ['jekyll-build'], function () {
    browserSync.reload();
});

/**
 * Wait for jekyll-build, then launch the Server
 */
gulp.task('browser-sync', ['css', 'js-deps', 'js', 'jekyll-build'], function() {
    browserSync.init({
      // Serve files from the site_root directory
      server: {
        baseDir: site_root
      },
      port: '8080'
    });
});

/**
 * Watch scss files for changes & recompile
 * Watch html/md files, run jekyll & reload BrowserSync
 */
gulp.task('watch', function () {
  gulp.watch( ['./package.json'], ['js-deps'] );
  gulp.watch( [src_root + 'js/**/*.js'], ['js'] );
  gulp.watch( [src_root + 'sass/**/*.scss'], ['css'] );
  gulp.watch([
    app_root + '_config*.yml',

    app_root + '*.html',
    app_root + '_case_studies/**/*.*',
    app_root + '_communications/**/*.*',
    app_root + '_data/**/*.*',
    app_root + '_datasets/**/*.*',
    app_root + '_includes/**/*.*',
    app_root + '_layouts/**/*.*',
    app_root + '_primers/**/*.*',
    app_root + '_reading_list/**/*.*',
    app_root + '_media/**/*.*'
  ], ['jekyll-rebuild']);
});

gulp.task('default', ['browser-sync', 'watch'], function( next ){
  next();
});

gulp.task('clean', function(){
  return gulp.src(static_root)
    .pipe( clean() )
  ;
});
