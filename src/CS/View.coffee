data_rows = [] # [ { "data" : [], "id" : [], "display" : boolean } ]

### CONSIDER THE FOLLOWING SUBSETS OF THE DATA ROWS:
 1. EXISTING ROWS ( the entire data_rows array )      ==> SORTING
 1. ==> 2.                                                FILTERING
 2. FILTERED ROWS ( whose "display" attribute is ON ) ==> EXPORTING
 2. ==> 3.                                                DISPLAYING
 3. DISPLAYED ROWS ( actually seen on the screen )    ==> STRIPING
 3. ==> 3.                                                SCROLLING, RESIZING, ZOOMING
 4. ACTIVE ROW                                        ==> AUTOMATION
###

# SORTING FUNCTION applied to EXISTING ROWS

cutSpan = (data) ->
  return data ? '' unless typeof data is 'string'
  data.replace(/<span[^>]*>/, '').replace '</span>', ''

sortTable = (titleTD) ->
  $('form').prop 'disabled', yes
  displayMessage 'SORTING'
  sc = # sorting class
    true : UP = 'ui-icon-circle-triangle-n'
    false : 'ui-icon-circle-triangle-s'
  if $('div.ui-icon', titleTD).length
     data_rows.reverse()
     up = $('div.ui-icon', titleTD).hasClass UP
     $('div.ui-icon', titleTD).switchClass sc[up], sc[!up]
  else
     $('#title-row div.ui-icon').remove()
     index = $(titleTD).index()
     if $('colgroup').children()[index--].className is 'number'
        data_rows.sort (a, b) -> switch
          when a.data[index] is b.data[index] then 0
          when a.data[index] is '' then -1
          when b.data[index] is '' then 1
          else parseFloat(a.data[index]) - parseFloat(b.data[index])
     else if $('#editor-row td').eq(index).find('.selection').length > 0
       id = $('#editor-row td').eq(index).find('.selected').attr 'id'
       data_rows.sort (a, b) ->
         if a = a.data[index] then a = cutSpan a unless options[id][a]
         if b = b.data[index] then b = cutSpan b unless options[id][b]
         a.localeCompare b
     else
       data_rows.sort (a, b) ->
         a = cutSpan a.data[index]
         b = cutSpan b.data[index]
         a.localeCompare b
     $(titleTD).append '<div class="ui-icon ' + UP + '"></div>'
  displayRows 0
  displayMessage filtered
  $('form').prop 'disabled', no

# FILTERING FUNCTION AND EVENTS applied to EXISTING ROWS producing FILTERED ROWS

filtered = 0 # numbers of filtered, displayable rows

filterTable = (actual_filter) -> # clears filters if null
  $('form').prop 'disabled', yes
  displayMessage 'FILTERING'
  rows.display = on for rows in data_rows
  if actual_filter
    if $('#regular').is ':checked'
      match = (filter, data) -> filter.test(data)
    else
      match = (filter, data) -> 0 <= data.toLowerCase().indexOf filter
    $('#filter-row input').each (i) ->
      if @value isnt ''
        if $('#regular').is ':checked'
          filter = new RegExp @value, 'im'
        else
          filter = @value.toLowerCase()
        for rows in data_rows when rows.display is on
          rows.display = match filter, cutSpan(rows.data[i]).toString().replace /\n/g, ''
    filtered = 0
    filtered += rows.display for rows in data_rows
  else # clear filters
    $('#filter-row input').val ''
    filtered = data_rows.length
  displayRows 0
  displayMessage filtered
  $('form').prop 'disabled', no
  if actual_filter and document.activeElement.nodeName isnt 'INPUT'
    $(actual_filter).focus()

$('#filter-row input').on 'change', -> filterTable @

$('#filter-row input').on 'keyup', (event) ->
  if event.keyCode is 13
    event.preventDefault()
    $(@).blur().focus()

$('#filter-row input').on 'drop', (event) ->
  $(@).val event.originalEvent.dataTransfer.getData 'Text'
  filterTable @
  off

