const aside = document.querySelector('aside')

aside.querySelector('header>h1').addEventListener('click', function () {
  console.log('form title clicked');
})

aside.querySelector('header>span').addEventListener('click', event => {
  console.log('form close clicked');
  closeForm()
})

function closeForm() {
  aside.style.width = 0
}