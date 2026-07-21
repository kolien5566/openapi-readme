const OPENAPI_ORIGIN = 'https://openapi-test.pylontechcloud.com'
const OPENAPI_BASE_PATH = '/api/openapi/v1'

export async function onRequest({ request, params }) {
  const incomingUrl = new URL(request.url)
  const path = Array.isArray(params.path) ? params.path.join('/') : ''
  const upstreamUrl = new URL(`${OPENAPI_BASE_PATH}/${path}`, OPENAPI_ORIGIN)
  upstreamUrl.search = incomingUrl.search

  const headers = new Headers(request.headers)
  headers.set('Host', new URL(OPENAPI_ORIGIN).host)
  headers.delete('Origin')
  headers.delete('Cookie')

  return fetch(upstreamUrl, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  })
}
