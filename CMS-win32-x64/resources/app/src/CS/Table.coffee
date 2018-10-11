record = null

getClause = (record) ->
  if not record then return ' WHERE 0'
  if record.id.length then return JSON.stringify record.id
  clause = ''
  $('#editor-row td').each (index) ->
    input_value = label = record.data[index] ? ''
    if $('.selection', @).length # selection input
       input_name = $('input:first', @).attr 'name'
       id = $('.selected', @).attr 'id'
       if label
          # real or historic data: label = <span data-value="...">
          input_value = options[id][label] ? $(label).data 'value'
    else if $('select', @).length # select options
       input_name = $('select', @).attr 'name'
       input_value = $('select option', @).filter(->$(@).html() is label).val()
    else # single input or textarea
       input_name = @firstChild.name
    if input_value
       input_value = input_value
       .replace /'/g, "''" #'# Notepad2
       .replace /\\/g, '\\\\'
       .replace /[\n]/g, '\\n' unless $.isNumeric(input_value)
       clause += " AND #{input_name}='#{input_value}'"
    else
       clause += " AND #{input_name} #{if $.isNumeric(input_value) then '=0' else 'IS NULL'}"
  return ' WHERE ' + clause.replace ' AND ', ''

newOrCancel = ->
  record = null
  filters = []
  $('#filter-row input').each -> filters.push @value # backup filters
  resetForm()
  $('#filter-row input').each (i) -> $(@).val filters[i] # restore filters
  $('#filter-row').toggle()
  $('#editor-row').toggle()
  if $('#editor-row').is ':visible' # New
     $('#title-row button span')
     .switchClass 'ui-icon-document', 'ui-icon-cancel'
     .attr 'title', literal['Cancel']
  else # Cancel
     $('#title-row button span')
     .switchClass 'ui-icon-cancel', 'ui-icon-document'
     .attr 'title', literal['New']

editRow = (button) ->
  record = data_rows[$(button).parent().parent().data 'index']
  $('#editor-row td').each (index) ->
    label = record.data[index]
    if $('.selection', @).length # selection input
       id = $('.selected', @).attr 'id'
       input_label = $ "##{id}"
       input_value = $ "##{id}-value"
       if label is ''
          input_label.val ''
          input_value.val ''
       else if options[id][label]
          input_label.val label
          input_value.val options[id][label]
       else # historic data: label = <span data-value="...">
           input_label.val $(label).html()
           input_value.val $(label).data 'value'
    else if $('select', @).length # select option
       $('select', @)
       .val $('select option', @).filter(->$(@).html() is label).val()
    else # single input or textarea
       @firstChild.value = label ? ''
  $('form input[name="record-id"]').val getClause record
  $('#editor-row').show()
  $('#filter-row').hide()
  $('#title-row button span')
  .switchClass 'ui-icon-document', 'ui-icon-cancel'

deleteRow = (button) -> # rows can be deleted even during edition
  $('form').prop 'disabled', yes
  displayMessage 'DELETION'
  row = $(button).parent().parent()
  $('td', row).css
    'border-top' : 'medium solid red'
    'border-bottom' : 'medium solid red'
  target = data_rows[$(row).data 'index']
  form = [
    {'name':'table-name', 'value': $('input[name="table-name"]').val()}
    {'name':'record-id', 'value': getClause target}
  ]
  doIt = ->
    $.post '/AJAX/Table.php',
           'table_delete=' + encodeURIComponent JSON.stringify form
     .done (data) ->
       try
         result = JSON.parse data
         displayMessage result[0] + literal[' row(s) deleted'], true
         if result[0] and target is record
            newOrCancel()
         switch result[0]
           when 0
             $('td', row).css 'border', 'thin solid darkgray'
             alert result[2]
           when 1
             data_rows.splice $.inArray(target, data_rows), 1
             displayRows $('#slider').slider('option', 'max') -
                         $('#slider').slider('value')
           else
             alert '''
                   Multiple records have been deleted.
                   Table will be reloaded.
                   '''
             location.reload on
       catch error
           $('td', row).css 'border', 'thin solid darkgray'
           displayMessage 'JSON error: ' + error.message, true
     .fail (jqXHR, textStatus) ->
         $('td', row).css 'border', 'thin solid darkgray'
         displayMessage 'DELETION error: ' + textStatus, true
     .always ->
         $('form').prop 'disabled', no

  if $('#safe').is ':checked'
     $.post '/AJAX/Table.php',
            'table_check=' + encodeURIComponent JSON.stringify form
      .done (data) ->
        try
          if !confirm data + literal[' row(s) will be deleted?']
             $('td', row).css 'border', 'thin solid darkgray'
             $('form').prop 'disabled', no
             return displayMessage filtered
          doIt()
        catch error
          $('td', row).css 'border', 'thin solid darkgray'
          displayMessage 'JSON error: ' + error.message, true
      .fail (jqXHR, textStatus) ->
        $('td', row).css 'border', 'thin solid darkgray'
        displayMessage 'DELETION error: ' + textStatus, true
  else
    doIt()

