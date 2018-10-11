displayMessage = (message, warning) ->
  $('#message-text').text literal[message] ? message
  box = { on : 'ui-state-error', off : 'ui-state-highlight' }
  icon = { on : 'ui-icon-warning', off : 'ui-icon-info' }
  $('#message-box').removeClass(box[!warning]).addClass box[warning]
  $('#message-icon').removeClass(icon[!warning]).addClass icon[warning]
  $('header > span').css
    width : "calc(100% - #{$('header > div').width() + 20}px)"
  
$(document).ready ->
  if self isnt top # document is in an iframe
    $ '<img src="/CSS/UpDown.png"
        onclick="parent.closeFrame(window.name)"
        oncontextmenu="return parent.toggleFrame(window.name)"/>'
    .prependTo 'header span:first'

refreshOption = (folder, file, id) ->
  $.post '/AJAX/Form.php',
       'form_options=' + encodeURIComponent JSON.stringify {
               'folder': folder, 'file': file, 'field': id }
  .done (data) ->
     options[id] = JSON.parse data
     $('#' + id).blur()
     CollectGarbage()

refreshFrame = ->
  displayMessage 'Refreshing Frame Data', false
  script = location.pathname.substring location.pathname.lastIndexOf('/') + 1
  if script is 'Tree.php'
     location.reload()
  if script is 'Table.php' or script is 'Form.php'
    # Reload Options
    folder = 'Table'
    if param = /[\\?&]table=([^&#]*)/.exec location.search
       file = decodeURIComponent param[1].replace /\+/g, ' '
    else
       folder = 'Form'
       file = $('[name="form-name"]')?.val()
    for id of options
        refreshOption folder, file, id
  # Reload Data
  if script is 'Table.php' or script is 'View.php'
    $.post '/AJAX/View.php', location.search.split('?')[1]
     .done (data) ->
       try
         `data_rows = JSON.parse(data)` # access global variable
         for rows in data_rows then for cell, i in rows.data 
             rows.data[i] = '' if cell is null or '{}' is JSON.stringify cell
         filterTable $('#filter-row input')[0]
       catch error
         displayMessage 'JSON error: ' + error.message, true
     .fail (jqXHR, textStatus) ->
       displayMessage errorThrown, true
     .always ->
       $(window).resize().scroll()
       CollectGarbage()
  else
    displayMessage 'OK', false
