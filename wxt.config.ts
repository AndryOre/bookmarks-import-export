import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'wxt'

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
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    default_locale: 'en',
    options_ui: { page: 'app.html', open_in_tab: true },
    permissions: [
      'bookmarks',
      'favicon',
      'storage',
      'tabs',
      'alarms',
      'downloads',
      'offscreen',
    ],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
})
