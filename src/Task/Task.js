const article = document.querySelector('main>section>.content>article')

function loadTask(file) {
  fs.readFile(file, 'utf8', (error, xmlString) => {
    if (error) throw error
    const xmlDoc = new DOMParser().parseFromString(
      xmlString.charCodeAt(0) === 0xFEFF ? // BOM
      xmlString.substring(1) : xmlString, 'text/xml')
    article.querySelector('header').innerHTML =
      `<h1>${xmlDoc.querySelector('task').attributes['title'].value}</h1>`
    let scrollbox = article.querySelector('div.scrollbox')
    while (scrollbox.firstChild)
      scrollbox.removeChild(scrollbox.firstChild)
    $(scrollbox).scrollTop()
    for (let steps of xmlDoc.querySelector('task').children) {
      appendSteps(steps, scrollbox)
    }
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