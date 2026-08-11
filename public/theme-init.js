;(() => {
  try {
    const isTheme = (value) =>
      value === 'light' || value === 'dark' || value === 'system'
    const readJson = (key) => {
      try {
        const raw = globalThis.localStorage?.getItem(key)
        return raw ? JSON.parse(raw) : null
      } catch {
        return null
      }
    }
    const preferences = readJson('randomander:state:v3:preferences')
    const partitionTheme =
      preferences?.schema === 'randomander-partition' &&
      preferences?.version === 1 &&
      preferences?.partition === 'preferences' &&
      isTheme(preferences?.value?.theme)
        ? preferences.value.theme
        : null
    const legacyTheme = readJson('randomander:state:v2')?.theme
    const savedTheme =
      partitionTheme ?? (isTheme(legacyTheme) ? legacyTheme : 'system')
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
