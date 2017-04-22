var MDB = {}
var PLUGIN, SMS

function id (ID) {
  return document.getElementById(ID)
}

function loadStyle (url) {
  var ss = document.createElement('link')
  ss.type = 'text/css'
  ss.rel = 'stylesheet'
  ss.href = url
  document.getElementsByTagName('head')[0].appendChild(ss)
}

var scriptLoaded = {}
function loadScript (url, onload) {
  var urlLoaded = scriptLoaded[url]
  if (urlLoaded != null) {
    if (onload != null) onload()
    return
  }
  var script = document.createElement('script')
  script.onload = onload
  script.src = url
  document.getElementsByTagName('head')[0].appendChild(script)
  scriptLoaded[url] = true
}

function ajaxJob (method, path, obj, callback) {
  var r = new window.XMLHttpRequest()
  r.open(method, path, true)
  r.onreadystatechange = function () {
    if (r.readyState !== 4) return
    callback(r)
  }
  var objStr = (obj==null) ? null : JSON.stringify(obj)
  r.send(objStr)
}

function ajaxGet (path, callback) {
  ajaxJob('GET', path, null, callback)
}

function ajaxPostJob (method, path, obj, callback, isAlert) {
  if (isAlert == null) isAlert = true
  ajaxJob(method, path, obj, function (r) {
    if (isAlert) window.alert(MDB.mt(r.responseText))
    if (callback != null) callback(r)
  })
}

function ajaxPost (path, obj, callback, isAlert) {
  ajaxPostJob('POST', path, obj, callback, isAlert)
}

function ajaxPatch (path, obj, callback, isAlert) {
  ajaxPostJob('PATCH', path, obj, callback, isAlert)
}

function ajaxFormPost (path, form, callback) {
  var obj = new window.FormData(form)
  ajaxPost(path, obj, function (r) {
    if (callback != null) callback(r)
  })
}

MDB.mt = function (msg) {
  return msg
}

MDB.mtRender = function () {
//  console.log('MDB.mtRender()')
  var nodes = document.getElementsByClassName('mt')
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i]
    var s = node.getAttribute('data-mt')
    var t = MDB.mt(s)
    node.innerHTML = t
  }
}

MDB.onload = function () {
  loadScript('../../plugin/plugin.js', function () {
    if (PLUGIN != null) PLUGIN.load()
  })
  loadScript(MDB.setting.showdownJsUrl, function () {
    MDB.converter = new window.showdown.Converter()
    MDB.converter.setOption('tables', true)
    MDB.bookRender()
//    MDB.mtRender()
    MDB.view()
  })
}

window.onload = MDB.onload

MDB.plugin = function (path, callback) {
  ajaxGet('../../plugin/' + path, function (r) {
    if (r.status === 200) {
      id('pluginBox').innerHTML = r.responseText
      MDB.showBox('pluginBox')
      MDB.mtRender()
//      MDB.render()
      if (callback != null) {
        callback()
      }
    } else {
      window.alert('Error : plugin ' + path + ' not found')
    }
  })
}

// markdown-it 對 <code>...</code> 的解讀有誤，因此會把數學式裡的 *...* 與 ^...^ 誤解而翻錯成 <em> 與 <sup>！
// 所以只能用 showdown.js  // var html = converter.render(md) // markdown-it
MDB.md2html = function (md) {
  return MDB.converter.makeHtml(md) // showdown.js
}

MDB.mdRender = function (md, callback) {
  var html = MDB.md2html(md)
  callback(html)
}

MDB.mdRewrite = function (md, callback) {
  md = md.replace(/(```\w*\n([\s\S]*?)\n```)|(`[^`\n]*`)|(\$\$\s*\n\s*([^$]+)\s*\n\s*\$\$)|(\$\$([^$\n]+)\$\$)/gmi, function (match, p1, p2, p3, p4, p5, p6, p7, offset, str) {
    var texHtml
    try {
      if (p1 != null) {
        return match
      } else if (p3 != null) {
        return match
      } else if (p4 != null) {
        texHtml = '<code>' + p4 + '</code>'
        return (texHtml == null) ? p5 : texHtml
      } else if (p6 != null) {
        texHtml = '<code>' + p6 + '</code>'
        return (texHtml == null) ? p7 : texHtml
      }
    } catch (err) {}
  })
  MDB.mdRender(md, callback)
}

// fileRender => mdRewrite => mdRender
MDB.fileRender = function (text, callback) {
  if (MDB.setting.file.endsWith('.html')) {
    callback(text)
  } else {
    var md
    if (MDB.setting.file.endsWith('.json')) {
      md = '```json\n' + text + '\n```'
    } else
    if (MDB.setting.file.endsWith('.mdo')) {
      md = '```mdo\n' + text + '\n```'
    } else { // *.md
      md = text
    }
    MDB.mdRewrite(md, callback)
  }
}

MDB.bookRender = function () {
  var bookJson = id('editBook').value
  var bookObj = JSON.parse(bookJson)
  id('bookTitle').innerHTML = '<a href="README.md" class="pure-menu-link mt" data-mt="' + bookObj.title + '"></a>'
  var chapters = bookObj.chapters
  var bookHtmls = []
  for (var i in chapters) {
    bookHtmls.push('<li class="pure-menu-item"><a href="' + chapters[i].link + '" class="pure-menu-link mt" data-mt="' + chapters[i].title + '">' + MDB.mt(chapters[i].title) + '</a></li>')
  }
  console.log('bookRender')
  if (SMS != null) {
    var smsLink = '<li class="pure-menu-item"><a href="#sms" class="pure-menu-link mt" data-mt="Discussion=評論留言"></a></li>' // onclick="SMS.render()" 
//    var smsLink = '<li class="pure-menu-item"><a class="pure-menu-link mt" data-mt="Discussion=評論留言" onclick="MDB.plugin(\'sms/view?url=' + window.location.pathname + '&s2t=' + s2t + '\', SMS.view)"></a></li>'
    console.log('smsLink=%s', smsLink)
//    bookHtmls.push('<li class="pure-menu-item"><a class="pure-menu-link mt" data-mt="Discussion=評論留言" onclick="MDB.plugin(\'sms/view?url=' + window.location.pathname + '&s2t=' + s2t + '\', SMS.view)"></a></li>') // &s2t=' + (MT==null) ? '' : MT.getS2t() + '
    bookHtmls.push(smsLink)
  }
  id('bookBox').innerHTML = bookHtmls.join('\n')
}

MDB.showBox = function (ID) {
  id('pluginBox').style.display = 'none'
  id('viewBox').style.display = 'none'
  id('editBox').style.display = 'none'
  id(ID).style.display = 'block'
}

MDB.texApply = function (text) {
  return text.replace(/(```\w*\n([\s\S]*?)\n```)|(`[^`\n]*`)|(<code>\$\$\s*\n\s*([^$]+)\s*\n\s*\$\$<\/code>)|(<code>\$\$([^$\n]+)\$\$<\/code>)/gmi, function (match, p1, p2, p3, p4, p5, p6, p7, offset, str) {
    var texHtml
    try {
      if (p1 != null) {
        return match
      } else if (p3 != null) {
        return match
      } else if (p4 != null) {
        texHtml = window.katex.renderToString(p5, { displayMode: true })
        return (texHtml == null) ? p5 : texHtml
      } else if (p6 != null) {
        texHtml = window.katex.renderToString(p7)
        return (texHtml == null) ? p7 : texHtml
      }
    } catch (err) {
      return err.toString()
    }
  })
}

