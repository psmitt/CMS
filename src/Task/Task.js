function loadTask(file) {
  let $article = $('main>section>article')
  $article.empty()
  fs.readFile(file, 'utf8', (error, xmlString) => {
    if (error) throw error
    const xmlDoc = xmlString.charCodeAt(0) === 0xFEFF ? // BOM
      $.parseXML(xmlString.substring(1)) : $.parseXML(xmlString)
    $article.append(`<h1>${$(xmlDoc).find('task').attr('title')}</h1>`)
    $(xmlDoc).find('task').children().each(function () {
      appendSubTask(this, $article[0])
    })
  })
}

// append subtask to root node
function appendSubTask(step, parent) {
  let node = document.createElement('div')
  if (step.tagName === 'option')
    node.innerHTML = '<input type="radio"/>'
  else
    node.innerHTML = '<input type="checkbox"/>'
  switch (step.tagName) {
    case 'comment':
      if ($('Comment', parent).length === 0)
        $(parent).append('<h2 class="Comments">Comments</h2>')
      $(parent).append('<p class="comment">${step}</p>')
      break;
    case 'verification':
      $(parent).append('<h2 class="Verification">Verification</h2>')
    default:
      if (step.tagName !== 'verification') { // action, decision, option
        let span = `<span>${step.firstElementChild.textContent}` // todo, question, answer
        $(step).children('button').each(function () {
          span += `<button>${$(this).attr('title')}</button>`
        })
        $(node).append(span + '</span>')
      }
      $(step).children('option').each(function () {
        appendSubTask(this, node)
      })
      $(step).children('action, decision').each(function () {
        appendSubTask(this, node)
      })
  }
  parent.appendChild(node);
}