$('#filter-row input').on 'mouseup', (event) -> # clear filter by clear button
  if $(@).val() # previous content
     setTimeout => $(@).blur().focus()  if $(@).val() is '' # new content

$('#filter-row input').on 'contextmenu', ->
  filter_index = $('#filter-row input').index @
  filter_list = {}
  for rows in data_rows when rows.display is on
      filter_list[rows.data[filter_index]] = true
  datalist = $ '<datalist id="filter-list"></datalist>'
  for key in Object.keys(filter_list).sort()
      if key
         $(datalist).append '<option>' + key + '</option>'
      else
         $(datalist).prepend '<option>^$</option>'
  $(@).after datalist
  $(@).attr 'list', 'filter-list'
  $(@).focus()
  off # context menu

$('#filter-row input').on 'input', (event) ->
  for o in $('#filter-list option').toArray() when $(o).val() is $(@).val()
    $(@).blur()
    setTimeout => $(@).focus()

$('#filter-row input').on 'blur', (event) ->
  $('#filter-list').remove()
  $('#filter-row input').removeAttr 'list'

# EXPORTING TO EXCEL applied to FILTERED ROWS

exportView = ->
  $('form').prop 'disabled', yes
  $.when displayMessage 'EXPORTING'
  .then ->
    data = []
    $('#title-row td').each (i) ->
      data.push new ActiveXObject 'Scripting.Dictionary'
      data[i].Add 0, @textContent

    long_data = [] # exceptions
    next = 1
    for row in data_rows when row.display is on
      $.each data, (i, cell) ->
        value = $("<div>#{row.data[i]}</div>").text()
        if value.length >= 255
          long_data.push
            row: next + 1
            column: i + 1
            data: value
          cell.Add next, ''
        else
          cell.Add next, value
      next++

    # Engage Excel
    ExcelApp   = new ActiveXObject 'Excel.Application'
    ExcelBook  = ExcelApp.Workbooks.Add()
    ExcelSheet = ExcelBook.ActiveSheet
    ExcelCells = ExcelSheet.Cells
    
    ExcelCells.NumberFormat = '@' # Text Format

    for c in [0...data.length]
      startCell = ExcelCells 1, c + 1
      endCell   = ExcelCells data[0].Count, c + 1
      dataRange = ExcelSheet.Range startCell, endCell
      dataRange.Value = ExcelApp.WorksheetFunction.Transpose data[c].Items()
    
    # Completing with exceptionally long data
    for cell in long_data
        ExcelCells(cell.row, cell.column).value = cell.data

    ExcelCells.EntireColumn.AutoFit()
    ExcelCells.EntireRow.AutoFit()
    startCell = ExcelCells 1, 1
    endCell   = ExcelCells data[0].Count, data.length
    ExcelSheet.ListObjects.Add 1, ExcelSheet.Range(startCell, endCell), 0, 1
    .Name = 'CMDB'

    # Release Excel
    ExcelApp.Visible     = on
    ExcelApp.UserControl = on
    ExcelCells = null
    ExcelSheet = null
    ExcelBook  = null
    ExcelApp   = null

    setTimeout CollectGarbage

    displayMessage filtered
    $('form').prop 'disabled', no

# DISPLAYING FUNCTIONS applied to FILTERED ROWS producing DISPLAYED ROWS

next_row = 0 # array index + 1 of last displayed row
top_height = Math.round $('header').outerHeight(true) +
                        $('#head-table').outerHeight(true)

displayRows = (row_index) -> # row_index of DISPLAYABLE ROWS: inverted scrollbar value
  next_row = 0
  # Find the first row to display
  while row_index and next_row < data_rows.length
      row_index -= data_rows[next_row++].display
  while next_row < data_rows.length and not data_rows[next_row].display
      next_row++
  # Display rows from next_row
  $('#data-table tbody').html ''
  $('html, body').scrollTop 0
  appendRows()
  stripeTable()

bottom = $(window).innerHeight() - top_height
bottom_reached = no # if no more rows to display AND table_bottom = window_bottom

