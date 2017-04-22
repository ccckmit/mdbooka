var PLUGIN = {}
var MT = {cn2tw: {}, tw2cn: {}}
var SMT = {}
var SE = {}
var SMS = {}

PLUGIN.load = function () {
  MT.load()
  SMT.load()
  SE.load()
  SMS.load()
  window.onhashchange()
}

window.onhashchange = function () {
  var hash = window.location.hash.trim()
  if (hash === '#search') {
    MDB.plugin('search.html')
  } else if (hash === '#sms') {
    SMS.render()
//    MDB.plugin('sms.html', SMS.list)
//    MDB.plugin('sms/view?url=' + window.location.pathname + '&s2t=' + MT.getS2t(), SMS.view)
  } else {
    MDB.showBox('viewBox')
  }
}

SMS.load = function () {}

SMS.render = function () {
  console.log('================SMS.render ====================')
//  var s2t = (MT == null) ? '' : MT.getS2t()
  var s2t = (MT.localeChinese()) ? 'e2c' : (MT.locale() === 'English') ? 'c2e' : ''
  MDB.plugin('sms/view?url=' + window.location.pathname + '&s2t=' + s2t, SMS.view)
}

function uuid () { // uuid: Licensed in Public Domain/MIT
  var d = new Date().getTime()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (d + (Math.random() * 16)) % 16 | 0
    d = Math.floor(d / 16)
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

SMS.view = function () {
  var nodes = document.getElementsByClassName('postHtml')
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i]
    var postId = node.id.substr('postHtml'.length)
    var mdNode = id('postMd' + postId)
    node.innerHTML = MDB.md2html(mdNode.value)
  }
}

SMS.post = function (msg) {
  ajaxPost('../../sms/post', {url: window.location.pathname, _id: uuid(), msg: msg, s2t: MT.getS2t()}, function (r) {
    if (r.status === 200) {
//      window.location.hash = '#sms'
//      window.onhashchange()
    }
  }, true)
}

SMS.showReply = function (postId) {
  id('replyArea' + postId).hidden = undefined
  id('replyArea' + postId).focus()
}

SMS.replyAddKeyup = function (postId, msg) {
  window.event.preventDefault()
  if (window.event.keyCode === 13) {
    SMS.replyAdd(postId, msg)
  }
}

SMS.replyEditKeyup = function (postId, replyId, msg, self) {
  window.event.preventDefault()
  if (window.event.keyCode === 13) {
    if (!window.event.ctrlKey) {
      SMS.replyUpdate(postId, {_id: replyId, msg: msg.trim()})
      self.innerHTML = self.innerText.trim()
    }
  }
}

SMS.replyUpdate = function (postId, reply) {
  reply.postId = postId
  ajaxPatch('../../sms/reply', reply, function (r) {
  }, true)
}

SMS.replyAdd = function (postId, msg) {
  var reply = { postId: postId, msg: msg, _id: uuid(), date: new Date(), user: MDB.setting.user } // {postId: postId, _id: uuid(), msg: msg}
  ajaxPost('../../sms/reply', reply, function (r) {
    var user = MDB.setting.user
    if (r.status === 200) {
      id('replyList' + postId).innerHTML += r.responseText
      id('replyArea' + postId).value = ''
    }
  }, true)
}

SMS.editPostToggle = function (postId) {
  var pstyle = id('postMd'+postId).parentNode.style
  var display = pstyle.display
  pstyle.display = (display==='block') ? 'none' : 'block'
}

SMS.editPostSubmit = function (postId) {
//  console.log('editPostSubmit:' + postId)
  var post = { _id: postId, msg: id('postMd'+postId).value }
  ajaxPatch('../../sms/post?id=' + postId, post, function (r) {
    var pstyle = id('postMd'+postId).parentNode.style
    pstyle.display = 'none'
    id('postHtml'+postId).innerHTML = MDB.md2html(post.msg)
  }, true)
}

SMS.deletePost = function (postId) {
  ajaxJob('DELETE', '../../sms/post?id=' + postId, null, function (r) {
    if (r.status === 200) {
      window.alert('Success!')
      id('post' + postId).style.display = 'none'
    } else {
      window.alert('Fail!')
    }
  })
}

SMS.deleteReply = function (postId, replyId) {
  ajaxJob('DELETE', '../../sms/reply?postId=' + postId + '&replyId=' + replyId, null, function (r) {
    if (r.status === 200) {
      window.alert('Success!')
      id('reply' + replyId).style.display = 'none'
    } else {
      window.alert('Fail!')
    }
  })
}

