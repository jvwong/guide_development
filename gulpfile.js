var process = require('process');
var mkdirp = require('mkdirp');
var path = require('path');
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
var yaml = require('js-yaml');
var fs   = require('fs');
var walk = require('walk');
var Q = require('q');

var browserSync = require('browser-sync').create();
var modRewrite  = require('connect-modrewrite');
var cp          = require('child_process');
var jekyll   = process.platform === 'win32' ? 'jekyll.bat' : 'jekyll';
var messages = {
    jekyllBuild: '<span style="color: grey">Running:</span> $ jekyll build'
};
var noop = () => {};

var app_root = './guide/'
// Try to load _config.yml as json, or throw exception on error
try {
  var jconfig = yaml.safeLoad(fs.readFileSync( app_root + '_config.yml', 'utf8'));
} catch (e) {
  console.log(e);
}
var src_root = path.join(app_root, jconfig.src_root);
var site_root = path.join(app_root, jconfig.site_root);
var static_directory = path.join(jconfig.static_root);
var static_root = path.join(app_root, static_directory);

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

/**
 * Task clean-collections: Clear out the collection folders
 */
gulp.task('clean-collections', function(){
  return gulp.src([
    path.join(app_root, '_workflows'),
    path.join(app_root, '_primers'),
    path.join(app_root, '_presentations'),
    path.join(app_root, '_case_studies'),
    path.join(app_root, 'cache')
  ], { allowEmpty: true })
    .pipe( clean() )
  ;
});

/**
 * Task clean: Clear out the build folders
 */
gulp.task('clean', gulp.parallel( 'clean-collections', function(){
  return gulp.src([
    static_root,
    site_root
  ], { allowEmpty: true })
    .pipe( clean() )
  ;
}));

/*
 * Task lint: Lint the javascript
 */
gulp.task('lint', function () {
  return gulp.src(path.join(src_root, 'js/**/*.js'))
  .pipe($.jshint())
  .pipe($.jshint.reporter( 'jshint-stylish' ));
});


/*
 * Task js: Bundle the custom Javascript
 */
