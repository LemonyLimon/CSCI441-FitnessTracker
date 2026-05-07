import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { bootstrapOidcFragment } from '@/lib/oidc-fragment';
import './index.css';
import './styles/app-themes.css';

bootstrapOidcFragment();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
