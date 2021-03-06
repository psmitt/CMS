'use strict'

function loadMenuFiles() {
  empty(MenuPanel)
  listDirectory('Menu', loadFiles)

  async function loadFiles(files) {
    await readXMLFile('Favorites', `${UserName}.xml`, xmlDoc => {
      Favorites = document.createElement('div')
      let title = document.createElement('span')
      title.textContent = get(xmlDoc.firstElementChild, 'title')
      title.classList.add('branch')
      Favorites.appendChild(title)
      for (let favorite of xmlDoc.firstElementChild.children)
        Favorites.appendChild(createFavorite(favorite))
      MenuPanel.appendChild(Favorites)
    })
    for (let file of files)
      await readXMLFile('Menu', file, xmlDoc => {
        for (let subMenu of xmlDoc.children)
          appendSubMenu(subMenu, MenuPanel)
      })
    Search.dispatchEvent(new Event('input')) // collapse all
    Search.focus()
  }
}

function appendSubMenu(subMenu, parentMenu) {
  let node = document.createElement('div')
  if (subMenu.children.length) {
    let title = document.createElement('span')
    title.textContent = get(subMenu, 'title')
    title.classList.add('branch')
    title.classList.add('expanded')
    node.appendChild(title)
    for (let item of subMenu.children)
      appendSubMenu(item, node)
  } else {
    node.appendChild(createMenuItem('span', subMenu))
  }
  parentMenu.appendChild(node)
}

