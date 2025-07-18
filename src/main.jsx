import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import LoginForm from './LoginForm.jsx'
import AuthLoading from './AuthLoading.jsx'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import './index.css'

// Componente principal que maneja la autenticación
const AppWithAuth = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  return user ? <App /> : <LoginForm />;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  </React.StrictMode>,
)