var getBrowserified = function( opts ){
  opts = objectAssign({
    debug: true,
    cache: {}, //watchify requirement
    packageCache: {}, //watchify requirement
    fullPaths: true,
    bundleExternal: true,
    entries: [
      path.join(src_root, 'js/main.js')
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
    .pipe( $.uglify() )
  ) ;
};

gulp.task('js', gulp.parallel('lint', function(){
  return bundle( transform( getBrowserified() ) )
    .pipe( gulp.dest( path.join( static_root, 'js' ) ) ) //in case of jekyll-build call
  ;
}));

/*
 * Task js-deps: Bundle the package.json 'dependencies'
 */
gulp.task('js-deps', function(){
  var b = browserify({
    debug: false
  });

  deps.forEach(function( dep ){
    b.require( dep );
  });

  return ( b
    .bundle()
    .on( 'error', handleErr )
    .pipe( source('deps.js') )
    .pipe( buffer() )
    .pipe( gulp.dest( path.join( static_root, 'js' ) ) ) //in case of jekyll-build call
  );
});


/*
 * Task css: Bundle style sheets
 */
var sass = function( s ){
  return ( s
    .pipe( $.plumber() )
    .pipe( $.sourcemaps.init() )
    .pipe( $.sass().on('error', $.sass.logError) )
    .pipe( $.sass({
      includePaths: [
        path.join(src_root, 'sass')
      ], //import
      sourceMap: true,
      sourceMapRoot: '../',
      outputStyle: 'compressed',
      onError: browserSync.notify
    }) )
    .pipe( $.sourcemaps.write() )
    .pipe( $.rename( 'main.css' ) )
    .pipe( gulp.dest( path.join( static_root, 'css' ) ) )
  );
};

gulp.task('css', function(){
  return sass( gulp.src( path.join(src_root, 'sass', 'main.scss')) );
});


/**
 * Task collections: Handle the R Markdown files
 */
var rMarkdownFileHandler = function( source, destination, plots, next ) {
  cp.spawn( '/Library/Frameworks/R.framework/Versions/3.2/Resources/Rscript', [
     'build.R',
      source,
      destination,
      plots
    ], {
    stdio: 'inherit',
    cwd: app_root
  })
  .on('close', next);
};

var fileHandler = function( source, destination_dir, next ) {
  gulp.src( source )
    .pipe(gulp.dest( destination_dir ));
  next();
};

var fetchPaths = function( parsed ){

  var collections_dir = path.join( src_root, 'collections' );
  var source = path.join( parsed.dir, parsed.base );
  var target_path = path.relative( collections_dir, parsed.dir );
  var plot_path = path.join( static_directory, 'R', target_path.replace(/^_{1}/, ''), '/' )
  var destination = path.resolve(
    app_root,
    path.join(
      target_path,
      parsed.ext === '.Rmd' ? parsed.name + '.md' : parsed.base
    )
  );
  var destination_dir = path.join( path.parse( destination ).dir, '/' );

  return {
    "source": source,
    "destination": destination,
    "destination_dir": destination_dir,
    "plots": plot_path
  };
};

var processFile = function( parsed, next ){
  var paths = fetchPaths( parsed );
  mkdirp.sync( paths.destination_dir );
  if( parsed.ext === '.Rmd' ){
    rMarkdownFileHandler( paths.source, paths.destination, paths.plots, next )
  } else if ( !( /\.(DS_Store)$/i ).test( parsed.ext ) ) {
    fileHandler( paths.source, paths.destination_dir, next )
  } else {
    next()
  }
}

var handleCollectionUpdate = function( eventType, filepath ){
  var parsed = path.parse( path.resolve(filepath) );
  var paths = fetchPaths( parsed );
  if ( eventType === 'unlink' ) {
    del( paths.destination ).then( noop );
  } else {
    processFile( parsed, noop );
  }

};

var handleCollection = function( filePath, done ){
  var walker = walk.walk( filePath );
  walker.on( 'file', function( root, fileStats, next ){
    var parsed = path.parse( path.resolve( root, fileStats.name ) );
    processFile ( parsed, next );
  });
  walker.on( 'end', done );
};

gulp.task('collections', gulp.series( 'clean-collections', function ( done ) {
  handleCollection( path.join(src_root, 'collections'), done );
}));

/**
 * Task jekyll: Build the site
 */
gulp.task('jekyll', function ( done ) {
   return cp.spawn( jekyll, [
       'build',
       '--config',
       '_config.yml'
     ], {
     stdio: 'inherit',
     cwd: app_root
   })
     .on('close', done);
});

/**
 * Task jekyll-incremental: Incrementally build the Markdown to HTML
 */
gulp.task('jekyll-incremental', function ( done ) {
    browserSync.notify(messages.jekyllBuild);
    return cp.spawn( jekyll, [
        'build',
        '--incremental',
        '--config',
        '_config.yml'
      ], {
      stdio: 'inherit',
      cwd: app_root
    })
      .on('close', done);
});

/**
 * Task jekyll-rebuild: Reload browser
 */
gulp.task('jekyll-rebuild', gulp.series('jekyll-incremental', function ( done ) {
    browserSync.reload();
    done();
}));

/**
 * Task browser-sync: Start the reloadable  server
 */
gulp.task('browser-sync', function() {
    browserSync.init({
      // Serve files from the site_root directory
      server: {
        baseDir: site_root
      },
      port: '9090',
      middleware: [
        modRewrite([
                    '^/guide/(.*) /$1 [L]' // baseurl un-mapping
                ])
      ]
    });
});

/**
 * Task watch: Watch for file changes and build as needed
 */
gulp.task('watch', function () {
  gulp.watch( './package.json', gulp.parallel( 'js-deps' ) );
  gulp.watch( path.join( src_root, 'js/**/*.js*'), gulp.parallel( 'js' ) );
  gulp.watch( path.join( src_root, 'sass/**/*.scss' ),  gulp.parallel( 'css' ) );
  gulp.watch( path.join( src_root, 'collections/**/*.*' ) )
    .on('unlink', filepath => handleCollectionUpdate( 'unlink', filepath ) )
    .on('change', filepath => handleCollectionUpdate( 'change', filepath ) )
    .on('add', filepath => handleCollectionUpdate( 'add', filepath ) );
  gulp.watch([
    'index.md',
    '_*/**/*.*',
    'media/**/*.*',
    'public/**/*.*'
  ].map(function(p){
    console.log(p);
    return path.join(app_root, p)}), gulp.parallel( 'jekyll-rebuild' ));
});

gulp.task('build',
  gulp.series('clean',
    gulp.parallel(
      'js',
      'js-deps',
      'css',
      gulp.series(
        'collections',
        'jekyll'
      )
    )
  )
)

gulp.task( 'default', gulp.parallel( 'browser-sync', 'watch' ) );