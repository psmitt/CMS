options = {} # datalist options for selection inputs

### SELECTIONS for GLOBAL var options[id][label] = value

    INPUT:  <input type="text" class="selection" id="table-field" />

    OUTPUT:

    <div class="selection">
     <input name="table-field" type="text" id="table-field-value" tabindex="-1" readonly />
     <button type="button" tabindex="-1"><span class="ui-icon ui-icon-carat-1-s" /></button>
     <input type="text" class="selected" list="table-field-list" id="table-field" />
     <datalist id="table-field-list"></datalist>
    </div>
###
createSelection = (input) ->
  # Creating elements
  id = $(input).attr 'id'
  field = $ '<input name="' + id + '" type="text" id="' +
                              id + '-value" tabindex="-1" readonly />'
  button = $ '<button type="button" tabindex="-1"><span
               class="ui-icon ui-icon-caret-1-s"/></button>'
  datalist = $ '<datalist id="' + id + '-list"></datalist>'

  # Building structure
  container = $ '<div class="selection" />'
  $ input
  .replaceWith container
  .switchClass 'selection', 'selected'
  .attr 'list', id + '-list'
  container
  .append field
  .append button
  .append input
  .append datalist

  # INNER FUNCTIONS

  validateOption = (id, label) -> # input_id = $(input).attr 'id'
    input = '#' + id
    field = input + '-value'
    datalist = input + '-list'
    value = options[id][label]
    if label and value
       $(field).val value
       $(input).addClass('selected').val label
    else # filter datalist
       $(input).val ''
       $(field).val label
       if $('#regular').is ':checked'
          filter = new RegExp label, 'i'
          match = (key) -> filter.test key
       else
          filter = label.toLowerCase()
          match = (key) -> 0 <= key.toLowerCase().indexOf filter
       hits = 0
       hits += match keys for keys of options[id]
       if hits
          $(field).css 'background-color', 'white'
          if hits < 100
             $(datalist).html ''
             for keys of options[id] when match keys
                 $(datalist).append '<option value="' +
                         keys.replace(/"/g, '&quot;') + '"></option>'
          else
             $(datalist).html '<option value="\u0001">...(' +
                         hits + literal[' options'] + ')...</option>'
       else
          $(field).css 'background-color', '#FFAAAA'
       $(input).focus()

  $(button).click (event) -> $(input).select()

  $(input).focusin (event) ->
      $(@).css 'text-align', 'right'
      if $(@).val() is '' then $(@).removeClass 'selected'

  $(input).focusout (event) -> $(@).css 'text-align', 'left'

  $(input).blur (event) -> # clear value and restore datalist if empty
    if not $(@).val()
      $(@).addClass 'selected'
      $(field).val('').css 'background-color', 'white'
      if 100 > hits = Object.keys(options[id]).length
         $(datalist).html ''
         for keys of options[id]
             $(datalist).append '<option value="' +
                     keys.replace(/"/g, '&quot;') + '"></option>'
      else
         $(datalist).html '<option value="\u0001">...(' +
                     hits + literal[' options'] + ')...</option>'

  $(input).on 'input', (event) ->
    if $(@).val() is '\u0001' # show filtered options
       if 1000 > parseInt $('option', datalist).text().substring 4
          $(datalist).html ''
          if $('#regular').is ':checked'
             filter = new RegExp $(field).val(), 'i'
             match = (key) -> filter.test key
          else
             filter = $(field).val().toLowerCase()
             match = (key) -> 0 <= key.toLowerCase().indexOf filter
          for keys of options[id] when match keys
              $(datalist).append '<option value="' +
                      keys.replace(/"/g, '&quot;') + '"></option>'
       $(@).val('').focus()
    else
       value = options[id][$(@).val()]
       if $(@).val() and value
          $(field).val value
          $(@).addClass 'selected'
       else
          if 'rgb(255, 255, 255)' is $(field).css 'background-color'
             if $(@).hasClass 'selected'
                $(@).removeClass 'selected'
                $(field).val ''
             validateOption id, $(field).val() + $(@).val()
          else
             $(@).val ''

  $(input).on 'drop', (event) ->
    $(field).val ''
    $(input).val event.originalEvent.dataTransfer.getData 'Text'
    $(input).trigger 'input'
    $(input).focus()
    off

  $(input).keydown (event) ->
    if event.which is 8 # on backspace
       if not $(@).hasClass 'selected'
          label = $(field).val()
          validateOption id, label.substr 0, label.length - 1
    else if $(@).attr 'required' # on invalid, when required, but empty
       $(@).removeAttr 'required'
       $(@).one 'focusout', -> $(@).attr 'required', true

  # Loading options
  folder = 'Table'
  if param = /[\\?&]table=([^&#]*)/.exec location.search
     file = decodeURIComponent param[1].replace /\+/g, ' '
  else
     folder = 'Form'
     file = $('[name="form-name"]').val()
  $.post '/AJAX/Form.php',
         'form_options=' + encodeURIComponent JSON.stringify {
                 'folder': folder, 'file': file, 'field': id }
   .done (data) ->
     try
       options[id] = JSON.parse data
       $(input).blur() # reset datalist
     catch error
       options[id] = { "adathiba": "0" }
   .fail (jqXHR, textStatus) ->
       displayMessage 'AJAX error: ' + textStatus, true

resetForm = ->
  $('form input[name="record-id"]').val '' # clear record
  $('form input[type!="hidden"]').val ''   # clear fields
  $('form')[0].reset()                     # reset form
  $('form .selected').blur()               # reset selection lists

localizePage = ->
    $('[data-title]').each ->
        $(@).prop 'title', literal[$(@).attr 'data-title']
    $('[data-title="Edit Data"]').text literal['Edit Data']
    $('[data-title="Save"]').text literal['Save']
    $('#reset').text literal['New / Reset']

$(document).ready ->
  $('#striped').prop 'disabled', true
  $('input[type="date"]').datepicker { dateFormat: 'yy-mm-dd' }
  $('div.ui-datepicker').css 'font-size', 'small'
  # Clearing Input fields before drop, except Text Areas
  $('input').on 'drop', (event) ->
    $(@).val event.originalEvent.dataTransfer.getData 'Text'

  $.when(loadDictionary()).done ->
    localizePage()
    displayMessage 'LOADING OPTIONS', false
    $('input.selection').each -> createSelection @
    # Set Form Width IF NOT TABLE
    if $('fieldset').length > 0
       $('form').width 16 +
         Math.max.apply Math, $('table').map(-> $(@).width()).get()
    # Enable Form submission
    $('form').submit (event) ->
      if 'Table.php' isnt location.pathname.substring location.pathname.lastIndexOf('/') + 1
         if preSubmit?() is off or
         $('#safe').is(':checked') and
         not confirm literal['SUBMIT FORM ?']
            return false
         form_data = JSON.stringify $(@).serializeArray()
         $('form').prop('disabled', true);

         AJAX_script = '/AJAX/Form.php'
         AJAX_operation = 'form_submit='
         if /[\\?&]table=([^&#]*)/.exec location.search # parameter 'table'
            AJAX_script = '/AJAX/Table.php'
            AJAX_operation = 'table_insert='
            form_data = form_data.replace 'form-name', 'table-name'

         $.post AJAX_script, AJAX_operation + encodeURIComponent form_data
          .done (data) ->
            result = JSON.parse data
            if result.length is 1 then result = result[0] #temporary patch
            try
              if typeof postSubmit is 'function'
                 postSubmit result
              else if result[0]
                 resetForm()
                 displayMessage 'Last Insert ID: ' +
                   (if result[1].length then result[1] else 'N/A'), off
              else
                 displayMessage result[2], on
              $('html,body').scrollTop 0
            catch error
              displayMessage 'JSON error: ' + error.message, on
          .fail (jqXHR, textStatus) ->
              displayMessage 'SAVE error: ' + textStatus, on
          .always ->
              $('form').prop 'disabled', false
      return false

    # PREVENT BACKSPACE NAVIGATION
    $(document).on 'keydown', (event) ->
      if event.which is 8 and
      not $(event.target).is 'input, textarea'
         event.preventDefault()

    $('form').prop 'disabled', false
    displayMessage 'OK'

    if window.navigator.userAgent.indexOf('Edge') > -1
       $('input[type="date"]').prop 'type', 'datum'

    if navigator.userAgent.includes 'Electron'
       $.getScript '/JS/electron/Form.js'
        .done (script, textStatus) ->
         refactorSelections()
