import DefaultTheme from 'vitepress/theme'
import { theme, useOpenapi } from 'vitepress-openapi/client'
import 'vitepress-openapi/dist/style.css'
import './style.css'

import spec from '../../public/openapi.json'

const productionApiBaseUrl = 'https://openapi.pylontechcloud.com/api/openapi/v1'
const apiProxyPath = '/api/openapi/v1'
const apiBaseUrl = typeof window !== 'undefined'
  ? `${window.location.origin}${apiProxyPath}`
  : productionApiBaseUrl
const clientSpec = {
  ...spec,
  servers: [
    {
      url: apiBaseUrl,
      description: 'Production Environment via Same-Origin Proxy',
    },
  ],
}

function isOpenapiProxyRequest(input) {
  const requestUrl = typeof input === 'string' || input instanceof URL
    ? String(input)
    : input?.url

  if (!requestUrl) {
    return false
  }

  try {
    const url = new URL(requestUrl, window.location.origin)
    return url.origin === window.location.origin && url.pathname.startsWith(apiProxyPath)
  }
  catch {
    return false
  }
}

function normalizeBearerAuthorization(headers) {
  const authorization = headers.get('Authorization')

  if (!authorization) {
    return
  }

  const value = authorization.trim()
  if (!value || /^Bearer\s+/i.test(value)) {
    return
  }

  headers.set('Authorization', `Bearer ${value}`)
}

function installOpenapiBearerPatch() {
  if (typeof window === 'undefined' || window.__pylontechOpenapiBearerPatchInstalled) {
    return
  }

  window.__pylontechOpenapiBearerPatchInstalled = true
  const nativeFetch = window.fetch.bind(window)

  window.fetch = (input, init = {}) => {
    if (!isOpenapiProxyRequest(input)) {
      return nativeFetch(input, init)
    }

    const request = input instanceof Request ? input : null
    const headers = new Headers(init.headers ?? request?.headers)
    normalizeBearerAuthorization(headers)

    if (request) {
      return nativeFetch(new Request(request, { ...init, headers }))
    }

    return nativeFetch(input, { ...init, headers })
  }
}

export default {
  extends: DefaultTheme,
  async enhanceApp({ app }) {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = 'light'
      localStorage.setItem('vitepress-theme-appearance', 'light')
      installOpenapiBearerPatch()
    }

    useOpenapi({
      spec: clientSpec,
      config: {
        spec: {
          groupByTags: true,
          defaultTag: 'API',
        },
        path: {
          showBaseURL: false,
        },
        operation: {
          cols: 2,
          defaultBaseUrl: apiBaseUrl,
          badges: ['deprecated'],
          hiddenSlots: ['branding', 'code-samples'],
        },
        storage: {
          prefix: '--pylontech-openapi-proxy-v2',
        },
        playground: {
          jsonEditor: {
            mode: 'tree',
            mainMenuBar: false,
            navigationBar: false,
            statusBar: false,
          },
          examples: {
            behavior: 'value',
            playgroundExampleBehavior: 'value',
          },
        },
        requestBody: {
          defaultView: 'schema',
        },
        response: {
          responseCodeSelector: 'tabs',
          maxTabs: 5,
          body: {
            defaultView: 'schema',
          },
        },
        schemaViewer: {
          deep: 1,
        },
      },
    })

    theme.enhanceApp({ app })
  },
}
