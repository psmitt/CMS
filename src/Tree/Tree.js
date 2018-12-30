Load['tree'] = filename => loadReport('Tree', Tree.filename = filename)

async function loadTree(xmlDoc) {
  let tree = xmlDoc.querySelector('tree')
  ViewTitle.innerHTML = get(tree, 'title')
  let promises = []
  let divs = []
  xmlDoc.querySelectorAll('query').forEach(query => {
    promises.push(runSQLQuery(query, result => {
      let items = []
      let order = 0
      for (let row of result) {
        let item = {
          index: order++,
          parent_title: row[1],
          parent_id: row[2]
        }
        item.div = document.createElement('div')
        let img = document.createElement('img')
        img.src = `Tree/${row[3]}`
        item.div.appendChild(img)
        let span = document.createElement('span')
        span.innerHTML = row[4]
        // wrap text nodes
        span.normalize()
        for (let child of span.childNodes) {
          if (child.nodeType === 3) { // text node
            let cite = document.createElement('cite')
            cite.textContent = child.nodeValue
            child.replaceWith(cite)
          }
        }
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

    let wrong = document.createElement('div')
    img = document.createElement('img')
    img.src = 'Tree/Topography_not_found.png'
    wrong.appendChild(img)
    span = document.createElement('span')
    span.innerHTML = `<b style="color:crimson">${get(tree, 'orphans') || 'Orphans'}</b>`
    wrong.appendChild(span)
    root.appendChild(wrong)

    xmlDoc.querySelectorAll('query').forEach(query => {
      for (let item of Object.values(divs[get(query, 'title')]
          .sort((a, b) => a.index > b.index ? 1 : -1))) {
        if (item.parent_title) {
          if (divs[item.parent_title][item.parent_id])
            divs[item.parent_title][item.parent_id].div.appendChild(item.div)
          else
            wrong.appendChild(item.div)
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
  if (event.target.matches('div>img') && root.children.length > 2) {
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

// Search Tree on input
TreeSearch.addEventListener('input', _ => {
  empty(Message)
  Message.appendChild(progressGif)
  setTimeout(_ => {
    let divs = TreePanel.querySelectorAll('div div')
    divs.forEach(div => div.style.display = 'none')
    TreePanel.lastElementChild.className = '' // main root
    let counter = 0
    let term = TreeSearch.value.trim()
    if (term) {
      let matchAll = new RegExp('(?=.*' + term.replace(/ /g, ')(?=.*') + ')', 'i')
      let matchAny = new RegExp('(' + term.replace(/ /g, '|') + ')', 'ig')
      let index = divs.length
      while (--index) {
        let div = divs[index]
        let span = div.querySelector('span')
        if (matchAll.test(span.textContent)) {
          for (let child of span.children)
            child.innerHTML = child.textContent.replace(matchAny, '<mark>$1</mark>')
          div.style.display = 'block'
          counter++
        } else {
          for (let child of span.children)
            child.innerHTML = child.textContent
        }
        if (div.style.display === 'block')
          div.parentNode.style.display = 'block'
        else
          div.parentNode.className = 'collapsed'
      }
    } else {
      divs.forEach(div => {
        for (let child of div.querySelector('span').children)
          child.innerHTML = child.textContent
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
})