$(document).ready -> # SUBMITTING FORM ON ENTER OR BUTTON CLICK
  $('form').submit (event) ->
    if $('#safe').is(':checked') and not confirm literal['Save record?']
       return false
    operation = if record is null then 'table_insert=' else 'table_update='
    $.post '/AJAX/Table.php',
           operation + encodeURIComponent JSON.stringify $(@).serializeArray()
     .done (data) ->
       try
         result = JSON.parse data
         feedback = if record is null then literal[' row inserted'] else literal[' row(s) updated']
         feedback += " ( #{result[2]} )" ### warnings or error ### unless result[2] is ''
         displayMessage result[0] + feedback, true
         if result[0] > 1
            alert """
                  Multiple records have been modified.
                  Table will be reloaded.
                  """
            location.reload on
         if result[0] is 1
            # PREPARATIONS FOR (RE)INSERTION
            insertion_sort = $('#title-row td div.ui-icon').length > 0
            if insertion_sort
               i = $('#title-row td div.ui-icon').parent().index()
               numeric = $('colgroup').children()[i--].className is 'number'
            if record is null # insert
               position = $('#data-table tr:first').data 'index'
            else # update
               if insertion_sort # re-sort needed?
                  editor = $('#editor-row td')[i]
                  if $('.selection', editor).length # selection input
                     insertion_sort = record.data[i] isnt $('.selected', editor).val()
                  else if $('select', editor).length # select option
                     insertion_sort = record.data[i] isnt $('select option:selected', editor).html()
                  else # single input or textarea
                     insertion_sort = record.data[i] isnt $.trim editor.firstChild.value
               position = $.inArray record, data_rows
               data_rows.splice position, 1 # remove old record
            # CREATE NEW RECORD
            record = { 'data' : [], 'id' : result[1], 'display' : false }
            $('#editor-row td').each ->
              if $('.selection', @).length # selection input
                 id = $('.selected', @).attr 'id'
                 input_label = $ "##{id}"
                 input_value = $ "##{id}-value"
                 if $(input_label).val() is ''
                    record.data.push null
                 else if options[id][$(input_label).val()]
                    record.data.push $(input_label).val()
                 else # historic data: label = <span data-value="...">
                    record.data.push '<span data-value="' + $(input_value).val() + '">' + $(input_label).val() + '</span>'
              else if $('select', @).length # select option
                 record.data.push $('select option:selected', @).html()
              else # single input or textarea
                 if $(@).children().first().prop('disabled') # auto-increment key
                    record.data.push record.id[0]
                 else
                    record.data.push $.trim @firstChild.value
            # APPLY FILTERS
            filtered -= record.display
            filters = []
            if $('#regular').is(':checked')
               $('#filter-row input').each -> filters.push new RegExp @value, 'im'
               for filter, i in filters
                   if not record.display = filter.test record.data[i] then break
            else
               $('#filter-row input').each -> filters.push @value.toLowerCase()
               for filter, i in filters
                   recData = if record.data[i] then record.data[i].toString().toLowerCase() else ''
                   if not record.display = 0 <= recData.indexOf filters[i] then break
            filtered += record.display
            # (RE)INSERT RECORD ACCORDING TO SORT ORDER
            if insertion_sort
               i = $('#title-row td div.ui-icon').parent().index() - 1
               row = 0
               if $('#title-row td div.ui-icon').hasClass 'ui-icon-circle-triangle-n'
                  if numeric
                     while row < data_rows.length and
                           record.data[i] > data_rows[row].data[i]
                        row++
                  else
                     toCompare = record.data[i] ? ''
                     while row < data_rows.length and
                           0 < toCompare.localeCompare data_rows[row].data[i]
                        row++
               else
                  if numeric
                     while row < data_rows.length and
                           record.data[i] < data_rows[row].data[i]
                        row++
                  else
                     toCompare = record.data[i] ? ''
                     while row < data_rows.length and
                           0 > toCompare.localeCompare data_rows[row].data[i]
                        row++
               if row >= data_rows.length
                  data_rows.push record
               else
                  data_rows.splice row, 0, record
            else
               data_rows.splice position, 0, record
            # REFRESH TABLE
            displayRows $('#slider').slider('option', 'max') -
                        $('#slider').slider('value')
            newOrCancel()
       catch error
         displayMessage 'JSON error: ' + error.message, true
     .fail (jqXHR, textStatus) ->
         displayMessage 'SAVE error: ' + textStatus, true
     .always ->
         $('form').prop 'disabled', no
