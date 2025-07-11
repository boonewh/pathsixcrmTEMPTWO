import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './authContext.tsx';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from "react-hot-toast";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <>
          <App />
          <Toaster position="top-center" />
        </>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);