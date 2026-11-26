import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import '@fontsource-variable/inter'
import '@fontsource-variable/manrope'
import '@fontsource-variable/source-serif-4'
import '@fontsource-variable/onest'
import '@fontsource-variable/montserrat'
import '@fontsource-variable/rubik'
import '@fontsource-variable/nunito'
import '@fontsource-variable/unbounded'
import '@fontsource-variable/playfair-display'
import '@fontsource-variable/jetbrains-mono'
import './shared/tableStyles.css'
import { createApp, defineAsyncComponent } from 'vue'
import { createPinia } from 'pinia'
import App from './app/App.vue'
import vuetify from './app/vuetify'

// Only the MCP server, a development tool, asks for this page.
const isScreenshot = import.meta.env.DEV && new URLSearchParams(window.location.search).has('screenshot')
const root = isScreenshot ? defineAsyncComponent(() => import('./app/ScreenshotApp.vue')) : App

createApp(root).use(createPinia()).use(vuetify).mount('#app')
