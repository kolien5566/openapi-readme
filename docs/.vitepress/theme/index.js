import DefaultTheme from 'vitepress/theme'
import { theme, useOpenapi } from 'vitepress-openapi/client'
import 'vitepress-openapi/dist/style.css'
import './style.css'

import spec from '../../public/openapi.json'

const productionApiBaseUrl = 'https://openapi-au.pylontechcloud.com/api/openapi/v1'
const localHosts = new Set(['localhost', '127.0.0.1', '::1'])
const isLocalDocs = typeof window !== 'undefined' && localHosts.has(window.location.hostname)
const localApiBaseUrl = typeof window !== 'undefined'
  ? `${window.location.origin}/api/openapi/v1`
  : productionApiBaseUrl
const apiBaseUrl = isLocalDocs ? localApiBaseUrl : productionApiBaseUrl
const clientSpec = {
  ...spec,
  servers: [
    {
      url: apiBaseUrl,
      description: isLocalDocs ? 'Local Development Proxy' : 'Production Environment',
    },
  ],
}

export default {
  extends: DefaultTheme,
  async enhanceApp({ app }) {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = 'light'
      localStorage.setItem('vitepress-theme-appearance', 'light')
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
          prefix: '--pylontech-openapi-au-v2',
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
