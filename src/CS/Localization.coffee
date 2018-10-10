literal = null

loadDictionary = ->
  if literal isnt ( parent.literal ? literal )
     literal = parent.literal
  else
     try
       $.post '/AJAX/Localization.php',
              'language=' + $('#language').val()
        .done (data) ->
              literal = JSON.parse data
              $('iframe').each -> @contentWindow.literal = literal
        .fail (error) -> throw error
     catch
       alert 'Localization failed.'
