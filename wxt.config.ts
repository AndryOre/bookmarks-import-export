import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'wxt'

import { GITHUB_URL } from './lib/brand'

export default defineConfig({
  modules: [
    '@wxt-dev/module-react',
    '@wxt-dev/i18n/module',
    '@wxt-dev/auto-icons',
  ],
  imports: {
    eslintrc: {
      enabled: 9,
    },
  },
  manifest: {
    name: '__MSG_extensionManifestName__',
    description: '__MSG_extensionDescription__',
    default_locale: 'en',
    minimum_chrome_version: '119',
    homepage_url: GITHUB_URL,
    options_ui: { page: 'app.html', open_in_tab: true },
    permissions: [
      'bookmarks',
      'favicon',
      'storage',
      'alarms',
      'downloads',
      'offscreen',
      'unlimitedStorage',
      'notifications',
    ],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
})
