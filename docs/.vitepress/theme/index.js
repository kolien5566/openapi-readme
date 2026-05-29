import DefaultTheme from 'vitepress/theme'
import { theme, useOpenapi } from 'vitepress-openapi/client'
import 'vitepress-openapi/dist/style.css'
import './style.css'

import spec from '../../public/openapi.json'

export default {
  extends: DefaultTheme,
  async enhanceApp({ app }) {
    useOpenapi({
      spec,
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
          defaultBaseUrl: 'https://openapi.pylontech.com/v1',
          badges: ['deprecated'],
          hiddenSlots: ['branding', 'code-samples'],
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