MDB.mt = function (msg) {
  var tmsg = msg
  if (msg.indexOf('=') >= 0) {
    var tokens = msg.split('=')
    var locale = MT.locale()
    msg = (locale === 'Global') ? msg
        : (locale === 'English') ? tokens[0]
        : MT.chineseMt(tokens[1])
//    console.log('mt:tmsg=' + tmsg + ' msg=' + msg)
  }
  return msg
}

MT.getS2t = function() {
  if (MT.locale() === 'Global' ||
     (MT.localeChinese() && ['繁體中文', '简体中文'].indexOf(MDB.setting.locale) >= 0) ||
     (MT.locale() === 'English' && MDB.setting.locale === 'English')) {
     return ''
  } else {
    return (MT.localeChinese()) ? 'e2c' : 'c2e'
  }
}

var mdRewrite0 = MDB.mdRewrite
MDB.mdRewrite = function (md, callback) {
  var isLocalVersion = false
  if (MT.locale() !== 'Global') {
    var mdParts = md.split(/\nchinese:\n/mi) // 英文文章 \chinese:\ 中文文章
    if (mdParts.length >= 2) {
      md = (MT.localeChinese()) ? mdParts[1] : mdParts[0]
      isLocalVersion = true
    }
  }
  if (MT.localeChinese()) md = MT.chineseMt(md)
  var s2t = MT.getS2t()
  if (isLocalVersion || s2t === '') {
    mdRewrite0(md, callback)
  } else {
    SMT.serverMt(md, s2t, 'text', function (mdt) {
      console.log('================== serverMt ===================')
      mdRewrite0(mdt, callback)
    }, false)
  }
}

var render0 = MDB.render
MDB.render = function (locale) {
  if (locale != null) window.localStorage.locale = locale
  id('locale').innerHTML = MT.locale()
  render0()
  if (window.location.hash === '#sms' && SMS != null) SMS.render() // 會遞迴，因為 plugin => render => SMS.render => plugin
}

// 機器翻譯： Client 端
MT.load = function () {
  MT.loadChinese() // 簡繁轉換字典
  id('languageMenu').hidden = undefined
}

MT.localeChinese = function () {
  return ['繁體中文', '简体中文'].indexOf(MT.locale())>=0
}

MT.locale = function () {
  return window.localStorage.locale || 'Global'
}

// ============================= e2c 翻譯中文 ==============================
MT.loadChinese = function () {
  if (window.localStorage.chineseDictionary != null) {
    var chineseDictionary = JSON.parse(window.localStorage.chineseDictionary)
    MT.cn2tw = chineseDictionary.cn2tw
    MT.tw2cn = chineseDictionary.tw2cn
    MDB.bookRender()
    MDB.render()
  } else {
    loadScript('../../chinese.js', function () {
      window.localStorage.chineseDictionary = JSON.stringify({cn2tw: cn2tw, tw2cn: tw2cn})
      MT.cn2tw = cn2tw
      MT.tw2cn = tw2cn
      MDB.bookRender()
      MDB.render()
    })
  }
}

MT.map = function (s, s2t) {
  return s2t[s] || s
}

MT.chineseMt = function (text) {
  var toText = []
  var s2t = (MT.locale() === '繁體中文') ? MT.cn2tw
          : (MT.locale() === '简体中文') ? MT.tw2cn : {}
  for (var i = 0; i < text.length; i++) {
    toText[i] = MT.map(text[i], s2t)
  }
  return toText.join('')
}

SMT.onWatchChange = function () {
  window.localStorage.watchOption = id('watchOption').value
//  console.log('watchOption.value=%s', id('watchOption').value)
  if (id('watchOption').value === 'no') {
    id('watch').hidden = true
  } else {
    id('watch').hidden = undefined
  }
}

// SMT = Server MT
SMT.load = function () { // 伺服端翻譯
  if (window.localStorage.watchOption != null) {
    id('watchOption').value = window.localStorage.watchOption
    SMT.onWatchChange()
  }
  id('watchOption').addEventListener('change', SMT.onWatchChange, false)
  id('editText').addEventListener('click', SMT.editCursorMove, false)
  id('editText').addEventListener('keyup', SMT.editCursorMove, false)
  id('editText').addEventListener('focus', SMT.editCursorMove, false)
}

