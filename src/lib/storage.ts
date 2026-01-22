export const readStorage = <T>(key: string, fallback: T): T => {
  if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
    return fallback
  }
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch (error) {
    console.warn(`Failed to read storage for ${key}`, error)
    return fallback
  }
}

export const writeStorage = <T>(key: string, value: T) => {
  if (typeof localStorage === 'undefined' || typeof localStorage.setItem !== 'function') {
    return
  }
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`Failed to write storage for ${key}`, error)
  }
}

export const removeStorage = (key: string) => {
  if (typeof localStorage === 'undefined' || typeof localStorage.removeItem !== 'function') {
    return
  }
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.warn(`Failed to remove storage for ${key}`, error)
  }
}