otherColor = (td) ->
  if 'rgb(255, 255, 255)' is $(td).css 'background-color'
     'lightgray'
  else
     'white'

appendRows = -> # append filtered rows until window_bottom or end of data_rows
  while $('#data-table').height() < bottom and next_row < data_rows.length
    if data_rows[next_row].display
      table_row = $ window.data_row
      $(table_row).data 'index', next_row
      $('td', table_row).each (data_index) ->
         $(@).html data_rows[next_row].data[data_index]
      if $('#striped').is ':checked'
         $('td', table_row).css 'background-color',
                     otherColor '#data-table tr:last td'
      $('#data-table tbody').append table_row
    next_row++
  if $('#data-table').height() < bottom # end of data_rows
    scrollToBottom()
  else
    bottom_reached = false
  alignScrollbar()

scrollToBottom = ->
  next_row = data_rows.length
  while $('#data-table').height() <= bottom and prependRow() then;
  if bottom_reached = $('#data-table').height() > bottom
    $('html').scrollTop Math.ceil($('body').height() * zoom_factor) - bottom
  alignScrollbar()

prependRow = ->
  row_index = if $('#data-table tr').length
                 $('#data-table tr:first').data 'index'
              else
                 data_rows.length
  while --row_index >= 0 and not data_rows[row_index].display then; # find the first displayable row
  if row_index >= 0
    table_row = $ window.data_row
    table_row.data 'index', row_index
    $('td', table_row).each (data_index) ->
       $(@).html data_rows[row_index].data[data_index] # array index; absolute row index
    if $('#striped').is ':checked'
       $('td', table_row).css 'background-color',
                   otherColor '#data-table tr:first td'
    $(table_row).prependTo '#data-table tbody'
    true
  else
    false

# STRIPING FUNCTION AND EVENT applied to DISPLAYED ROWS

stripeTable = ->
  $('#data-table td').css 'background-color', 'white'
  if $('#striped').is ':checked'
     $('#data-table tr:even td').css 'background-color', 'lightgray'

$('#striped').change stripeTable

# VIRTUAL SCROLLING FUNCTIONS applied to DISPLAYED ROWS

scrollDown = ->
  ( if next_row is data_rows.length
       scrollToBottom()
    else
       $('#data-table tr:first').remove()
       appendRows()
  ) unless bottom_reached

scrollUp = ->
  if bottom_reached
     $('html, body').scrollTop 0
     bottom_reached = no
  else
     prependRow()
     while $('#data-table tr:last').height() < $('#data-table').height() - bottom
       $('#data-table tr:last').remove()
       next_row = $('#data-table tr:last').data('index') + 1
  alignScrollbar()

# MOUSE WHEEL EVENTS

$('body').mousewheel (event, delta) ->
  setTimeout if delta > 0 then scrollUp else scrollDown

# THE SCROLLBAR AND ITS EVENTS

$('#slider').slider { orientation: 'vertical' }

alignScrollbar = ->
  if $('#data-table tr').length
     before = 0
     i = $('#data-table tr:first').data 'index'
     while --i >= 0 then before += data_rows[i].display
     after = 0
     i = next_row
     while i < data_rows.length then after += data_rows[i++].display
     if before + after
        $('#slider').slider 'enable'
        $('#slider').slider 'option', 'max', before + after
        $('#slider').slider 'option', 'value', after
     else # all rows displayed
        $('#slider').slider 'option', 'value', 0
        $('#slider').slider 'disable'
  else # empty table
     $('#slider').slider 'option', 'value', 0
     $('#slider').slider 'disable'

$('#slider').slider
  start: (event, ui) -> displayMessage 'SCROLLING'
  stop: (event, ui) ->
    if $('#slider').slider 'value'
       displayRows $('#slider').slider('option', 'max') -
                   $('#slider').slider('value')
    else
       $('#data-table tbody').html ''
       scrollToBottom()
    displayMessage filtered

# Continuous scrolling
scroll_interval = null

