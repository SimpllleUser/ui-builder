
import '@mdi/font/css/materialdesignicons.css';
import 'vuetify/styles';

import { createVuetify } from 'vuetify';

export default createVuetify({
  theme: {
    defaultTheme: 'system',
    themes: {
      light: {
        colors: {
          primary: '#6366F1',
          secondary: '#EC4899',
          accent: '#06B6D4',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',

          background: '#FFFFFF',
          surface: '#F8FAFC',
          'surface-bright': '#FFFFFF',
          'surface-light': '#F1F5F9',
          'surface-dim': '#E2E8F0',

          'on-primary': '#FFFFFF',
          'on-secondary': '#FFFFFF',
          'on-accent': '#FFFFFF',
          'on-success': '#FFFFFF',
          'on-warning': '#FFFFFF',
          'on-error': '#FFFFFF',
          'on-info': '#FFFFFF',
          'on-background': '#0F172A',
          'on-surface': '#1E293B',

          'primary-dim': '#EEF2FF',
          'secondary-dim': '#FCE7F3',
          'accent-dim': '#CFFAFE',
        }
      },
      dark: {
        colors: {
          primary: '#818CF8',
          secondary: '#F472B6',
          accent: '#22D3EE',
          success: '#34D399',
          warning: '#FBBF24',
          error: '#F87171',
          info: '#60A5FA',

          background: '#0F172A',
          surface: '#1E293B',
          'surface-bright': '#334155',
          'surface-light': '#1E293B',
          'surface-dim': '#0F172A',

          'on-primary': '#1E293B',
          'on-secondary': '#1E293B',
          'on-accent': '#1E293B',
          'on-success': '#0F172A',
          'on-warning': '#0F172A',
          'on-error': '#1E293B',
          'on-info': '#1E293B',
          'on-background': '#F1F5F9',
          'on-surface': '#F8FAFC',

          'primary-dim': '#312E81',
          'secondary-dim': '#500724',
          'accent-dim': '#0C4A6E',
        }
      }
    }
  }
});
