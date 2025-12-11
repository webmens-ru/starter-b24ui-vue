import axios from 'axios'

const baseURL =
  typeof window !== 'undefined' && window._HOSTNAME_
    ? window._HOSTNAME_
    : typeof window !== 'undefined'
      ? window.location.origin
      : ''

const token = typeof window !== 'undefined' ? window._ACCESS_TOKEN_ : undefined

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
})

export default api