startScrollDown = (button) ->
  scroll_interval = setInterval scrollDown
  $(button).mouseout -> stopScrollDown button

stopScrollDown = (button) ->
  $(button).off 'mouseout'
  clearInterval scroll_interval

startScrollUp = (button) ->
  scroll_interval = setInterval scrollUp
  $(button).mouseout -> stopScrollUp button

stopScrollUp = (button) ->
  $(button).off 'mouseout'
  clearInterval scroll_interval

# Horizontal AutoScroll when tabbing between filters of editors

$('form').delegate ':input', 'focusin', (event) ->
  sleft = $(window).scrollLeft()
  right = $(@).offset().left + $(@).width()
  wright = sleft + $(window).width() - 55 # side column + scrollbar
  if right > wright then $(window).scrollLeft sleft + right - wright

# WINDOW RESIZE & SCROLL BEHAVIOUR

setResizeAndScroll = ->
  $(window).resize ->
    bottom = $(window).innerHeight() - top_height
    if bottom_reached then scrollToBottom() else appendRows()
  .scroll -> $('#head-table').css 'left', - $(@).scrollLeft()

# ZOOMING FUNCTIONS AND EVENTS applied to DISPLAYED ROWS

$('#zoom').slider
  min: 50, max: 150, value: 100
  slide: (event, ui) -> setZoom ui.value / 100

zoom_factor = 1

setZoom = (factor) ->
  zoom_factor = factor
  $('table').css 'transform', "scale(#{factor},#{factor})"
  top_height = Math.round $('header').outerHeight(true) +
                          $('#head-table').outerHeight(true)
  $('body').css 'margin-top', top_height
  bottom = $(window).innerHeight() - top_height
  $('#zoom').slider 'value', factor * 100
  if bottom_reached then scrollToBottom() else appendRows()

autoZoom = (button = null) ->
  if not button? or $(button).hasClass 'off' # switch on Auto-Zooming
    $('body').css 'overflow-x', 'hidden' # hide horizontal scrollbar
    $(window).scrollLeft(0).scroll() # scrolling back left
    $(window).off('resize scroll').on 'resize', ->
      setZoom ($(window).width() - $('#scrollbar').width()) /
               $('#data-table').outerWidth() * zoom_factor
    $(button).text 'Stop Zoom'
    .switchClass 'off', 'on'
    .addClass 'ui-state-active'
    $('#zoom').slider 'disable'
  else # switch off Auto-Zooming
    $('body').css 'overflow-x', 'auto' # allow horizontal scrollbar
    setZoom 1
    $(window).off 'resize'
    setResizeAndScroll()
    $(button).text 'Auto-Zoom'
    .switchClass 'on', 'off'
    .removeClass 'ui-state-active'
    $('#zoom').slider 'enable'
  $(window).resize().scroll()

# INDIVIDUAL AUTOMATION PROCESS

