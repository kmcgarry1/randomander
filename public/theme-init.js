;(() => {
  try {
    const raw = globalThis.localStorage?.getItem('randomander:state:v2')
    const savedTheme = raw ? JSON.parse(raw)?.theme : 'system'
    const prefersDark = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches
    const useDark = savedTheme === 'dark' || (savedTheme !== 'light' && prefersDark)
    document.documentElement.classList.toggle('dark', Boolean(useDark))
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', useDark ? '#151218' : '#fff8fb')
  } catch {
    // Storage can be blocked or corrupt; CSS and the mounted app apply defaults.
  }
})()
