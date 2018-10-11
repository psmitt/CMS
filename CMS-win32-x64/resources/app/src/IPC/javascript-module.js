module.exports = function countdown(callback_function) {
  let count = 10
  let timer = setInterval(_ => {
    callback_function(count--)
    if (count === 0)
      clearInterval(timer)
  }, 1000)
}