executeAutomation = (button) ->
  $('form').prop 'disabled', yes
  row = $(button).parent().parent()
  $('td', row).css
    'border-top' : 'medium solid red'
    'border-bottom': 'medium solid red'
  if $('#safe').is(':checked') and
  not confirm $(button).attr('title') + '?'
     $('td', row).css 'border', 'thin solid darkgray'
     $('form').prop 'disabled', no
  else
     param  = /[\\?&]view=([^&#]*)/.exec location.search
     view   = decodeURIComponent param[1].replace /\+/g, ' '
     target = data_rows[$(row).data 'index']
     $.post '/AJAX/Automation.php', 'automation=' +
            encodeURIComponent JSON.stringify [view, target['data']]
     .done (feedback) ->
       try
         result = JSON.parse feedback
         if result[1] # remove row from report
            data_rows.splice $.inArray(target, data_rows), 1
            displayRows $('#slider').slider('option', 'max') -
                        $('#slider').slider('value')
         else # restore row display
            $('td', row).css 'border', 'thin solid darkgray'
         displayMessage result[0], result[1]
       catch error
           $('td', row).css 'border', 'thin solid darkgray'
           displayMessage 'JSON error: ' + error.message, true
     .fail (jqXHR, textStatus) ->
       displayMessage 'AUTOMATION error: ' + textStatus, true
     .always ->
       $('form').prop 'disabled', no

# UI: MOUSEOVER AND CONTEXT MENU

$('table').on 'mouseenter', 'th button', ->
  $(@).switchClass 'ui-state-default', 'ui-state-hover'

$('table').on 'mouseleave', 'th button', ->
  $(@).switchClass 'ui-state-hover', 'ui-state-default'

$('#data-table').contextmenu
  delegate: 'td'
  menu: '#contextmenu'
  preventContextMenuForPopup: yes
  preventSelect: no
  taphold: yes
  show: { effect: 'slideDown', duration: 0 }
  hide: { effect: 'fadeOut', duration: 0 }
  beforeOpen: (event, ui) ->
    getSelection().selectAllChildren ui.target[0] unless getSelection().toString()
    if $('#editor-row').length
       $('#data-table').contextmenu 'enableEntry', 'Delete', 0 < window.data_row.indexOf 'Delete'
       editing = $('#title-row button span').hasClass 'ui-icon-cancel'
       $('#data-table').contextmenu 'enableEntry', 'Cancel', editing
       $('#data-table').contextmenu 'enableEntry', 'New', not editing
  select: (event, ui) ->
    row = ui.target.parent()[0]
    column = ui.target.index() - 1
    switch ui.cmd
      when 'Copy' then document.execCommand 'Copy'
      when 'Edit' then editRow $(row).find('button')[0]
      when 'New', 'Cancel' then newOrCancel()
      when 'Delete' then deleteRow $(row).find('button')[0]
      when 'Filter'
        $('#filter-row input')[column].value = getSelection().toString()
        $('#filter-row input')[column].focus()
        filterTable $('#filter-row input')[column]
        getSelection().removeAllRanges()
      when 'Sort' then $($('#title-row td')[column]).click()
      when 'Themes' then; # open submenu
      else # Theme selected
        $('#theme').attr 'href', "/CSS/#{ui.cmd}/jquery-ui.min.css"
        $('#Themes a').each ->
          $('span', this).remove()
          if $(@).text() is ui.cmd
             $(@).prepend '<span class="ui-icon ui-icon-check"></span>'
        $.post '/AJAX/Profile.php','theme=' + ui.cmd

localizePage = ->
  $('[data-title]').each ->
    $(@).prop 'title', literal[$(@).attr 'data-title']
  $('[data-item]').each ->
    $(@).html($(@).html().replace /<\/span>.*/,
      '</span>' + literal[$(@).attr 'data-item']) #'#Notepad2
  $('[data-title="Data"]').text literal['Data']
  window.data_row = window.data_row.replace /data-title="Edit"([^<>]*)onclick/gm,
    'data-title="Edit" title="' + literal['Edit'] + '" onclick'
  window.data_row = window.data_row.replace /data-title="Delete"([^<>]*)onclick/gm,
    'data-title="Delete" title="' + literal['Delete'] + '" onclick'

# LOAD AND DISPLAY DATA

$(document).ready ->
  $('form').prop 'disabled', on
  $.when(loadDictionary()).done ->
    localizePage()
    displayMessage 'LOADING DATA'
    $('body').css 'margin-top', top_height
    setResizeAndScroll()
    $.post '/AJAX/View.php', location.search.split('?')[1]
     .done (data) ->
       try
         data_rows = JSON.parse data
         for rows in data_rows then for cell, i in rows.data 
             rows.data[i] = '' if cell is null or '{}' is JSON.stringify cell
         filterTable() # set all rows displayable
       catch error
         displayMessage 'JSON error: ' + error.message, true
     .fail (jqXHR, textStatus) ->
       displayMessage errorThrown, true
     .always ->
       $(window).resize().scroll()
       $('#striped').prop 'disabled', no
       $('form').prop 'disabled', no
       if navigator.userAgent.includes 'Electron'
          $.getScript '/JS/electron/View.js'
