const MESSAGE_TYPE = 'houseapp:transactions-changed'

window.addEventListener('message', event => {
  if (event.source !== window) return
  if (event.data?.type !== MESSAGE_TYPE) return
  chrome.runtime.sendMessage({ type: 'poll-now' }).catch(() => {})
})
