tree_array = [] # [#] => { parent , [child] | display | image | item }

# Collapse Branch in the Array, not on the page!
collapseBranch = (index) ->
  for nodes in tree_array[index].child
      collapseBranch nodes
      tree_array[nodes].display = off
  no # no need for loop result

# Expand or Collapse Branch
expandBranch = (image) ->
  leaf = $(image).next()
  for node in tree_array[$(image).data 'index'].child
      unless tree_array[node].display
        tree_array[node].display = on
        $ """
         <div style="display:none"><img data-index="#{node}"
          onclick="expandBranch(this)"
          src="/CSS/Tree/#{tree_array[node].image}"><span
          class="item">#{tree_array[node].item}</span></div>
         """ #"# Notepad2
        .insertAfter leaf
        .show 'fast'
        expand = true
      leaf = $(leaf).next()
  unless expand
    collapseBranch $(image).data 'index'
    $(image).siblings('div').remove()

# Reset Tree
resetTree = ->
  $('#search_field').prop 'disabled', yes
  displayMessage 'RESET'
  setTimeout ->
    $('body > div > img').siblings('div').remove()
    collapseBranch 0
    expandBranch $ 'body > div > img'
    $('#search_field').prop 'disabled', no
    $('#search_field').focus()
    displayMessage 'OK'

# Display tree branches based on display fields
createBranch = (index) ->
  return '' unless tree_array[index].display
  branch = """
           <div><img data-index="#{index}" onclick="expandBranch(this)"
            src="/CSS/Tree/#{tree_array[index].image}"><span
            class="item">#{tree_array[index].item}</span>
           """ #"# Notepad2
  for nodes in tree_array[index].child
      branch += createBranch nodes
  branch + '</div>'

# Regular search
searchTree = ->
  $('#hits').text ''
  if $('#search_field').val()
     $('#search_field').prop 'disabled', yes
     displayMessage 'SEARCHING'
     setTimeout ->
       nodes.display = off for nodes in tree_array
       tree_array[0].display = on # root must not disappear
       if $('#regular').is ':checked'
          filter = new RegExp $('#search_field').val(), 'im'
          match  = (filter, data) -> filter.test(data)
       else
          filter = $('#search_field').val().toLowerCase()
          match  = (filter, data) -> 0 <= data.toLowerCase().indexOf filter
       hits = 0
       i = tree_array.length
       while --i
         node = tree_array[i]
         if match filter, node.item
            node.display = on
            hits++
         if node.display
            tree_array[node.parent].display = on

       $('#hits').text hits + $('#hits').data 'title'
       $('body > div').replaceWith createBranch 0
       $('#search_field').prop 'disabled', no
       $('#search_field').focus()
       displayMessage 'OK'
  else
     resetTree()

ping = (host) ->
  new ActiveXObject('WScript.Shell').Run "ping #{host} -n 10"
  off # context menu

runVNC = (hostname) ->
  new ActiveXObject 'WScript.Shell'
  .Exec 'C:\\\\Program Files\\\\TightVNC\\\\tvnviewer.exe ' + hostname

localizePage = ->
  $('[data-title]').each ->
    $(@).prop 'title', literal[$(@).attr 'data-title']
  $('#hits').data 'title', literal[' hit(s)']

$(document).ready ->
  $('#striped').prop 'disabled', yes
  $('#safe').prop 'disabled', yes
  $('#search_field').prop 'disabled', yes
  $.when(loadDictionary()).done ->
    localizePage()
    displayMessage 'LOADING DATA'
    $.post '/AJAX/Tree.php', location.search.split('?')[1]
     .done (data) ->
       try
         tree_array = JSON.parse data
         nodes.display = off for nodes in tree_array
         tree_array[0].display = on
         $(createBranch(0)).insertAfter 'header'
         resetTree()
       catch error
         displayMessage 'JSON error: ' + error.message, true
     .fail (jqXHR, textStatus) ->
       displayMessage 'AJAX error: ' + textStatus, true
