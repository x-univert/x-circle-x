import ReactDOM from 'react-dom/client';

import { initApp } from 'lib';

import { App } from './App';
import { config } from './initConfig';
import './i18n';

initApp(config).then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
});