MDB.texRender = function (text, callback) {
  if (text.indexOf('$$') >= 0) {
    loadScript(MDB.setting.katexJsUrl, function () {
      loadStyle(MDB.setting.katexCssUrl)
      text = MDB.texApply(text)
      callback(text)
    })
  } else {
    callback(text)
  }
}

// render => fileRender => texRender
MDB.render = function () {
  MDB.fileRender(id('editText').value, function (html) {
//    console.log('fileRender callback')
    MDB.texRender(html, function (texHtml) {
//      console.log('texRender callback')
      id('viewBox').innerHTML = texHtml
//      console.log('call mtRender()')
      MDB.mtRender()
      MDB.codeHighlight()
    })
  })
//  MDB.mtRender()
}

MDB.codeHighlight = function () {
  var codes = document.querySelectorAll('pre code')
  if (codes.length > 0) {
    loadScript(MDB.setting.highlightJsUrl, function () {
      loadStyle(MDB.setting.highlightCssUrl)
      for (var i = 0; i < codes.length; i++) {
        window.hljs.highlightBlock(codes[i])
      }
    })
  }
}

MDB.view = function () {
  MDB.showBox('viewBox')
  MDB.render()
}

MDB.edit = function () {
  MDB.showBox('editBox')
}

// =================== CURD Server 編輯登入儲存 =============================
MDB.login = function () {
  var userBox = id('user')
  var passwordBox = id('password')
  ajaxPost('../../login', {user: userBox.value, password: passwordBox.value}, function (r) {
    window.location.reload()
  })
}

MDB.save = function () {
  ajaxPost('../../save/' + MDB.setting.book + '/' + MDB.setting.file, {text: id('editText').value}, function (r) {
    if (r.status !== 200) {
      MDB.plugin('login.html')
    }
  })
}

MDB.createBook = function () {
  var bookName = id('book').value
  ajaxGet('../../createbook/' + bookName, function (r) {
    window.alert(r.responseText)
    if (r.status === 200) window.location.href = '../../view/' + bookName + '/'
  })
}

MDB.upload = function (e) {
  try {
    var form = id('uploadForm')
    ajaxFormPost('../../upload/' + MDB.setting.book, form, function (r) {
      if (r.status === 200) {
        window.alert('Success !')
      } else {
        window.alert('Fail!')
      }
      MDB.showBox('viewBox')
    })
  } catch (e) {}
  return false
}

MDB.logout = function () {
  ajaxPost('../../logout', {}, function (r) {
    window.location.reload()
  })
}

MDB.signup = function () {
  ajaxPost('../../signup', {user: id('user').value, password: id('password').value}, function (r) {
  })
}

// ============== purecss ui.js ====================
function purecssLoad (window, document) {
  var layout = document.getElementById('layout')
  var menu = document.getElementById('menu')
  var menuLink = document.getElementById('menuLink')
  var content = document.getElementById('main')

  function toggleClass (element, className) {
    var classes = element.className.split(/\s+/)
    var length = classes.length
    var i = 0

    for (; i < length; i++) {
      if (classes[i] === className) {
        classes.splice(i, 1)
        break
      }
    }
    // The className is not found
    if (length === classes.length) {
      classes.push(className)
    }

    element.className = classes.join(' ')
  }

  function toggleAll (e) {
    var active = 'active'

    e.preventDefault()
    toggleClass(layout, active)
    toggleClass(menu, active)
    toggleClass(menuLink, active)
  }

  menuLink.onclick = function (e) {
    toggleAll(e)
  }

  content.onclick = function (e) {
    if (menu.className.indexOf('active') !== -1) {
      toggleAll(e)
    }
  }
}

purecssLoad(window, window.document)
