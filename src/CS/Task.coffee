localizePage = ->
  $('[data-title]').each ->
    $(@).prop 'title', literal[$(@).attr 'data-title']
  $('h2.Verification').text literal['Verification']
  $('h2.Comments').text literal['Comments']

takeStep = (input) ->
  its = $ input
  wow = $ window
  sib = its.parent().siblings 'div'
  # Collapse siblings & uncheck radio inputs
  sib.children('input[type="radio"]').prop 'checked', off
  its.prop 'checked', on
  $.when(sib.find('div').hide 400).then ->
    scrollPosition = its.offset().top - wow.scrollTop()
    unless 100 < scrollPosition < wow.height() - 100
      $('html,body').animate { scrollTop: its.offset().top - 100 }, 1000
  # Expand branch
  $.when(
    its.prop 'checked', true
    .parent().children('div').show 400 # show children
    .find('div').hide 400 # collapse grand children
  ).then ->  # if task.context then saveTask()
  its.focus()

setMainAndContext = ->
  $('#main_task').remove()
  if task.main then $('header > div').prepend """
    <img id="main_task" src="/CSS/Task/Task_main.png"
     title="#{literal['Main task']}"
     onclick="$.post('/AJAX/Task.php','task_check=#{task.main}')
    .done(function(data){if(!task.main_filename.localeCompare(data))
    location='Task.php?task=#{encodeURIComponent task.main_filename}&id=#{task.main}';
    else $('#main_task').remove()})"/>
    """ #"# Notepad2
  $('#context').remove()
  if task.context
     $('<div id="context">' + task.context + '</div>')
     .insertAfter 'header'

taskError = (error) ->
  newWindow = window.open '', '_blank'
  newWindow.document.write error.responseText
  newWindow.document.close()

saveTask = ->
  task.checkString = task.displayString = ''
  $('article input').each ->
    task.checkString +=
      if $(@).prop 'checked' then '1' else '0'
    task.displayString +=
      if $(@).parent().css('display') is 'none' then '0' else '1'
  task.scrollPosition = $('html,body').scrollTop()
  $.post '/AJAX/Task.php',
         'task_save=' + encodeURIComponent JSON.stringify task
  .done (data) -> try
    window.task = JSON.parse data
    setMainAndContext()
  .fail (error) -> taskError error
  yes # for submitting form

restoreTask = ->
  $.post '/AJAX/Task.php',
         'task_restore=' + encodeURIComponent JSON.stringify task
  .done (data) ->
    try
      window.task = JSON.parse data
      setMainAndContext()
      if task.checkString is 'modified'
         alert literal['The task description has been recently modified.
                        Restart the procedure.']
      else
         $('article input').each (index) ->
           $(@).prop 'checked', task.checkString.length > index and
                                task.checkString.charAt(index) is '1'
           if  task.displayString.length > index \
           and task.displayString.charAt(index) is '0'
               $(@).parent().hide()
           else
               $(@).parent().show()
      $('html,body').scrollTop task.scrollPosition
    catch
      saveTask()
  .fail (error) -> taskError error

$(document).ready ->
  $.when(loadDictionary()).done localizePage
  restoreTask()
