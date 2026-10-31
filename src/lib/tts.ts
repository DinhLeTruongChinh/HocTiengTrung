export function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'; u.rate = 0.85
  const v = speechSynthesis.getVoices().find(v => v.lang.replace('_', '-').startsWith('zh'))
  if (v) u.voice = v
  speechSynthesis.cancel(); speechSynthesis.speak(u)
}
