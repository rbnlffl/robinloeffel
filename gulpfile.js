const gulp = require('gulp');
const open = require('open');
const del = require('del');
const plumber = require('gulp-plumber');
const connect = require('gulp-connect');
const sass = require('gulp-sass');
const imagemin = require('gulp-imagemin');
const noop = require('gulp-noop');
const stylelint = require('stylelint');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const reporter = require('postcss-reporter');

const devEnv = process.argv.includes('--dev');


gulp.task('clean', () => del('dist/'));
gulp.task('open', () => open('http://localhost:8080'));

gulp.task('serve', done => {
    connect.server({
        livereload: true,
        root: 'dist'
    });
    done();
});

gulp.task('css', () => {
    return gulp.src('src/scss/page.scss', {
            sourcemaps: devEnv
        })
        .pipe(plumber())
        .pipe(sass.sync())
        .pipe(postcss([
            ...(!devEnv ? [
                autoprefixer(),
                cssnano()
            ] : []),
            reporter({
                clearReportedMessages: true
            })
        ]))
        .pipe(gulp.dest('dist/css/', {
            sourcemaps: '.'
        }))
        .pipe(connect.reload());
});

gulp.task('css:lint', () => {
    return gulp.src('src/scss/**/*')
        .pipe(postcss([
            stylelint(),
            reporter({
                clearReportedMessages: true
            })
        ]));
});

gulp.task('js', async () => {
    const { rollup } = require('rollup');
    const babel = require('rollup-plugin-babel');
    const resolve = require('rollup-plugin-node-resolve');
    const commonjs = require('rollup-plugin-commonjs');
    const { terser } = require('rollup-plugin-terser');
    const { eslint } = require('rollup-plugin-eslint');

    const bundle = await rollup({
        input: 'src/js/page.js',
        plugins: [
            eslint(),
            resolve(),
            commonjs(),
            !devEnv && babel(),
            !devEnv && terser()
        ]
    });

    await bundle.write({
        sourcemap: devEnv,
        file: 'dist/js/page.js',
        format: 'iife'
    });
});

gulp.task('img', () => {
    return gulp.src('src/img/**/*')
        .pipe(plumber())
        .pipe(devEnv ? noop() : imagemin([
            imagemin.jpegtran({
                progressive: true
            }),
            imagemin.optipng({
                optimizationLevel: 7
            }),
            imagemin.svgo(),
            imagemin.gifsicle({
                interlaced: true,
                optimizationLevel: 3
            })
        ], {
            verbose: true
        }))
        .pipe(gulp.dest('dist/img/'))
        .pipe(connect.reload());
});

gulp.task('files', () => {
    return gulp.src([
            'src/{*,}.*',
            'src/video/**/*',
            'src/img/*.webp'
        ], {
            base: 'src'
        })
        .pipe(plumber())
        .pipe(gulp.dest('dist/'))
        .pipe(connect.reload());
});


gulp.task('watch:css', done => {
    gulp.watch('src/scss/**/*', gulp.parallel('css', 'css:lint'));
    done();
});

gulp.task('watch:js', done => {
    gulp.watch('src/js/**/*', gulp.parallel('js'));
    done();
});

gulp.task('watch:img', done => {
    gulp.watch('src/img/**/*', gulp.parallel('img'));
    done();
});

gulp.task('watch:files', done => {
    gulp.watch('src/{*,}.*', gulp.parallel('files'));
    done();
});

gulp.task('watch', gulp.parallel('watch:css', 'watch:js', 'watch:img', 'watch:files'));
gulp.task('build', gulp.series('clean', gulp.parallel('js', 'css', 'css:lint', 'img', 'files')));
gulp.task('default', gulp.series('build', 'serve', 'open', 'watch'));
