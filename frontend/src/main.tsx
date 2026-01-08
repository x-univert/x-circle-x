import ReactDOM from 'react-dom/client';

import { initApp } from 'lib';

import { App } from './App';
import { config } from './initConfig';
import './i18n';

// Initialize theme before app renders to prevent flash
const initTheme = () => {
  const savedTheme = localStorage.getItem('themeMode') || 'xcirclex';
  if (savedTheme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-mvx-theme', prefersDark ? 'mvx:dark-theme' : 'mvx:light-theme');
  } else {
    document.documentElement.setAttribute('data-mvx-theme', savedTheme);
  }
};

initTheme();

initApp(config).then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
});
