function loadMenuFiles(folder) {
  // remove previous menu
  let menu = document.getElementById('menu')
  while (menu.firstChild)
    menu.removeChild(menu.firstChild)
  // load new menu
  fs.readdir(folder, (error, files) => {
    if (error) throw error
    for (let file of files) {
      if (fs.statSync(path.join(folder, file)).isFile()) {
        let xmlString = fs.readFileSync(path.join(folder, file), 'utf8')
        const xmlDoc = new DOMParser().parseFromString(
          xmlString.charCodeAt(0) === 0xFEFF ? // BOM
          xmlString.substring(1) : xmlString, 'text/xml')
        for (let subMenu of xmlDoc.children) {
          appendSubMenu(subMenu, menu)
        }
      }
    }
  })
}

// append submenu to root node
function appendSubMenu(subMenu, parentMenu) {
  let node = document.createElement('div')
  if (subMenu.children.length) {
    node.innerHTML = `<span class="branch expanded">${subMenu.attributes.title.value}</span>`
    for (let item of subMenu.children) {
      appendSubMenu(item, node)
    }
  } else {
    let onclick = 'onclick='
    if (subMenu.attributes.class) switch (subMenu.attributes.class.value) {
      case 'task':
        onclick += `"loadTask('${path.join(rootDir, 'Task', subMenu.attributes.order.value + '.xml').replace(/\\/g, '\\\\')}')"`
        break;
      case 'view':
        onclick += `"loadView('${path.join(rootDir, 'View', subMenu.attributes.order.value + '.xml').replace(/\\/g, '\\\\')}')"`
        break;
    } else {
      onclick = ''
    }
    node.innerHTML = `<span class="item" ${onclick}>${subMenu.attributes.title.value}</span>`
  }
  parentMenu.appendChild(node)
}

document.getElementById('search').addEventListener('input', function () {
  for (let hit of document.getElementsByClassName('hit')) {
    hit.classList.remove('hit')
  }
  let term = $(this).val().trim()
  if (term) {
    let words = term.split(' ').map(word => new RegExp(word, 'i'))
    let pattern = new RegExp('(' + term.replace(/ /g, '|') + ')', 'ig')
    $('.branch, .item').each(function (i) {
      let text = this.textContent
      let hit = true
      for (let word of words) {
        hit &= word.test(text)
      }
      this.innerHTML = hit ? text.replace(pattern, '<mark>$1</mark>') : text
    })
    $('#menu div').show()
    $('#menu div').not(':has(mark)').hide()
    $($('.item:has(mark)')[0]).addClass('hit')
  } else {
    $('.branch, .item').each(function (i) {
      this.innerHTML = this.textContent
    })
    $('#menu div').show()
    $('#menu div div').hide()
  }
  setBranchIcons(document.body)
})

function setBranchIcons(root) {
  $('.branch', root).each(function (i) {
    if ($(this).siblings(':hidden').length === 0)
      this.className = 'branch expanded'
    else if ($(this).siblings().not(':hidden').length === 0)
      this.className = 'branch collapsed'
    else
      this.className = 'branch filtered'
  })
}

$('#search').on('keydown', event => {
  switch (event.originalEvent.code) {
    case 'ArrowDown':
    case 'ArrowUp':
    case 'Enter':
      event.preventDefault();
      let $hits = $('.item:has(mark)')
      if ($hits.length > 0) {
        let index = $hits.index($('.hit')[0])
        switch (event.originalEvent.code) {
          case 'ArrowDown':
            if (index < $hits.length - 1) {
              $('.hit').removeClass('hit')
              $($hits.eq(index + 1)).addClass('hit')
            }
            break;
          case 'ArrowUp':
            if (index > 0) {
              $('.hit').removeClass('hit')
              $($hits.eq(index - 1)).addClass('hit')
            }
            break;
          case 'Enter':
            $('.hit').click()
            break;
        }
      }
  }
})

$('#search').on('blur', _ => {
  $('.hit').removeClass('hit')
})