function createMenuItem(type, fromNode) { // type == 'span' or 'button'
  let item = document.createElement(type)
  item.classList.add('item')
  item.textContent = get(fromNode, 'title')
  let menu_class = get(fromNode, 'class')
  let menu_order = get(fromNode, 'order')
  if (type === 'span') {
    item.dataset.original = `title="${item.textContent}"
                             class="${menu_class}"
                             order="${menu_order}"`
  }
  if (menu_class && menu_order) {
    item.classList.add(menu_class)
    if (menu_class === 'link' && /^\w+\/php\/Form_/.test(menu_order)) {
      menu_class = 'form'
      menu_order = menu_order.replace(/^\w+\/php\/Form_/, '')
      menu_order = menu_order.charAt(0).toUpperCase() +
        menu_order.substring(1, menu_order.lastIndexOf('.'))
    }
    item.onclick = type === 'button' && menu_class === 'task' ? // subtask?
      event => saveTask().then(id => Load['task'](menu_order, id)) :
      event => {
        if (event.ctrlKey) { // open item in new window
          if (Electron) {
            ipc.send('New Window',
              `Load['${menu_class}']('${menu_order}');
             shrinkNavigationFrame();`)
          } else { // IIS
            Load['link'](`index.php?${menu_class}=${menu_order}`)
          }
        } else {
          if (/^\//.test(menu_order) && Electron)
            shell.openExternal(menu_order.replace(/^\//, `http://${ServerName}/`))
          else
            Load[menu_class](menu_order)
        }
      }
  }
  return item
}

function setBranchIcons(root) {
  for (let branch of root.querySelectorAll('.branch')) { // span
    let expanded = true
    let collapsed = Boolean(branch.nextElementSibling)
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
MenuPanel.addEventListener('click', event => {
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

MenuPanel.addEventListener('mousedown', event => {
  if (event.target.matches('mark')) {
    event.path[1].click()
  }
})

document.addEventListener('keyup', event => {
  if (event.altKey && event.key == 'q')
    Search.focus()
})

// Search Menu on input
Search.addEventListener('input', _ => {
  const all = selector => MenuPanel.querySelectorAll(selector)
  all('div').forEach(div => div.style.display = 'none')
  all('span').forEach(span => span.classList.remove('hit'))
  let term = Search.value.trim()
  if (term) {
    let matchAll = new RegExp('(?=.*' + term.replace(/ /g, ')(?=.*') + ')', 'i')
    let matchAny = new RegExp('(' + term.replace(/ /g, '|') + ')', 'ig')
    for (let span of all('.branch, .item')) {
      span.innerHTML = matchAll.test(span.textContent) ?
        span.textContent.replace(matchAny, '<mark>$1</mark>') : span.textContent
    }
    for (let mark of all('mark')) {
      mark = mark.parentNode // span
      while ((mark = mark.parentNode) !== MenuPanel) // div
        mark.style.display = 'block'
    }
    if (MenuPanel.querySelector('.item mark'))
      MenuPanel.querySelector('.item mark').parentNode.classList.add('hit')
  } else {
    for (let span of all('.branch, .item'))
      span.innerHTML = span.textContent
    for (let div of MenuPanel.children)
      div.style.display = 'block'
  }
  setBranchIcons(MenuPanel)
})

// Navigate up and down among hits
Search.addEventListener('keydown', event => {
  switch (event.code) {
    case 'ArrowDown':
    case 'ArrowUp':
    case 'Enter':
      event.preventDefault(); // stop cursor move in input field
      lastClickedMenuItem.classList.remove('clicked')
      let items = Array.from(MenuPanel.querySelectorAll('.item')).filter(item => item.querySelector('mark'))
      for (let i = 0; i < items.length; i++) {
        if (items[i].classList.contains('hit')) {
          switch (event.code) {
            case 'ArrowDown':
              if (i + 1 < items.length) {
                items[i].classList.remove('hit')
                items[i + 1].classList.add('hit')
                let slide = items[i + 1].offsetTop + items[i + 1].offsetHeight - innerHeight + 75
                if (MenuPanel.scrollTop < slide)
                  MenuPanel.scrollTop = slide
              }
              return;
            case 'ArrowUp':
              if (i > 0) {
                items[i].classList.remove('hit')
                items[i - 1].classList.add('hit')
                let slide = items[i - 1].offsetTop - 25
                if (MenuPanel.scrollTop > slide)
                  MenuPanel.scrollTop = slide
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
  if (MenuPanel.querySelector('.hit'))
    MenuPanel.querySelector('.hit').classList.remove('hit')
  MenuPanel.querySelectorAll('span').forEach(item => item.innerHTML = item.textContent)
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

/* NAV SIZING */

function shrinkNavigationFrame() {
  Nav.width = '2em'
  Search.type = 'text' // remove clear button from input field
  Search.placeholder = ''
  Search.style.paddingLeft = '0'
  Search.style.cursor = 'pointer'
  Search.style.color = 'rgba(0,0,0,0)' // hide last search
  MenuPanel.style.display = 'none' // hide menu
}

function restoreNavigationFrame(width) {
  Nav.width = width
  Search.type = 'search'
  Search.placeholder = 'Search...'
  Search.style.paddingLeft = '1.75em'
  Search.style.cursor = ''
  Search.style.color = '' // show last search
  MenuPanel.style.display = 'block' // show menu
}

/* HANDLING FAVORITES */

function createFavorite(item, span = false) {
  let node = document.createElement('div')
  node.appendChild(span ? item : createMenuItem('span', item))
  node.setAttribute('draggable', true)
  node.addEventListener('dragstart', event => draggedFavorite = node)
  node.addEventListener('dragend', event => saveFavorites(draggedFavorite = null))
  node.addEventListener('dragenter', event => {
    if (node.nextElementSibling === draggedFavorite)
      Favorites.insertBefore(node.nextElementSibling, node)
    else if (node.previousElementSibling === draggedFavorite)
      Favorites.insertBefore(node, node.previousElementSibling)
  })
  return node
}

function saveFavorites() {
  let xmlString = ''
  Favorites.querySelectorAll('.item').forEach(item =>
    xmlString += `\t<menu ${item.dataset.original}/>\n`
  )
  saveFavoritesToXML(xmlString, Favorites.firstElementChild.textContent)
}

MenuPanel.oncontextmenu = event => {
  if (event.ctrlKey && event.target.matches('.item')) {
    event.preventDefault()
    if (event.target.parentNode.parentNode === Favorites) { // remove favorite
      Favorites.removeChild(event.target.parentNode)
      saveFavorites()
    } else { // add favorite
      let found = false
      Favorites.querySelectorAll('.item').forEach(item =>
        found = item.textContent === event.target.textContent
      )
      if (!found) {
        Favorites.appendChild(createFavorite(event.target.cloneNode(true), true))
        saveFavorites()
      }
    }
  }
}