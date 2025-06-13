import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider 
      clientId="424080544040-dacl3vj1nf21ku2qnfham61180cjuegp.apps.googleusercontent.com"
      onScriptLoadError={() => console.error('Google Script failed to load')}
      onScriptLoadSuccess={() => console.log('Google Script loaded successfully')}
    >
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);