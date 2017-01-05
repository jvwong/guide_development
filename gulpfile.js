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

var app_root = './guide/'
// Try to load _config.yml as json, or throw exception on error
try {
  var jconfig = yaml.safeLoad(fs.readFileSync( app_root + '_config.yml', 'utf8'));
  //console.log(jconfig);
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


/*
 * Bundle the src/js dependencies to babel-compiled.js
 */
gulp.task('js', ['lint'], function(){
  return bundle( transform( getBrowserified() ) )
    .pipe( gulp.dest(path.join(site_root, static_directory, 'js')) ) //direct
    .pipe( browserSync.reload({stream:true}) )
    .pipe( gulp.dest(path.join(static_root, 'js')) ) //in case of jekyll-build call
  ;
});

/*
 * Lint the js
 */
gulp.task('lint', function () {
    return gulp.src(path.join(src_root, 'js/**/*.js'))
    .pipe($.jshint())
    .pipe($.jshint.reporter( 'jshint-stylish' ));
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
    .pipe( gulp.dest(path.join(site_root, static_directory, 'js')) ) //direct
    .pipe( browserSync.reload({stream:true}) )
    .pipe( gulp.dest(path.join(static_root, 'js')) ) //in case of jekyll-build call
  );
});

var sass = function( s ){
  return ( s
    .pipe( $.plumber() )
    .pipe( $.sourcemaps.init() )
    .pipe( $.sass().on('error', $.sass.logError) )
    .pipe( $.sass({
      includePaths: [path.join(src_root, 'sass')], //import
      sourceMap: true,
      sourceMapRoot: '../',
      outputStyle: 'compressed',
      onError: browserSync.notify
    }) )
    .pipe( $.sourcemaps.write() )
    .pipe( $.rename('main.css') )
    .pipe( gulp.dest(path.join(site_root, static_directory, 'css')) ) //direct
    .pipe( browserSync.reload({stream:true}) )
    .pipe( gulp.dest(path.join(static_root, 'css')) ) //in case of jekyll-build call
  );
};

gulp.task('css', function(){
  return sass( gulp.src( path.join(src_root, 'sass', 'main.scss')) );
});


/**
 * Process Rmarkdown
 */
var rMarkdownFileHandler = function(root, fileStat, next) {

  //punt if this isn't .Rmd file
  if( path.extname(fileStat.name) !== '.Rmd'){
     return next();
  }

  var collections_dir = path.join(src_root, 'collections');
  var source = path.resolve(root, fileStat.name);
  var target_path = path.join(path.relative(collections_dir, root));
  var media_path = path.join(target_path, $.util.replaceExtension(fileStat.name, ''))
  var destination = path.resolve(app_root, path.join(target_path, $.util.replaceExtension(fileStat.name, '.md')));
  var destination_dir = path.parse(destination);

  // console.log('root: %s', root);
  // console.log('source: %s', source);
  // console.log('target_path: %s', target_path);
  // console.log('media_path: %s', media_path);
  // console.log('destination: %s', destination);
  // console.log('md_path.dir: %s', md_path.dir);

  // Create the directories.
  // Don't do this with media - manual
  mkdirp.sync(destination_dir.dir);

  cp.spawn( '/Library/Frameworks/R.framework/Versions/3.2/Resources/Rscript', [
     'build.R',
      source,
      destination,
      media_path
    ], {
    stdio: 'inherit',
    cwd: app_root
  })
    .on('close', next);
};

var rMarkdownEndHandler = function (done) {
  console.log("R markdown complete");
  done();
}

var handleRMarkdown = function(path, done){
  var walker = walk.walk(path);
  walker.on('file', rMarkdownFileHandler);
  walker.on("end", function(){
    rMarkdownEndHandler(done);
  });
};

/* Single file update in watch */
var handleRMarkdownUpdate = function(file){
  var rootPath = path.relative(process.cwd(), file.path);
  var fileStat = objectAssign({
    name: path.basename(file.path),
    type: 'file'
  }, fs.statSync(file.path) );
  rMarkdownFileHandler(path.dirname(rootPath), fileStat, Q.defer().resolve);
};

// Process all markdown files in a directory
gulp.task('collections', function (done) {
  handleRMarkdown(path.join(src_root, 'collections'), done);
});

/**
 * Build the Jekyll Site
 */
gulp.task('jekyll-build', function (done) {
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
 * Rebuild Jekyll & do page reload
 */
gulp.task('jekyll-rebuild', ['jekyll-build'], function () {
    browserSync.reload();
});

/**
 * Wait for jekyll-build, then launch the Server
 */
gulp.task('browser-sync', ['css',
                           'js-deps',
                           'js',
                           'collections',
                           'jekyll-build'], function() {
    browserSync.init({
      // Serve files from the site_root directory
      server: {
        baseDir: site_root
      },
      port: '8080',
      middleware: [
        modRewrite([
                    '^/guide/(.*) /$1 [L]' // baseurl un-mapping
                ])
      ]
    });
});

/**
 * Watch scss files for changes & recompile
 * Watch html/md files, run jekyll & reload BrowserSync
 */
gulp.task('watch', function () {
  gulp.watch( ['./package.json'], ['js-deps'] );
  gulp.watch( [path.join(src_root, 'js/**/*.js*')], ['js'] );
  gulp.watch( [path.join(src_root, 'sass/**/*.scss')], ['css'] );
  gulp.watch( path.join(src_root, 'collections/**/*.Rmd') ).on('change', handleRMarkdownUpdate);
  gulp.watch([
    '_config*.yml',
    '*.html',
    '*.md',
    '_case_studies/**/*.*',
    '_communications/**/*.*',
    '_data/**/*.*',
    '_datasets/**/*.*',
    '_includes/**/*.*',
    '_layouts/**/*.*',
    '_primers/**/*.*',
    '_reading_list/**/*.*',
    '_analysis/**/*.*',
    '_workflows/**/*.*',
    'media/**/*.*'
  ].map(function(p){ return path.join(app_root, p)}), ['jekyll-rebuild']);
});

gulp.task('default', ['browser-sync', 'watch'], function( next ){
  next();
});

gulp.task('clean', function(){
  return gulp.src([
    static_root,
    site_root,
    path.join(app_root, '_workflows'),
    path.join(app_root, '_primers'),
    path.join(app_root, '_presentations'),
    path.join(app_root, '_case_studies')
  ])
    .pipe( clean() )
  ;
});
