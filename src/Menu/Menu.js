const nav = document.body.firstElementChild.style
const Menu = document.getElementById('menu')
const Search = document.getElementById('search')

/* NAV SIZING */

function minimizeNavigationBar() {
  Search.style.cursor = 'pointer'
  Search.style.color = 'rgba(0,0,0,0)'
  Search.placeholder = ''
  Search.style.paddingLeft = '0'
  nav.width = nav.minWidth = '2em'
  Search.type = 'text'
}

function maximizeNavigationBar() {
  Search.type = 'search'
  nav.width = nav.minWidth = nav.maxWidth = '15em'
  Search.style.paddingLeft = '1.75em'
  Search.placeholder = 'Search'
  Search.style.color = ''
  Search.style.cursor = ''
}

/* MENU DISPLAY */

function loadMenuFiles(folder) {
  while (Menu.firstChild)
    Menu.removeChild(Menu.firstChild)
  fs.readdir(folder, (error, files) => {
    if (error) throw error
    for (let file of files) {
      if (fs.statSync(path.join(folder, file)).isFile()) {
        let xmlString = fs.readFileSync(path.join(folder, file), 'utf8')
        const xmlDoc = new DOMParser().parseFromString(
          xmlString.charCodeAt(0) === 0xFEFF ? // BOM
          xmlString.substring(1) : xmlString, 'text/xml')
        for (let subMenu of xmlDoc.children) {
          appendSubMenu(subMenu, Menu)
        }
      }
    }
  })
}

function appendSubMenu(subMenu, parentMenu) {
  const menu = attribute => subMenu.attributes[attribute].value // read attribute
  let node = document.createElement('div')
  if (subMenu.children.length) {
    node.innerHTML = `<span class="branch expanded">${menu('title')}</span>`
    for (let item of subMenu.children) {
      appendSubMenu(item, node)
    }
  } else {
    let onclick = 'onclick='
    if (subMenu.attributes.class) switch (menu('class')) {
      case 'task':
        //        onclick += `"openIframe('${path.join(rootDir, 'Task', menu('order') + '.xml').replace(/\\/g, '\\\\')}')"`
        onclick += `"openIframe('Task', '${menu('order')}')"`
        break;
      case 'view':
        //        onclick += `"loadView('${path.join(rootDir, 'View', menu('order') + '.xml').replace(/\\/g, '\\\\')}')"`
        onclick += `"openIframe('View', '${menu('order')}')"`
        break;
    } else {
      onclick = ''
    }
    node.innerHTML = `<span class="item" ${onclick}>${menu('title')}</span>`
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

function openIframe(folder, file) {
  let currentSection =
    (folder === 'Form' && tabs.querySelector('.highlight')) ?
    tabs.querySelector('.highlight').dataset.id :
    createSection(file)

  switch (folder) {
    case 'Form':
      break;
    case 'Task':
      break;
    default: // Table, Tree, View
      break;
  }
}

/* EVENTS */

// Maximize NAV on click
Menu.addEventListener('click', event => {
  let node = event.target
  if (node.matches('span') && window.getSelection().type !== 'Range') {
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
})

// Search Menu on input
Search.addEventListener('input', _ => {
  const all = selector => Menu.querySelectorAll(selector)
  for (let div of all('div'))
    div.style.display = 'none'
  for (let span of all('span'))
    span.classList.remove('hit')
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
  Menu.querySelectorAll('.item').forEach(item => item.innerHTML = item.textContent)
})

// Restore hits on focus
Search.addEventListener('focus', _ => {
  maximizeNavigationBar()
  if (Search.value.trim()) {
    Search.selectionStart = Search.selectionEnd = Search.value.length
    Search.dispatchEvent(new Event('input'))
  }
})

// Set root directory and database on startup
document.addEventListener('DOMContentLoaded', _ => {
  if (fs.existsSync(path.join(os.homedir(), '.cms', 'lastRoot.txt')))
    changeRoot(fs.readFileSync(path.join(os.homedir(), '.cms', 'lastRoot.txt'), 'utf8'))
  else
    fs.mkdir(path.join(os.homedir(), '.cms'), changeRoot)

  if (fs.existsSync(path.join(os.homedir(), '.cms', 'lastDatabase.txt')))
    changeDatabase(fs.readFileSync(path.join(os.homedir(), '.cms', 'lastDatabase.txt'), 'utf8'))
  else
    fs.mkdir(path.join(os.homedir(), '.cms'), changeDatabase)

  maximizeNavigationBar()
});




/* BUGS */

// .hover esetén a touch-csal van gond
Menu.addEventListener('mouseleave', event => {
  if (!event.relatedTarget && !event.toElement) { // false positive bug
    console.log('HAPPENED');
  }
})

// Prevent text selection on double click
Menu.addEventListener('dblclick', event => {
  if (event.target.matches('span')) {
    if (document.selection && document.selection.empty) {
      document.selection.empty();
    } else if (window.getSelection) {
      sel = window.getSelection();
      if (sel && sel.removeAllRanges)
        sel.removeAllRanges();
    }
  }
})



/*
$(document).on('keypress', event => {
  if (event.ctrlKey && event.originalEvent.code === 'KeyF')
    $('#search').focus()
});
*/