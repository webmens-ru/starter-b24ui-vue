import axios from "axios";

const api = axios.create({
  baseURL: window._HOSTNAME_,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,  // сессионная cookie (Yii2 login)
})

// Токен берётся при каждом запросе — на случай если он обновится после инициализации
api.interceptors.request.use(config => {
  const token = window._ACCESS_TOKEN_
  if (token) config.headers['Authorization'] = `Bearer ${token}`

  if (import.meta.env.DEV) {
    console.groupCollapsed(`[API] ${config.method?.toUpperCase()} ${config.baseURL ?? ''}${config.url}`)
    console.log('Headers:', { ...config.headers })
    if (config.data) console.log('Body:', config.data)
    console.groupEnd()
  }
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (import.meta.env.DEV) {
      const res = err.response
      console.group(`[API ERROR] ${res?.status} ${err.config?.method?.toUpperCase()} ${err.config?.url}`)
      console.log('Status:', res?.status)
      console.log('Response body:', res?.data)
      console.log('Request headers:', err.config?.headers)
      console.groupEnd()
    }
    return Promise.reject(err)
  }
)

export default api;