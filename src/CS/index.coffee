isClosed = (frameName) ->
  not $('#' + frameName).data 'height'

setHeight = (task, data) ->
  $('#Task').data 'height', task
  $('#Task').css 'height', task + '%'
  $('#Data').data 'height', data
  $('#Data').css 'height', data + '%'

other = { Task : 'Data', Data : 'Task' }

closeFrame = (frameName) ->
  if isClosed other[frameName]
     setHeight 0, 0
     $('#Menu').css 'border', 'none'
  else setHeight 100 * (other[frameName] is 'Task'),
                 100 * (other[frameName] is 'Data')

toggleFrame = (frameName) ->
  ( if $('#' + frameName).data('height') is 50
       setHeight 90 - 80 * (other[frameName] is 'Task'),
                 90 - 80 * (other[frameName] is 'Data')
    else
       setHeight 50, 50
  ) unless isClosed other[frameName]
  off # context menu

$('iframe').on 'load', ->
  $(@).data 'height', 50
  frameName = '#' + $(@).attr 'name'
  ( if isClosed(other[$(@).attr 'name']) \
    or $(frameName).css('left') is '0px' # mobile
       $(frameName).data 'height', 100
       $(frameName).css 'height', '100%'
    else
       setHeight 50, 50
    $('#Menu').css 'border-right','solid lightgrey thin'
  ) unless frameName is '#Menu'
