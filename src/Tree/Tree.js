Load['tree'] = filename => loadReport('Tree', Tree.filename = filename)

async function loadTree(xmlDoc) {
  let tree = xmlDoc.querySelector('tree')
  ViewTitle.innerHTML = get(tree, 'title')
  let promises = []
  let divs = []
  xmlDoc.querySelectorAll('query').forEach(query => {
    promises.push(runSQLQuery(query, result => {
      let items = {}
      for (let row of result) {
        let item = {
          parent_title: row[1],
          parent_id: row[2]
        }
        item.div = document.createElement('div')
        let img = document.createElement('img')
        img.src = `Tree/${row[3]}`
        item.div.appendChild(img)
        let span = document.createElement('span')
        span.innerHTML = row[4]
        item.div.appendChild(span)
        items[row[0]] = item
      }
      divs[get(query, 'title')] = items
    }))
  })
  Promise.all(promises).then(_ => {
    let root = document.createElement('div')
    let img = document.createElement('img')
    img.src = 'Tree/' + get(tree, 'image')
    root.appendChild(img)
    let span = document.createElement('span')
    span.innerHTML = tree.attributes.getNamedItem('item').value
    root.appendChild(span)
    xmlDoc.querySelectorAll('query').forEach(query => {
      for (let item of Object.values(divs[get(query, 'title')])) {
        if (item.parent_title && divs[item.parent_title][item.parent_id]) {
          divs[item.parent_title][item.parent_id].div.appendChild(item.div)
        } else
          root.appendChild(item.div)
      }
    })
    TreePanel.appendChild(root)
    TreeSearch.dispatchEvent(new Event('input'))
  })
}

// Search Menu on input
TreePanel.addEventListener('click', event => {
  let root = event.target.parentNode
  if (event.target.matches('img') && root.children.length > 2) {
    if (root.className === 'collapsed') {
      for (let div of root.children)
        if (div.tagName === 'DIV')
          div.style.display = 'block'
      root.className = ''
    } else {
      root.querySelectorAll('div').forEach(div => {
        div.style.display = 'none'
        if (div.children.length > 2)
          div.className = 'collapsed'
      })
      root.className = 'collapsed'
    }
  }
})

// Search Menu on input
TreeSearch.addEventListener('input', _ => {
  let divs = TreePanel.querySelectorAll('div div')
  divs.forEach(div => div.style.display = 'none')
  TreePanel.lastElementChild.className = '' // main root
  let counter = 0
  let term = TreeSearch.value.trim()
  if (term) {
    let words = term.split(' ').map(word => new RegExp(word, 'i'))
    let pattern = new RegExp('(' + term.replace(/ /g, '|') + ')', 'ig')
    let index = divs.length
    while (--index) {
      let div = divs[index]
      let span = div.querySelector('span')
      let text = span.textContent
      let hit = true
      for (let word of words)
        hit = hit && word.test(text)
      span.innerHTML = hit ? text.replace(pattern, '<mark>$1</mark>') : text
      if (hit) {
        div.style.display = 'block'
        counter++
      }
      if (div.style.display === 'block')
        div.parentNode.style.display = 'block'
      else
        div.parentNode.className = 'collapsed'
    }
  } else {
    divs.forEach(div => {
      let span = div.querySelector('span')
      span.innerHTML = span.textContent
      if (div.children.length > 2)
        div.className = 'collapsed'
      if (div.parentNode === TreePanel.lastElementChild) {
        div.style.display = 'block'
        counter++
      }
    })
  }
  Message.textContent = counter
})