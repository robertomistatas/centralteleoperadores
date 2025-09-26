import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import MainApp from './MainApp.jsx'
import LoginForm from './LoginForm.jsx'
import AuthLoading from './AuthLoading.jsx'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import './index.css'

// Verificar si mostrar la nueva aplicación de métricas
const SHOW_METRICS_APP = localStorage.getItem('showMetricsApp') === 'true' || 
                         window.location.search.includes('metrics=true');

// Componente principal que maneja la autenticación
const AppWithAuth = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  // Si el usuario no está autenticado, mostrar login
  if (!user) {
    return <LoginForm />;
  }

  // Si está habilitada la app de métricas, mostrar MainApp (que incluye ambas)
  if (SHOW_METRICS_APP) {
    return <MainApp />;
  }

  // Por defecto, mostrar la app original
  return <App />;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  </React.StrictMode>,
)