$(document.body).on('click', '.branch', function () {
  if (window.getSelection().type !== 'Range') {
    if ($(this).hasClass('expanded')) {
      $('div', this.parentNode).hide()
      this.className = 'branch collapsed'
    } else {
      $(this).siblings().show()
      this.className = 'branch expanded'
    }
    setBranchIcons(this.parentNode)
  }
})

function localizePage() {
  $('[data-title]').forEach(_ => {
    $(this).prop('title', literal[$(this).attr('data-title')])
  })
  $('#FAVORITES > a').text(literal['FAVORITES'])
}

$('#language').change(_ => {
  alert('language change')
  /*
  $.post '/AJAX/Profile.php', 'language=' + $(this).val()
   .always ->
     $.when(parent.loadDictionary()).done ->
       localizePage()
       $('iframe', parent.document).each ->
         thiscontentWindow.localizePage?()
  */
})

function setStartupPage(really) {
  alert('setStartupPage')
}
/*
  startup = { 'Task' : '' , 'Data' : '' }
  if really
     unless parent.isClosed 'Task'
       frame = parent.frames['Task']
       subID = '&id=' + frame.task?.subtask
       if paramMain = /[\\?&]main=([^&#]*)/.exec frame.location.search
          startup.Task = frame.location.href.replace paramMain[0], subID
       else
          startup.Task = frame.location.href
          if frame.task?.subtask \
          and not /[\\?&]id=([^&#]*)/.exec frame.location.search
              startup.Task += subID

     unless parent.isClosed 'Data'
       startup.Data = parent.frames['Data'].location.href

  $.post '/AJAX/Profile.php',
         'startup_task=' + encodeURIComponent startup.Task
  $.post '/AJAX/Profile.php',
         'startup_data=' + encodeURIComponent startup.Data
*/

// MENU ITEMS

function highLight(item) { // <A>
  $('a').removeClass('selected')
  $(item).addClass('selected').blur() // remove focus decoration
}

// Lock or Unlock menu element from collapse/expansion
// Lock makes the menu element always displayed
function lockMenu(icon) { // <SPAN>
  $(icon).toggleClass('locked')
  //saveLocks()
  return false // disable context menu
}

// Display submenu elements based on lock and/or selection
function displayMenu(submenu) { // <DIV>
  $(submenu).find('div').toArray().reverse().forEach(div => {
    if ($(div).children('span').hasClass('locked') ||
      $(div).children('a').hasClass('selected'))
      $(div).addClass('display')
    if ($(div).hasClass('display')) {
      $(div).parent().addClass('display')
      $(div).removeClass('display').show()
    } else {
      $(div).hide()
    }
  })
  $(submenu).removeClass('display')
}

// Expand or Collapse submenu
function expandMenu(icon) { // <SPAN>
  expand = false
  for (child of $(icon.parentNode).children('div').filter(':hidden')) {
    $(child).show('fast')
    expand = true
  }
  if (!expand)
    displayMenu(icon.parentNode)
}

// Regular search
function searchMenu(really) { // false resets the menu
  if ($('#search_field').val())
    filter = new RegExp($('#search_field').val(), 'im')
  else
    really = false

  for (each of $('body > div')) {
    titles = $(each).find('a')
    titles.removeClass('selected')
    if (really)
      for (title of titles)
        if (filter.test(title.textContent))
          $(title).addClass('selected')
    displayMenu(this)
  }
  $('#search_field').focus()
  return false // disable context menu
}

