document.querySelector('aside .close').addEventListener('click', closeForm)

function closeForm() {
  Aside.display = 'none'
  empty(FormTable)
  View.record = null
}

document.querySelector('article .close').addEventListener('click', _ => {
  Article.display = 'none'
  if (Section.display === 'block')
    Section.height = '100%'
  else
    restoreNavigationFrame('100%')
  deleteTask()
})

document.getElementById('CloseView').addEventListener('click', _ => {
  Section.display = 'none'
  if (Article.display === 'block')
    Article.height = '100%'
  else
    restoreNavigationFrame('100%')
})

function showFrame(frame) { // frame = Article or Section
  frame.display = 'block'
  if (frame.height === 'var(--header-height)')
    frame.height = ''
  if (Nav.width !== '2em')
    Nav.width = 'var(--aside-width)'
}

function growFrame(frame) { // frame = Article or Section
  // Close Form Frame
  Aside.display = 'none'
  // Shrink Navigation Frame
  shrinkNavigationFrame()
  // Change height of main frames
  if (frame.height === 'var(--header-height)')
    frame.height = ''
  else if (frame === Article)
    Section.height = 'var(--header-height)'
  else
    Article.height = 'var(--header-height)'
}