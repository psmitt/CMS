preSubmit = ->
  if $('[name="user"]').prop('required') and $('[name="user"]').val() is ''
     alert 'Kötelező a leendő felhasználó(k) megadása!'
     $('form').prop 'disabled', false
     $('[name="user"]').focus()
     return false
  form_data = JSON.stringify $('form').serializeArray()
  $('form').prop 'disabled', true
  serials = $('[name="serial_number"]').val().split(/\r?\n/).filter (entry) -> entry isnt ''
  users = $('[name="user"]').val().split(/\r?\n/).filter (entry) -> entry isnt ''
  if serials.length < users.length
     alert 'Kevesebb eszköz van, mint ahány felhasználó!'
     $('form').prop 'disabled', false
     $('[name="serial_number"]').focus()
     return false
  if serials.length is 1
     $('form').prop 'disabled', false
     $('[name="serial_number"]').val serials[0]
     return true
  for serial, index in serials
      user = users[index] ? ''
      one = form_data
      .replace(/serial_number","value":"(?:[^"\\]|\\.)*"/,
               'serial_number","value":"' + serial.replace(/"/g, '\\"') + '"')
      .replace(/user","value":"(?:[^"\\]|\\.)*"/,
               'user","value":"' + user.replace(/"/g, '\\"') + '"')
      $.post '/AJAX/Form.php', 'form_submit=' + encodeURIComponent one
      .done (data) ->
        try
            result = JSON.parse data
            if result[0] is 0 then throw result[2]
        catch error
            alert error
  displayMessage 'Több eszköz nyilvántartásba vétele...', off
  $('form').prop 'disabled', false
  resetForm()
  off

postSubmit = (result) ->
  if result[0]
     displayMessage "SN #{$('[name="serial_number"]').val()} bejegyezve", off
     resetForm()
  else
     displayMessage 'SUBMIT error: ' + result[2], on

$(document).ready ->
  $('#hardware').change ->
    query = "SELECT category,
                    IF(LEFT(note, 3) = 'PN:',
                       IF(LOCATE('\n', note),
                          MID(note, 5, LOCATE('\n', note) - 4),
                          RIGHT(note, CHAR_LENGTH(note) - 4)), '')
               FROM hardware WHERE hardware_id = " + $('[name="hardware"]').val()
    $.post '/AJAX/Form.php', 'form_event=' + encodeURIComponent query
     .done (data) ->
       try 
           hw = JSON.parse data
           $('[name="user"]').prop 'required', -1 isnt $.inArray hw[0][0], [14,16,26]
           $('[name="product_number"]').val hw[0][1]
       catch error
           displayMessage 'JSON error: ' + error, on
     .fail (jqXHR, textStatus) ->
       displayMessage 'AJAX error: ' + textStatus, on

  $('#hardware').blur ->
    if $(@).val() is ''
       $('[name="user"]').prop 'required', off

  setTimeout (-> $('[name="ticket"]').focus()), 500
