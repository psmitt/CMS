const Nav = document.querySelector('nav').style
const Article = document.querySelector('article').style
const Section = document.querySelector('section').style
const Aside = document.querySelector('aside').style

document.querySelector('aside .close').addEventListener('click', _ => {
  Aside.display = 'none'
})

document.querySelector('article .close').addEventListener('click', _ => {
  Article.display = 'none'
  if (Section.display === 'block')
    Section.height = '100%'
  else
    restoreNavigationFrame('100%')
})

document.getElementById('CloseView').addEventListener('click', _ => {
  Tools.style.display = 'none'
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
  Nav.width = '2em'
  Search.type = 'text' // remove clear button from input field
  Search.placeholder = ''
  Search.style.paddingLeft = '0'
  Search.style.cursor = 'pointer'
  Search.style.color = 'rgba(0,0,0,0)' // hide last search
  Menu.style.display = 'none' // hide menu
  // Change height of main frames
  if (frame.height === 'var(--header-height)')
    frame.height = ''
  else if (frame === Article)
    Section.height = 'var(--header-height)'
  else
    Article.height = 'var(--header-height)'
}