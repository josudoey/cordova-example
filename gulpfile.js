// ref https://webpack.github.io/docs/usage-with-gulp.html#without-webpack-stream
const gulp = require('gulp')
const cleanCss = require('gulp-clean-css')
const htmlmin = require('gulp-htmlmin')
const uglify = require('gulp-uglify')
const config = require('./webpack/config')
const log = require('fancy-log')
const PluginError = require('plugin-error')
const webpack = require('webpack')
const notProduction = process.env.NODE_ENV !== 'production'
const del = require('del')
const imagemin = require('gulp-imagemin')
const argv = require('minimist')(process.argv.slice(2))
const path = require('path')
const staticPath = './static'
const cloneGlob = staticPath + '/**/*.+(ttf|svg|eot|woff|woff2|ico|otf|json)'
const imageGlob = staticPath + '/**/*.+(jpeg|jpg|png)'
const jsGlob = staticPath + '/**/*.js'
const htmlGlob = staticPath + '/**/*.+(html|htm)'
const cssGlob = staticPath + '/**/*.css'
const buildPath = config.contentBase
const fs = require('fs')
gulp.task('clean', function (cb) {
  del.sync([buildPath])
  cb()
})

gulp.task('clone', function () {
  return gulp.src(cloneGlob)
    .pipe(gulp.dest(buildPath))
})

gulp.task('webpack', function (callback) {
  webpack(config.webpack, function (err, stats) {
    if (err) {
      throw new PluginError('webpack', err)
    }
    log('[webpack]', stats.toString({}))
    const statsJson = stats.toJson({
      assets: false,
      verbose: false,
      children: false,
      chunks: false,
      modules: false,
      outputPath: false,
      hash: true
    })
    fs.writeFileSync(path.resolve(__dirname, './build/stats.json'), JSON.stringify(statsJson, null, 4))
    callback()
  })
})

gulp.task('min:image', function () {
  const task = gulp.src(imageGlob)
  if (notProduction) {
    return task.pipe(gulp.dest(buildPath))
  }

  return gulp.src(imageGlob)
    .pipe(imagemin({
      interlaced: true,
      progressive: true,
      optimizationLevel: 5
    }))
    .pipe(gulp.dest(buildPath))
})

gulp.task('min:js', function () {
  const task = gulp.src(jsGlob)
  if (notProduction) {
    return task.pipe(gulp.dest(buildPath))
  }
  return task
    .pipe(uglify())
    .pipe(gulp.dest(buildPath))
})

gulp.task('min:css', function () {
  const task = gulp.src(cssGlob)
  if (notProduction) {
    return task.pipe(gulp.dest(buildPath))
  }
  return task.pipe(cleanCss())
    .pipe(gulp.dest(buildPath))
})

gulp.task('min:html', function () {
  const task = gulp.src(htmlGlob)
  if (notProduction) {
    return task.pipe(gulp.dest(buildPath))
  }

  return task.pipe(htmlmin({
    collapseWhitespace: true
  })).pipe(gulp.dest(buildPath))
})

gulp.task('static', gulp.parallel(['clone', 'min:image', 'min:js', 'min:css', 'min:html']))

gulp.task('build', gulp.series(['clean', 'webpack', 'static']))

gulp.task('watch', gulp.series(['static', function (cb) {
  gulp.watch(cloneGlob, gulp.series(['clone']))
  gulp.watch(imageGlob, gulp.series(['min:image']))
  gulp.watch(cssGlob, gulp.series(['min:css']))
  gulp.watch(jsGlob, gulp.series(['min:js']))
  gulp.watch(htmlGlob, gulp.series(['min:html']))
  cb()
}]))

gulp.task('webpack:dev', function (cb) {
  const configWebpack = config.webpack
  const compiler = webpack(configWebpack)
  compiler.devtool = 'source-map'

  const host = argv.host || '0.0.0.0'
  const port = argv.port || 3000
  for (const name of Object.keys(configWebpack.entry)) {
    configWebpack.entry[name].unshift(`webpack-dev-server/client?http://localhost:${port}/`)
  }

  configWebpack.plugins.push(new webpack.NamedModulesPlugin())
  configWebpack.plugins.push(new webpack.HotModuleReplacementPlugin())
  const WebpackDevServer = require('webpack-dev-server')
  const configWebpackDevServer = config['webpack-dev-server']

  const serveStatic = require('serve-static')
  const buildServe = serveStatic(buildPath, {
    extensions: ['html']
  })
  const staticServe = serveStatic(staticPath, {
    extensions: ['html']
  })
  configWebpackDevServer.before = function (app) {
    app.get('/*', function (req, res, next) {
      buildServe(req, res, next)
    })
    app.get('/*', function (req, res, next) {
      staticServe(req, res, next)
    })
  }

  const server = new WebpackDevServer(compiler, configWebpackDevServer)
  server.listen(port, host, function () {
    // const app = server.listeningApp
    const httpListen = host + ':' + port
    log('[webpack-dev-server]', 'Http Listen in ' + httpListen)
  })
  cb()
})

gulp.task('dev', gulp.parallel(['webpack:dev', 'watch']))
