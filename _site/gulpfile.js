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

var app_root = './guide/'
var static_root = app_root + 'public/';
var src_root = app_root + 'src/';
var site_root = app_root + '_site/';

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
    .pipe( gulp.dest(static_root + 'js') )
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
    .pipe( gulp.dest(static_root + 'js') )
  ) ;
});

var sass = function( s ){
  return ( s
    .pipe( $.sourcemaps.init() )
    .pipe( $.sass().on('error', $.sass.logError) )

    .pipe( $.sass({
      includePaths: [app_root + '_sass'], //import
      sourceMap: true,
      sourceMapRoot: '../'
    }) )
    .pipe( $.sourcemaps.write() )
    .pipe( $.rename('main.css') )
    .pipe( gulp.dest(static_root + 'css') )
  );
};

gulp.task('css', function(){
  return sass( gulp.src('./guide/src/sass/main.scss') );
});

gulp.task('watch', ['js-deps'], function(){
  $.livereload.listen({
    basePath: process.cwd()
  });

  // server.createServer({
  //   root: './',
  //   cache: -1,
  //   cors: true
  // }).listen( '12345', '0.0.0.0' );
  //
  // $.util.log( $.util.colors.green('App hosted on local HTTP server at http://localhost:12345') );

  // Reload browser signal
  gulp.watch([
    static_root + 'js/babel-compiled.js'
  ])
    .on('change', $.livereload.changed)
  ;

  // gulp.src( './src/less/app.less' )
  //   .pipe( $.plumber() )
  //   .pipe( $.watchLess('./src/less/app.less', function(){
  //     runSequence('css');
  //   }) )
  //   .on( 'error', handleErr )
  // ;

  gulp.watch( ['./package.json'], ['js-deps'] );

  var update = function(){
    $.util.log( $.util.colors.white('JS rebuilding via watch...') );

    bundle( b )
      .pipe( gulp.dest(static_root + 'js') )
      .on('finish', function(){
        $.util.log( $.util.colors.green('JS rebuild finished via watch') );
      })
    ;
  };

  // Custom JS
  var b = getBrowserified();
  transform( b );
  b.plugin( watchify, { poll: true } );
  b.on( 'update', update );

  update();
});

gulp.task('default', ['watch'], function( next ){
  next();
});

gulp.task('clean', function(){
  return gulp.src(static_root)
    .pipe( clean() )
  ;
});
