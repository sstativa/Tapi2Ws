// 1. LIBRARIES
// - - - - - - - - - - - - - - -

const gulp = require('gulp');
const autoprefixer = require('gulp-autoprefixer');
const babel = require('gulp-babel');
const cleanCSS = require('gulp-clean-css');
const concat = require('gulp-concat');
const del = require('del');
const nodeSass = require('node-sass');
const sass = require('gulp-sass');
const zip = require('gulp-zip');

// 2. FILE PATHS
// - - - - - - - - - - - - - - -

const paths = {
  assets: [
    'src/assets/**/*.*',
  ],
  sass: [
    'node_modules',
    'scss/style.scss',
  ],
  backgroundJs: [
    'src/js/background.js',
  ],
  contentJs: [
    'src/js/content.js',
  ],
  popupJs: [
    'src/js/popup.js',
  ],
};

// 3. TASKS
// - - - - - - - - - - - - - - -

gulp.task('clean', () => del([
  './build',
]));

gulp.task('copy', () => gulp
  .src(paths.assets)
  .pipe(gulp.dest('./build')));

gulp.task('sass', () => gulp.src('src/scss/style.scss')
  .pipe(sass({
    includePaths: paths.sass,
    // errLogToConsole: true,
    outputStyle: 'expanded',
    functions: {
      'encodeBase64($string)': ($string) => {
        const buffer = Buffer.from($string.getValue());
        return nodeSass.types.String(buffer.toString('base64'));
      },
    },
  }).on('error', sass.logError))
  .pipe(autoprefixer({ browsers: ['last 2 versions'] }))
  .pipe(cleanCSS())
  .pipe(gulp.dest('./build/css')));

gulp.task('js:background', () => gulp.src(paths.backgroundJs)
  .pipe(concat('background.js'))
  .pipe(babel({
    presets: [
      ['env', {
        targets: {
          uglify: false,
        },
      }],
    ],
  }))
  .pipe(gulp.dest('./build/js')));

gulp.task('js:content', () => gulp.src(paths.contentJs)
  .pipe(concat('content.js'))
  .pipe(babel({
    presets: [
      ['env', {
        targets: {
          uglify: false,
        },
      }],
    ],
  }))
  .pipe(gulp.dest('./build/js')));

gulp.task('js:popup', () => gulp.src(paths.popupJs)
  .pipe(concat('popup.js'))
  .pipe(babel({
    presets: [
      ['env', {
        targets: {
          uglify: false,
        },
      }],
    ],
  }))
  .pipe(gulp.dest('./build/js')));

gulp.task('zip', () => gulp.src('./build/**/*')
  .pipe(zip('build.zip'))
  .pipe(gulp.dest('.')));

// gulp.task('js', gulp.parallel('js:background', 'js:content', 'js:popup'));
gulp.task('js', gulp.parallel('js:background', 'js:popup'));

// Builds your entire app once, without starting a server
gulp.task('build', gulp.series('clean', 'copy', gulp.parallel('sass', 'js'), 'zip'));

gulp.task('watch', () => {
  // Watch static files
  gulp.watch(paths.assets, gulp.series('copy'));

  // Watch Sass
  gulp.watch(['./src/scss/**/*'], gulp.series('sass'));

  // Watch JavaScript
  gulp.watch(['./src/js/**/*.js'], gulp.series('js'));
});

// // Default task: builds your app, starts a server, and recompiles assets when they change
gulp.task('default', gulp.series('build', 'watch'));
