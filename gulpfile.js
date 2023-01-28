const gulp = require('gulp');
const zip = require('gulp-zip');
const del = require('del');

gulp.task('clean', function(done) {
    return del([
        'manifest/**/*'
    ], done);
});

gulp.task('generate-manifest', function(done) {
    gulp.src(['src/pages/images/*', 'src/manifest.json'])
        .pipe(zip('Configuration.zip'))
        .pipe(gulp.dest('manifest'), done);
    done();
});

gulp.task('default', gulp.series('clean', 'generate-manifest'), function(done) {
    console.log('Build completed. Output in manifest folder');
    done();
});