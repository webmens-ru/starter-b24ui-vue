import axios from "axios";

const api = axios.create({
  baseURL: window._HOSTNAME_,
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${window._ACCESS_TOKEN_}`
  }
})

export default api;