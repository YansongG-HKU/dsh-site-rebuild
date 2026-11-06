// Fixture behaviour: a clock that changes on its own (tests the noise mask)
// and one healthy console line (tests the health ledger).
console.log('fixture ready')

const clock = document.getElementById('clock')
if (clock) {
  const tick = () => {
    // Milliseconds guarantee the two study screenshots differ even when they
    // fall inside the same wall-clock second (the noise-mask test relies on it).
    clock.textContent = ' · ' + new Date().toLocaleTimeString('zh-CN') + '.' + String(Date.now() % 1000).padStart(3, '0')
  }
  tick()
  setInterval(tick, 60)
}