// FAVORITES
/*

saveFavorites = ->
  Favorites = ''
  $('#FAVORITES > div a').each ->
    href = $(this).attr('href').split '?'
    file = href[0].split '.'
    order = if file[0] in ['Table', 'Task', 'Tree', 'View']
      file[0].toLowerCase() + '" order="' +
      href[1]?.slice 1 + href[1]?.indexOf '='
    else
      'link" order="' + $(this).attr 'href'
    Favorites += """
      <menu title="#{$(this).text()}" class="#{order}"
       frame="#{$(this).attr 'target'}"/>
      """ #"# Notepad2
  $.post '/AJAX/Menu.php',
         'menu_save_favorites=' + encodeURIComponent Favorites

addFavorite = (item) ->
  anchor = $(item).next()
  favoriteText = prompt literal['Add to Favorites:'], $(anchor).text()
  if favoriteText
     # Lookup identical favorite
     for i in $('#FAVORITES > div a') when $(i).text() is favoriteText
       $(i).parent().hide()
       favorite = i
     unless favorite?
       $('#FAVORITES').append """
         <div style="display:none"><span class="item"
          oncontextmenu="return lockMenu(this)"
          ondblclick="removeFavorite(this)"></span><a
          onclick="highLight(this)" href="#{$(anchor).attr 'href'}"
          target="#{$(anchor).attr 'target'}">#{favoriteText}</a></div>
         """ #"# Notepad2
       favorite = $('#FAVORITES a').last()
       saveFavorites()
     highLight favorite
     expandMenu $('#FAVORITES > span')[0]

removeFavorite = (item) -> # SPAN
  if confirm literal['Remove favorite?']
     $(item).parent().hide 'fast', ->
       $(item).parent().remove()
       saveFavorites()

# REORDER FAVORITES

$('#FAVORITES').on 'dragstart', 'a', (event) ->
  event.target.id = 'dragged'

$('#FAVORITES').on 'dragend', 'a', (event) ->
  event.target.id = null

$('#FAVORITES').on 'dragenter', 'a', (event) ->
  event.preventDefault()
  event.stopPropagation()
  $(event.target).css 'border-top', 'solid 2px black'

$('#FAVORITES').on 'dragover', 'a', (event) ->
  event.preventDefault()
  event.stopPropagation()

$('#FAVORITES').on 'dragleave', 'a', (event) ->
  event.preventDefault()
  event.stopPropagation()
  $(event.target).css 'border-top', ''

$('#FAVORITES').on 'drop', 'a', (event) ->
  event.preventDefault()
  event.stopPropagation()
  $(event.target).css 'border-top', ''
  $('#dragged').parent().insertBefore $(event.target).parent()
  saveFavorites()
*/

// LOCKS
/*

saveLocks = ->
  locks = []
  $('body > div').each ->
    $('span.locked', this).each ->
      a = $(this).next()
      p = $(this).parent().parent()
      lock =
        class : 'submenu'
        title : $(a).text()
        parent : $(p).attr('id')
      if lock.parent isnt 'FAVORITES'
        lock.parent = $(p).children('a').text()
      if $(this).hasClass 'item'
        lock.class = 'item'
        lock.href = $(a).attr 'href'
        lock.target = $(a).attr 'target'
      locks.push lock

  $.post '/AJAX/Menu.php',
         'menu_save_locks=' + encodeURIComponent JSON.stringify locks

# On load restore locks
$(document).ready ->
  $.when(parent.loadDictionary()).done localizePage
  if window.location.hostname.toLowerCase() is 'cms4test'
     $('body').css 'background',
       'url(/CSS/Menu/Menu_test.png) no-repeat top right fixed'
  try
    $.post '/AJAX/Menu.php', 'menu_restore_locks=', (data) ->
      locks = JSON.parse data
      for lock in locks
        if lock.class is 'item'
           $('body > div')
           .find('a[href="' + lock.href + '"][target="' + lock.target + '"]')
           .each ->
             if $(this).text() is lock.title
                if lock.parent is 'FAVORITES'
                   if $(this).parent().parent().attr('id') is 'FAVORITES'
                      $(this).prev().toggleClass 'locked'
                else
                   if lock.parent is $(this).parent().parent().children('a').text()
                      $(this).prev().toggleClass 'locked'
        else # submenu
          $('body > div').find('span.submenu').each ->
            if  $(this).next().text() is lock.title \
            and $(this).parent().parent().children('a').text() is lock.parent
                $(this).toggleClass 'locked'
      searchMenu()
  catch
    saveLocks()
*/