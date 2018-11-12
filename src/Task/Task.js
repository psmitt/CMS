function loadTask(file) {
  Sections[id].viewFrame.style.display = 'none'
  fs.readFile(file, 'utf8', (error, xmlString) => {
    if (error) throw error
    const xmlDoc = new DOMParser().parseFromString(
      xmlString.charCodeAt(0) === 0xFEFF ? // BOM
      xmlString.substring(1) : xmlString, 'text/xml')

    let link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'src/Task/Task.css'
    Sections[id].taskFrame.contentDocument.head.appendChild(link)

    let header = document.createElement('header')
    header.addEventListener('click', showTask)
    header.innerHTML =
      `<h1>${xmlDoc.querySelector('task').attributes['title'].value}</h1>`
    Sections[id].taskFrame.contentDocument.body.appendChild(header)

    let footer = document.createElement('footer')
    for (let steps of xmlDoc.querySelector('task').children) {
      appendSteps(steps, footer)
    }
    Sections[id].taskFrame.contentDocument.body.appendChild(footer)
  })
}

function appendSteps(step, parent) {
  let node // to append
  switch (step.tagName) {
    case 'comment':
      if (!parent.querySelector('.Comments')) {
        node = document.createElement('h2')
        node.className = node.textContent = 'Comments'
        parent.appendChild(node);
      }
      node = document.createElement('p')
      node.innerHTML = step.textContent
      break
    case 'verification':
      node = document.createElement('h2')
      node.className = node.textContent = 'Verification'
      parent.appendChild(node);
      for (let each of step.children) {
        appendSteps(each, parent)
      }
      return
    default: // action, decision, option
      node = document.createElement('div')
      if (step.tagName === 'option')
        node.innerHTML = '<input type="radio"/>'
      else
        node.innerHTML = '<input type="checkbox"/>'
      let span = document.createElement('span')
      let child = step.firstElementChild // todo, question, answer
      let text = child.textContent
      while ((child = child.nextElementSibling) && child.tagName === 'button')
        text += `&ensp;<button>${child.attributes['title'].value}</button>`
      span.innerHTML = text
      node.appendChild(span)
      while (child) {
        appendSteps(child, node)
        child = child.nextElementSibling
      }
  }
  parent.appendChild(node);
}

function showTask() {
  console.log(parent);
  /*
    parent.minimizeNavigationBar()
    // decrease view's height if exists
    let view = parent.parentNode.nextElementSibling
    if (footer) {
      if (footer.style.height === 'calc(100% - var(--header-height))')
        footer.style.height = '50%'
      else
        footer.style.height = 'auto'
    }
  */
}