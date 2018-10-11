localizePage = ->
  $('[data-title]').each ->
    $(@).prop 'title', literal[$(@).attr 'data-title']
  $('#FAVORITES > a').text literal['FAVORITES']

$('#language').change ->
  $.post '/AJAX/Profile.php', 'language=' + $(@).val()
   .always ->
     $.when(parent.loadDictionary()).done ->
       localizePage()
       $('iframe', parent.document).each ->
         @contentWindow.localizePage?()

setStartupPage = (really) -> # set or erase startup page
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

# MENU ITEMS

highLight = (item) -> # A
  $('a').removeClass 'selected'
  $(item).addClass('selected').blur() # remove focus decoration

# Lock or Unlock menu element from collapse/expansion
# Lock makes the menu element always displayed
lockMenu = (icon) -> # SPAN
  $(icon).toggleClass 'locked'
  saveLocks()
  off # context menu

# Display submenu elements based on lock and/or selection
displayMenu = (submenu) -> # DIV
  for items in $(submenu).find('div').toArray().reverse()
      its = $(items)
      if its.children('span').hasClass('locked') \
      or its.children('a').hasClass('selected')
         its.addClass 'display'
      if its.hasClass 'display'
         its.parent().addClass 'display'
         its.removeClass('display').show()
      else
         its.hide()
  $(submenu).removeClass 'display'

# Expand or Collapse submenu
expandMenu = (icon) -> # SPAN
  expand = false
  $(icon.parentNode).children('div').filter(':hidden').each ->
    $(@).show 'fast'
    expand = true
  displayMenu icon.parentNode unless expand

# Regular search
searchMenu = (really) -> # false resets the menu
  if $('#search_field').val()
     filter = new RegExp $('#search_field').val(), 'im'
  else
     really = false

  $('body > div').each ->
    titles = $(@).find 'a'
    titles.removeClass 'selected'
    if really
       for title in titles when filter.test title.textContent
         $(title).addClass 'selected'
    displayMenu @

  $('#search_field').focus()
  off # context menu

# FAVORITES

saveFavorites = ->
  Favorites = ''
  $('#FAVORITES > div a').each ->
    href = $(@).attr('href').split '?'
    file = href[0].split '.'
    order = if file[0] in ['Table', 'Task', 'Tree', 'View']
      file[0].toLowerCase() + '" order="' +
      href[1]?.slice 1 + href[1]?.indexOf '='
    else
      'link" order="' + $(@).attr 'href'
    Favorites += """
      <menu title="#{$(@).text()}" class="#{order}"
       frame="#{$(@).attr 'target'}"/>
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

# LOCKS

saveLocks = ->
  locks = []
  $('body > div').each ->
    $('span.locked', @).each ->
      a = $(@).next()
      p = $(@).parent().parent()
      lock =
        class : 'submenu'
        title : $(a).text()
        parent : $(p).attr('id')
      if lock.parent isnt 'FAVORITES'
        lock.parent = $(p).children('a').text()
      if $(@).hasClass 'item'
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
             if $(@).text() is lock.title
                if lock.parent is 'FAVORITES'
                   if $(@).parent().parent().attr('id') is 'FAVORITES'
                      $(@).prev().toggleClass 'locked'
                else
                   if lock.parent is $(@).parent().parent().children('a').text() 
                      $(@).prev().toggleClass 'locked'
        else # submenu
          $('body > div').find('span.submenu').each ->
            if  $(@).next().text() is lock.title \
            and $(@).parent().parent().children('a').text() is lock.parent
                $(@).toggleClass 'locked'
      searchMenu()
  catch
    saveLocks()
