import pathToRegexp from 'path-to-regexp'
import('../assets/component/base-layout').then(function () {
  const routes = [{
    path: '/info.html',
    component: function () {
      import('../assets/page/info')
    }
  }, {
    path: '/(.*)',
    component: function () {
      import('../assets/page/default')
    }
  }]

  const pathname = window.location.hash.slice(1)
  for (const route of routes) {
    const { path, component } = route
    const re = pathToRegexp(path)
    const m = re.exec(pathname)
    if (m) {
      component()
      break
    }
  }
})
