import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/i18n/module', '@wxt-dev/auto-icons'],
  manifest: {
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    default_locale: 'en',
    permissions: ['bookmarks', 'favicon', 'storage', 'tabs', 'alarms', 'downloads'],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