SMT.serverMt = function (source, s2t, format, callback) {
  ajaxPost('../../mt/' + s2t + '/' + format + '/', {source: source}, function (r) {
//    console.log('serverMt: %s, %s, r.responseText = %s', s2t, format, r.responseText)
    callback(r.responseText.replace(/_/gi, '-')) // .replace(/~/gi, '_'))
  }, false)
}

/*
SMT.rubyMt = function (source, s2t, callback) {
  ajaxPost('../../mt/' + s2t + '/', {source: source}, function (r) {
    var p = JSON.parse(r.responseText)
//    console.log('p=%j', p)
    var toTags = [ '<ruby>' ]
    for (var i = 0; i < p.s.length; i++) {
      if (p.s[i] === '↓') {
        toTags.push('</ruby><br/><ruby>')
      } else {
        toTags.push('&nbsp;' + p.s[i] +
          '<sub class="cut">' + p.cuts[i] + '</sub>' +
          '<rp>(</rp><rt>&nbsp;' + p.t[i] + '</rt><rp>)</rp>')
      }
    }
    toTags.push('</ruby>')
    callback(toTags.join(' '))
  }, false)
}

SMT.plainMt = function (source, callback) {
  var s2t = (MT.localeChinese()) ? 'e2c' : 'c2e'
  ajaxPost('../../mt/' + s2t + '/', {source: source}, function (r) {
    console.log('plainMt: r.responseText = %s', r.responseText)
    var p = JSON.parse(r.responseText)
    var toTags = []
    for (var i = 0; i < p.s.length; i++) {
      if (p.tags[i] === '.') {
        if (p.s[i] === '↓') {
          toTags.push('\n')
        } else {
          toTags.push(p.t[i])
        }
      } else { // if (/^[a-z]$/.test(p.en[i])){
        toTags.push(p.t[i] + ' ')
      }
//      if (p.cuts[i]) toTags.push('~' + p.tags[i] + '~')
    }
    callback(toTags.join('').replace(/_/gi, '-')) // .replace(/~/gi, '_'))
  }, false)
}
*/
SMT.cursorMove = function (box) {
  var s2t = id('watchOption').value
  if (s2t === 'no') return
//  console.log('cursorMove')
  var pos = box.selectionStart
  var text = ' ' + box.value
  for (var i = pos + 1; i > 0; i--) {
    if (/[，。？,;.!\n]/.test(text[i])) {
      break
    }
  }
  i = Math.max(i, 0)
  var m = text.substring(i + 1).match(/^.*?[，。？,;.!\n]/)
  if (m !== null) {
    var sentence = m[0]
    SMT.serverMt(sentence, s2t, 'ruby', function(html) {
      id('watch').innerHTML = html
    })
/*    
    SMT.rubyMt(sentence, s2t, function (html) {
      id('watch').innerHTML = html
    })
*/    
  }
  return pos
}

SMT.editCursorMove = function () {
  SMT.cursorMove(id('editText'))
}

// ===================== SE : Search Engine =============================
SE.load = function () {}

SE.searchKeyup = function (event) {
  event.preventDefault()
  if (event.keyCode === 13) {
    var key = id('searchQuery').value
    SE.search(key)
  }
}

SE.doSearch = function () {
  var key = id('searchQuery').value
  SE.search(key)
}

SE.search = function (key) {
  ajaxGet('../../search?key=' + key + '', function (r) {
    if (r.status !== 200) {
      window.alert(MDB.mt('Search Fail!=搜尋失敗!'))
      return
    }
    var results = JSON.parse(r.responseText)
    var lines = []
    for (var i = 0; i < results.length; i++) {
      lines.push('<h3><a href="../../view/' + results[i].path + '">' + results[i].path + '</a></h3>')
      var robj = results[i].text || results[i].json
      var text = JSON.stringify(robj)
      lines.push('<p>' + text.replace(/\n/gi, '') + '</p>')
    }
    id('searchBox').innerHTML = lines.join('\n')
  })
}

