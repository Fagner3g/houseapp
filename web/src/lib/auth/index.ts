import Cookies from 'universal-cookie'

const TOKEN_KEY = 'houseapp:token'

export function setAuthToken(token: string, days = 1) {
  const cookies = new Cookies()
  cookies.set(TOKEN_KEY, token, { path: '/', maxAge: 60 * 60 * 24 * days })
}

export function getAuthToken(): string | undefined {
  const cookies = new Cookies()
  return cookies.get(TOKEN_KEY)
}

export function removeAuthToken() {
  const cookies = new Cookies()
  cookies.remove(TOKEN_KEY, { path: '/' })
}
