const nav = document.body.firstElementChild.style
const Menu = document.getElementById('menu')
const Search = document.getElementById('search')

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
        onclick += `"loadTask('${path.join(rootDir, 'Task', menu('order') + '.xml').replace(/\\/g, '\\\\')}')"`
        break;
      case 'view':
        onclick += `"loadView('${path.join(rootDir, 'View', menu('order') + '.xml').replace(/\\/g, '\\\\')}')"`
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

// .hover esetén a touch-csal van gond
$('#menu').on('mouseleave', 'span', function (event) { // prevent false positive bug
  if (!event.relatedTarget && !event.toElement) {
    console.log('HAPPENED');
  }
})

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

Search.addEventListener('blur', _ => {
  if (Menu.querySelector('.hit'))
    Menu.querySelector('.hit').classList.remove('hit')
  Menu.querySelectorAll('.item').forEach(item => item.innerHTML = item.textContent)
})

Search.addEventListener('focus', _ => {
  maximizeNavigationBar()
  if (Search.value.trim())
    Search.dispatchEvent(new Event('input'))
})

function minimizeNavigationBar() {
  Search.placeholder = ''
  Search.style.padding = '0'
  nav.width = nav.minWidth = '2em'
}

function maximizeNavigationBar() {
  nav.width = nav.minWidth = nav.maxWidth = '15em'
  console.log(nav);
  Search.style.paddingLeft = '1.75em'
  Search.placeholder = 'Search'
}