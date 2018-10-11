function refactorSelections() {
  $('.selection button').remove();
  $('.selection').each(function(i){
    //$(this).first().detach().attr('type', 'hidden').prependTo(this);
  });
  $('.selection:nth-child(2)').focusin(event, function(){
    alert(this.attr('id') + ' selected');
  });
  
}

/*

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

*/
