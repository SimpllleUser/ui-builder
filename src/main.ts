import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import './shared/tableStyles.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './app/App.vue'
import vuetify from './app/vuetify'

createApp(App).use(createPinia()).use(vuetify).mount('#app')