/*

SMS.replyHtml = function (postId, reply, user) {
  var replyOp = (reply.user === user) ? `<i class="fa fa-times" title="delete" onclick="SMS.deleteReply('${postId}','${reply._id}')"></i>` : ``

  return `
<div id="reply${reply._id}" class="reply">
  <div contenteditable="true" class="replyMsg" onkeyup="SMS.replyEditKeyup('${postId}', '${reply._id}', this.innerText, this)">${reply.msg}</div>
  <div style="float:right">
    <i class="fa fa-user" title="Author"></i>
    <a href="/view/${reply.user}">${reply.user}</a>
    ${replyOp}
    <i class="fa fa-clock-o" title="${reply.date}"></i>
  </div>
</div>
`
}
*/
/*
TE = {}

TE.compile = function (template){
  var evalExpr = /<%=(.+?)%>/g;
  var expr = /<%([\s\S]+?)%>/g;

  template = template
    .replace(evalExpr, '`); \n  echo( $1 ); \n  echo(`')
    .replace(expr, '`); \n $1 \n  echo(`');

  template = 'echo(`' + template + '`);';

  var script =
  `(function parse(data){
    var output = "";

    function echo(html){
      output += html;
    }

    ${ template }

    return output;
  })`;

  return script;
}

TE.macro = function (template) {
  return eval(TE.compile(template))
}

var replyTemplate = `
<div id="reply<%data.reply._id%>" class="reply">
<div contenteditable="true" class="replyMsg" onkeyup="SMS.replyEditKeyup('<%data.postId%>\', \'<%data.reply._id%> this.innerText)"><%data.reply.msg%></div>
<div style="float:right">
 <i class="fa fa-user" title="Author"></i>
 <a href="/view/<%data.reply.user%>"><%data.reply.user%></a>
 <%if(data.reply.user === data.user) {%>
  <i class="fa fa-times" title="delete" onclick="SMS.deleteReply(\'<%data.postId%>\',\'<%data.reply._id%>\')"></i> &nbsp;
 <%}%>
 <i class="fa fa-clock-o" title="<%data.reply.date%>"></i>
 </div>
</div>
`

SMS.replyMacro = TE.macro(replyTemplate)

var templateEngine = function (html, options) {
  var re = /<%(.+?)%>/g
  var reExp = /(^( )?(var|if|for|else|switch|case|break|{|}|;))(.*)?/g
  var code = 'with(obj) { var r=[];\n'
  var cursor = 0
  var	result, match

  html = html.replace(/\n/g, '↓').replace(/\t/g, '→').replace(/\r/g, '')

  var add = function (line, js) {
    js ? (code += line.match(reExp) ? line + '\n' : 'r.push(' + line + ');\n')
       : (code += line !== '' ? 'r.push("' + line.replace(/"/g, '\\"') + '");\n' : '')
    return add
  }
  while (match = re.exec(html)) {
    add(html.slice(cursor, match.index))(match[1], true)
    cursor = match.index + match[0].length
  }
  add(html.substr(cursor, html.length - cursor))
  code = (code + 'return r.join(""); }')
  try {
    console.log('code=' + code)
    result = new Function('obj', code).apply(options, [options])
    result = result.replace(/↓/g, '\n').replace(/→/g, '\t')
  } catch (err) { console.error(err.message, ' in \n\nCode:\n', code, '\n') }
  return result
}

SMS.replyTemplate =
    '<div id="reply<%this.reply._id%>" class="reply">\n' +
    ' <div contenteditable="true" class="replyMsg" onkeyup="SMS.replyEditKeyup(\'<%this.postId%>\', \'<%this.reply._id%>\', this.innerText)"><%this.reply.msg%></div>\n' +
    ' <div style="float:right">\n' +
    '  <i class="fa fa-user" title="Author"></i>\n' +
    '  <a href="/view/<%this.reply.user%>"><%this.reply.user%></a>\n' +
    ' <%if(this.reply.user === this.user) {%>' +
    '  <i class="fa fa-times" title="delete" onclick="SMS.deleteReply(\'<%this.postId%>\',\'<%this.reply._id%>\')"></i> &nbsp;\n' +
    ' <%}%>' +
    '  <i class="fa fa-clock-o" title="<%this.reply.date%>"></i>\n' +
    ' </div>\n' +
    '</div>\n'


SMS.replyHtml = function (postId, reply, user) {
  var editHtml = (user !== reply.user) ? '' :
//    '  <i class="fa fa-pencil-square-o" aria-hidden="true" title="edit" onclick="SMS.editReply(\'' + postId + ',' + reply._id + '\')"></i> &nbsp;\n' +
    '  <i class="fa fa-times" aria-hidden="true" title="delete" onclick="SMS.deleteReply(\'' + postId + '\',\'' + reply._id + '\')"></i> &nbsp;\n'

  return '<div id="reply' + reply._id + '" class="reply">\n' +
    ' <div contenteditable="true" class="replyMsg" onkeyup="SMS.replyEditKeyup(\'' + postId + '\', \'' + reply._id + '\', this.innerText)">' + reply.msg + '</div>\n' +
    ' <div style="float:right">\n' +
    '  <i class="fa fa-user" aria-hidden="true" title="Author"></i>\n' +
    '  <a href="/view/' + reply.user + '">' + reply.user + '</a>\n' +
    editHtml +
    '  <i class="fa fa-clock-o" aria-hidden="true" title="' + reply.date + '"></i>\n' +
    ' </div>\n' +
    '</div>\n'
}
*/

