import api from '.'

export async function fetchWicketPage(modelId: number | string, url: string): Promise<string> {
  const { data } = await api.post(`/wicket/type${modelId}/${url}`)
  return data
}
