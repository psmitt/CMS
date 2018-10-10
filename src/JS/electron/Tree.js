'use strict';

// Generated by CoffeeScript 2.0.0
var _collapseBranch, _createBranch, expandBranch, localizePage, ping, resetTree, runVNC, searchTree, tree_array;

tree_array = []; // [#] => { parent , [child] | display | image | item }


// Collapse Branch in the Array, not on the page!
_collapseBranch = function collapseBranch(index) {
  var j, len, nodes, ref;
  ref = tree_array[index].child;
  for (j = 0, len = ref.length; j < len; j++) {
    nodes = ref[j];
    _collapseBranch(nodes);
    tree_array[nodes].display = false;
  }
  return false; // no need for loop result
};

// Expand or Collapse Branch
expandBranch = function expandBranch(image) {
  var expand, j, leaf, len, node, ref;
  leaf = $(image).next();
  ref = tree_array[$(image).data('index')].child;
  for (j = 0, len = ref.length; j < len; j++) {
    node = ref[j];
    if (!tree_array[node].display) {
      tree_array[node].display = true;
      $('<div style="display:none"><img data-index="' + node + '"\n onclick="expandBranch(this)"\n src="/CSS/Tree/' + tree_array[node].image + '"><span\n class="item">' + tree_array[node].item
      //"# Notepad2
      + '</span></div>').insertAfter(leaf).show('fast');
      expand = true;
    }
    leaf = $(leaf).next();
  }
  if (!expand) {
    _collapseBranch($(image).data('index'));
    return $(image).siblings('div').remove();
  }
};

// Reset Tree
resetTree = function resetTree() {
  $('#search_field').prop('disabled', true);
  displayMessage('RESET');
  return setTimeout(function () {
    $('body > div > img').siblings('div').remove();
    _collapseBranch(0);
    expandBranch($('body > div > img'));
    $('#search_field').prop('disabled', false);
    $('#search_field').focus();
    return displayMessage('OK');
  });
};

// Display tree branches based on display fields
_createBranch = function createBranch(index) {
  var branch, j, len, nodes, ref;
  if (!tree_array[index].display) {
    return '';
  }
  branch = '<div><img data-index="' + index + '" onclick="expandBranch(this)"\n src="/CSS/Tree/' + tree_array[index].image + '"><span\n class="item">' + tree_array[index].item
  //"# Notepad2
  + '</span>';
  ref = tree_array[index].child;
  for (j = 0, len = ref.length; j < len; j++) {
    nodes = ref[j];
    branch += _createBranch(nodes);
  }
  return branch + '</div>';
};

// Regular search
searchTree = function searchTree() {
  $('#hits').text('');
  if ($('#search_field').val()) {
    $('#search_field').prop('disabled', true);
    displayMessage('SEARCHING');
    return setTimeout(function () {
      var filter, hits, i, j, len, match, node, nodes;
      for (j = 0, len = tree_array.length; j < len; j++) {
        nodes = tree_array[j];
        nodes.display = false;
      }
      tree_array[0].display = true; // root must not disappear
      if ($('#regular').is(':checked')) {
        filter = new RegExp($('#search_field').val(), 'im');
        match = function match(filter, data) {
          return filter.test(data);
        };
      } else {
        filter = $('#search_field').val().toLowerCase();
        match = function match(filter, data) {
          return 0 <= data.toLowerCase().indexOf(filter);
        };
      }
      hits = 0;
      i = tree_array.length;
      while (--i) {
        node = tree_array[i];
        if (match(filter, node.item)) {
          node.display = true;
          hits++;
        }
        if (node.display) {
          tree_array[node.parent].display = true;
        }
      }
      $('#hits').text(hits + $('#hits').data('title'));
      $('body > div').replaceWith(_createBranch(0));
      $('#search_field').prop('disabled', false);
      $('#search_field').focus();
      return displayMessage('OK');
    });
  } else {
    return resetTree();
  }
};

ping = function ping(host) {
  new ActiveXObject('WScript.Shell').Run('ping ' + host + ' -n 10');
  return false; // context menu
};

runVNC = function runVNC(hostname) {
  return new ActiveXObject('WScript.Shell').Exec('C:\\\\Program Files\\\\TightVNC\\\\tvnviewer.exe ' + hostname);
};

localizePage = function localizePage() {
  $('[data-title]').each(function () {
    return $(this).prop('title', literal[$(this).attr('data-title')]);
  });
  return $('#hits').data('title', literal[' hit(s)']);
};

$(document).ready(function () {
  $('#striped').prop('disabled', true);
  $('#safe').prop('disabled', true);
  $('#search_field').prop('disabled', true);
  return $.when(loadDictionary()).done(function () {
    localizePage();
    displayMessage('LOADING DATA');
    return $.post('/AJAX/Tree.php', location.search.split('?')[1]).done(function (data) {
      var error, j, len, nodes;
      try {
        tree_array = JSON.parse(data);
        for (j = 0, len = tree_array.length; j < len; j++) {
          nodes = tree_array[j];
          nodes.display = false;
        }
        tree_array[0].display = true;
        $(_createBranch(0)).insertAfter('header');
        return resetTree();
      } catch (error1) {
        error = error1;
        return displayMessage('JSON error: ' + error.message, true);
      }
    }).fail(function (jqXHR, textStatus) {
      return displayMessage('AJAX error: ' + textStatus, true);
    });
  });
});
//# sourceMappingURL=Tree.js.map