//  <div contenteditable="true" class="replyMsg" onkeyup="SMS.replyEditKeyup('{{../_id}}', '{{_id}}', this.innerText)">{{msg}}</div>

/*
SMS.postHtml = function (post, replyHtml) {
  return '<div id="post' + post._id + '" class="postDiv">' +
        ' <label class="mt" data-mt="Post=訊息"></label> : ' +
        ' <div style="float:right">' +
        ' <i class="fa fa-user" aria-hidden="true" title="Author"></i> <a href="/view/' + post.user + '/">' + post.user + '</a> &nbsp; ' +
        ' <i class="fa fa-pencil-square-o" aria-hidden="true" title="edit" onclick="SMS.editPostToggle(\'' + post._id + '\')"></i>&nbsp;' +
        ' <i class="fa fa-times" aria-hidden="true" title="delete" onclick="SMS.deletePost(\'' + post._id + '\')"></i>&nbsp' +
        ' <i class="fa fa-clock-o" aria-hidden="true" title="' + post.date + '"></i>\n' +
        ' </div>' +
        ' <div style="display:none">' +
        '   <textarea id="postMd' + post._id + '">' + post.msg + '</textarea>\n' +
        '   <button type="button" class="pure-button mt" data-mt="Submit=送出修改" onclick="SMS.editPostSubmit(\'' + post._id +'\')"></button>' +
        ' </div>' +
        ' <div id="postHtml' + post._id +'" class="post">' + MDB.md2html(post.msg) + '</div>\n' +
        ' <div id="replyList' + post._id + '">\n' + replyHtml + '</div>\n' +
        ' <div> '+
        '  <div><a class="mt" onclick="SMS.showReply(\'' + post._id + '\')" data-mt="Reply=新增回應">Add</a></div>' +
        '  <textarea id="replyArea' + post._id + '" class="replyArea" onkeyup="SMS.replyAddKeyup(\'' + post._id + '\', this.value)"></textarea>' +
        ' </div>' +
        '</div>'
}
*/
/*
SMS.list = function (filter) {
  window.location.hash = '#sms'
  console.log('filter=', filter)
  filter = filter || {}
  var url = filter.url || window.location.pathname 
  console.log('url=', url)
  ajaxGet('../../plugin/sms/view?url=' + url, function (r) {
    if (r.status !== 200) {
      window.alert(MDB.mt('SMS List Fail!=留言列表失敗!'))
      return
    }
    MDB.mtRender()
  })
}
*/
/*
SMS.list = function (filter) {
  window.location.hash = '#sms'
  console.log('filter=', filter)
  filter = filter || {}
  var url = filter.url || window.location.pathname 
  console.log('url=', url)
  ajaxGet('../../sms/list?url=' + url, function (r) {
    if (r.status !== 200) {
      window.alert(MDB.mt('SMS List Fail!=留言列表失敗!'))
      return
    }
    var htmlPosts = []
    var posts = JSON.parse(r.responseText)
    for (var i = 0; i < posts.length; i++) {
      var post = posts[i]
      var replys = post.replys || []
      var htmlReplys = [ '<div><label class="mt" data-mt="reply=回應">reply</label> : </div>' ]
      for (var ri = 0; ri < replys.length; ri++) {
        var reply = replys[ri]
        htmlReplys.push(SMS.replyHtml(post._id, reply, MDB.setting.user))
      }
      htmlPosts.push(SMS.postHtml(post, htmlReplys.join('\n')))
    }
    id('posts').innerHTML = htmlPosts.join('\n')
    MDB.mtRender()
  })
}
*/
