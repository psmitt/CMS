const TaskTitle = document.getElementById('task')
const Procedure = document.querySelector('article>footer')

function load_task(taskname) { // taskname is filename without file extension
  while (Procedure.firstChild)
    Procedure.removeChild(Procedure.firstChild)
  let xmlDoc = readXMLFile('Task', taskname + '.xml')
  TaskTitle.textContent = xmlDoc.querySelector('task').attributes['title'].value
  for (let step of xmlDoc.querySelector('task').children)
    appendStep(step, Procedure)
}

function appendStep(step, parent) {
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
        appendStep(each, parent)
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
        appendStep(child, node)
        child = child.nextElementSibling
      }
  }
  parent.appendChild(node);
}

function showTask() {
  closeForm()
  minimizeNavigationBar()
  decreaseView()
}