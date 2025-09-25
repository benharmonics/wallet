import { ref } from 'vue'

export const isLoggedIn = ref<boolean | null>(null)

export function accessToken(): string | null {
  return localStorage.getItem('accessToken')
}

export async function checkAuth(): Promise<void> {
  try {
    const res = await fetch('/api/whoami', {
      credentials: 'include',
      headers: { Authorization: `Bearer ${accessToken()}` },
    })
    isLoggedIn.value = res.status === 200
  } catch (e) {
    console.error(`Network error: ${e}`)
    isLoggedIn.value = false
  }
}

export async function login(password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const json = await res.json()
    if (res.status !== 200) {
      return { ok: false, error: json.data }
    }
    localStorage.setItem('accessToken', json.data.accessToken)
  } catch (e) {
    return { ok: false, error: (e as any)?.message || 'Network error.' }
  }
  await checkAuth()
  return { ok: Boolean(isLoggedIn.value) }
}

export async function refresh(): Promise<void> {
  try {
    const res = await fetch('/api/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${accessToken()}` },
    })
    if (res.status !== 200) {
      await logout()
      return
    }
    const json = await res.json()
    localStorage.setItem('accessToken', json.data.accessToken)
  } catch (e) {
    console.error('Network error:', e)
  }
}

export async function logout(): Promise<void> {
  await fetch('/api/logout', {
    method: 'POST',
    credentials: 'include',
  })
  localStorage.removeItem('accessToken')
  await checkAuth()
}
