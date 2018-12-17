/* DISPLAY MENU */

function loadMenuFiles() {
  empty(Menu)
  listDirectory('Menu', loadFiles) // initialize the menu generator

  async function loadFiles(files) {
    for (file of files)
      await readXMLFile('Menu', file, xmlDoc => {
        for (let subMenu of xmlDoc.children)
          appendSubMenu(subMenu, Menu)
      })
    Search.dispatchEvent(new Event('input'))
  }
}

function appendSubMenu(subMenu, parentMenu) {
  const menu = attribute => subMenu.attributes[attribute] ?
    subMenu.attributes[attribute].value : '' // read attribute
  let node = document.createElement('div')
  let title = document.createElement('span')
  title.innerHTML = menu('title')
  if (subMenu.children.length) {
    title.classList.add('branch')
    title.classList.add('expanded')
    node.appendChild(title)
    for (let item of subMenu.children)
      appendSubMenu(item, node)
  } else {
    title.classList.add('item')
    let menu_class = menu('class')
    let menu_order = menu('order')
    if (menu_class && menu_order) {
      title.classList.add(menu_class)
      if (menu_class === 'link' && menu_order.indexOf('HUN/php/Form_') === 0) {
        menu_class = 'form'
        menu_order = menu_order.charAt(13).toUpperCase() +
          menu_order.substring(14, menu_order.lastIndexOf('.'))
      }
      title.onclick = event => {
        if (event.ctrlKey) {
          if (Electron) {
            ipc.send('New Window',
              `Load['${menu_class}']('${menu_order}');
               shrinkNavigationFrame();`)
          } else { // IIS
            Load['link'](`index.php?${menu_class}=${menu_order}`)
          }
        } else {
          Load[menu_class](menu_order)
        }
      }
    }
    node.appendChild(title)
  }
  parentMenu.appendChild(node)
}

function setBranchIcons(root) {
  for (let branch of root.querySelectorAll('.branch')) { // span
    let expanded = true
    let collapsed = true
    let child = branch
    while ((child = child.nextElementSibling) && (collapsed || expanded)) { // div
      collapsed = collapsed && child.style.display === 'none'
      expanded = expanded && child.style.display !== 'none'
    }
    branch.classList.remove('collapsed', 'expanded', 'filtered')
    if (collapsed)
      branch.classList.add('collapsed')
    else if (expanded)
      branch.classList.add('expanded')
    else
      branch.classList.add('filtered')
  }
}

/* EVENTS */

var lastClickedMenuItem = document.body // just to have an initial node value

// select menu item or expand|collapse menu branch
Menu.addEventListener('click', event => {
  let node = event.target
  if (node.matches('span')) {
    lastClickedMenuItem.classList.remove('clicked')
    lastClickedMenuItem = node
    lastClickedMenuItem.classList.add('clicked')

    if (node.classList.contains('branch')) {
      if (node.classList.contains('expanded')) {
        node.classList.replace('expanded', 'collapsed')
        while (node = node.nextElementSibling) {
          node.style.display = 'none'
        } // div
      } else { // collapsed or filtered branch
        node.classList.remove('collapsed', 'filtered')
        node.classList.add('expanded')
        while (node = node.nextElementSibling) // div
          node.style.display = 'block'
      }
      setBranchIcons(event.target.parentNode) // node has changed!
    }
  }
})

Menu.addEventListener('mousedown', event => {
  if (event.target.matches('mark')) {
    event.path[1].click()
  }
})

// Search Menu on input
Search.addEventListener('input', _ => {
  const all = selector => Menu.querySelectorAll(selector)
  all('div').forEach(div => div.style.display = 'none')
  all('span').forEach(span => span.classList.remove('hit'))
  let term = Search.value.trim()
  if (term) {
    let words = term.split(' ').map(word => new RegExp(word, 'i'))
    let pattern = new RegExp('(' + term.replace(/ /g, '|') + ')', 'ig')
    for (let span of all('.branch, .item')) {
      let text = span.textContent
      let hit = true
      for (let word of words)
        hit = hit && word.test(text)
      span.innerHTML = hit ? text.replace(pattern, '<mark>$1</mark>') : text
    }
    for (let mark of all('mark')) {
      mark = mark.parentNode // span
      while ((mark = mark.parentNode) !== Menu) // div
        mark.style.display = 'block'
    }
    if (Menu.querySelector('.item mark'))
      Menu.querySelector('.item mark').parentNode.classList.add('hit')
  } else {
    for (let span of all('.branch, .item'))
      span.innerHTML = span.textContent
    for (let div of Menu.children)
      div.style.display = 'block'
  }
  setBranchIcons(Menu)
})

// Navigate up and down among hits
Search.addEventListener('keydown', event => {
  switch (event.code) {
    case 'ArrowDown':
    case 'ArrowUp':
    case 'Enter':
      event.preventDefault(); // stop cursor move in input field
      lastClickedMenuItem.classList.remove('clicked')
      let items = Array.from(Menu.querySelectorAll('.item')).filter(item => item.querySelector('mark'))
      for (let i = 0; i < items.length; i++) {
        if (items[i].classList.contains('hit')) {
          switch (event.code) {
            case 'ArrowDown':
              if (i + 1 < items.length) {
                items[i].classList.remove('hit')
                items[i + 1].classList.add('hit')
              }
              return;
            case 'ArrowUp':
              if (i > 0) {
                items[i].classList.remove('hit')
                items[i - 1].classList.add('hit')
              }
              return;
            case 'Enter':
              items[i].click()
              return;
          }
        }
      }
  }
})

// Release hits on blur
Search.addEventListener('blur', _ => {
  if (Menu.querySelector('.hit'))
    Menu.querySelector('.hit').classList.remove('hit')
  Menu.querySelectorAll('span').forEach(item => item.innerHTML = item.textContent)
})

// Restore hits on focus
Search.addEventListener('focus', _ => {
  lastClickedMenuItem.classList.remove('clicked')
  restoreNavigationFrame(
    Article.display === 'block' || Section.display === 'block' ?
    'var(--aside-width)' : '100%')
  if (Search.value.trim()) {
    Search.selectionStart = Search.selectionEnd = Search.value.length
    Search.dispatchEvent(new Event('input'))
  }
})

/*
$(document).on('keypress', event => {
  if (event.ctrlKey && event.originalEvent.code === 'KeyF')
    $('#search').focus()
});
*/

/* NAV SIZING */

function shrinkNavigationFrame() {
  Nav.width = '2em'
  Search.type = 'text' // remove clear button from input field
  Search.placeholder = ''
  Search.style.paddingLeft = '0'
  Search.style.cursor = 'pointer'
  Search.style.color = 'rgba(0,0,0,0)' // hide last search
  Menu.style.display = 'none' // hide menu
}

function restoreNavigationFrame(width) {
  Nav.width = width
  Search.type = 'search'
  Search.placeholder = 'Search'
  Search.style.paddingLeft = '1.75em'
  Search.style.cursor = ''
  Search.style.color = '' // show last search
  Menu.style.display = 'block' // show menu
}