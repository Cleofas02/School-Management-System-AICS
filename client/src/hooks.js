import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import { useToast } from './components/Feedback'

// Loads data from the API when the page opens.
//   const { data, error, reload } = useFetch('/courses')
// Pass null as the path to skip loading.
export function useFetch(path) {
  const [data, setData] = useState()
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!path) {
      setData(undefined)
      return
    }
    try {
      setError('')
      setData(await api(path))
    } catch (e) {
      setError(e.message)
    }
  }, [path])

  useEffect(() => {
    load()
  }, [load])

  return { data, error, reload: load }
}

// Runs a button action (save, approve, delete...), shows a pop-up message, then reloads the data.
//   const { run, busy } = useAction(reload)
//   run(() => api('/x', { method: 'POST' }), 'Saved!')   -> returns true / false
export function useAction(onDone) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  async function run(fn, success) {
    setBusy(true)
    try {
      await fn()
      if (success) toast.success(success)
      if (onDone) await onDone()
      return true
    } catch (e) {
      toast.error(e.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  return { run, busy }
}

// Light / dark mode, remembered in the browser
export function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return [dark, () => setDark((d) => !d)]
}
