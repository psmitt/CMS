const Menu = document.getElementById('menu')
const Search = document.getElementById('search')

/* MENU DISPLAY */

function loadMenuFiles(folder) {
  while (Menu.firstChild)
    Menu.removeChild(Menu.firstChild)
  let files = listDirectory('Menu')
  for (let filename of files) {
    let xmlDoc = readXMLFile('Menu', filename)
    for (let subMenu of xmlDoc.children) {
      appendSubMenu(subMenu, Menu)
    }
  }
  maximizeNavigationBar();
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
    node.innerHTML = `<span class="item"${subMenu.attributes.class ?
      'onclick="load_' + menu('class') + "('" + menu('order') + '\')"' : ''
      }>${menu('title')}</span>`
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

// Maximize NAV on click
Menu.addEventListener('click', event => {
  let node = event.target
  if (node.matches('span')) {
    lastClickedMenuItem.classList.remove('clicked')
    lastClickedMenuItem = node
    lastClickedMenuItem.classList.add('clicked')

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
  maximizeNavigationBar()
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

const nav = document.body.firstElementChild.style

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

function load_task(filename) {
  console.log(filename);
}