import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import RepairForm from './components/RepairForm';
import DailyReport from './components/DailyReport';
import RepairsInbox from './components/RepairsInbox';
import Historial from './components/Historial';
import Login from './components/Login';
import TechnicianDashboard from './components/TechnicianDashboard';
import { AuthProvider, useAuth } from './AuthContext';

function AppContent() {
  const { user, logout } = useAuth();

  if (!user) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <div className="app-container">
        <nav className="navbar no-print">
          <NavLink to="/" className="nav-brand">
            <img src="/logo.png" alt="YACELLTECH" style={{ maxHeight: '40px' }} />
          </NavLink>
          
          <div className="nav-links" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            {user.role !== 'tech' ? (
              <>
                <NavLink to="/" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                  Formulario
                </NavLink>
                <NavLink to="/inbox" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                  Bandeja Pendientes
                </NavLink>
                <NavLink to="/report" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                  Cuadre Financiero
                </NavLink>
                <NavLink to="/history" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                  Historial
                </NavLink>
              </>
            ) : (
              <NavLink to="/tech-dash" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
                Mis Reparaciones
              </NavLink>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'white' }}>
            <span style={{ fontSize: '0.875rem' }}>Hola, <strong>{user.username}</strong></span>
            <button 
              onClick={logout} 
              className="btn btn-secondary" 
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', background: '#334155', color: '#fff', border: 'none' }}
              title="Cerrar sesión"
            >
              <LogOut size={16} /> Salir
            </button>
          </div>
        </nav>

        <main className="container">
          <Routes>
            <Route path="/" element={user.role === 'tech' ? <TechnicianDashboard /> : <RepairForm />} />
            <Route path="/inbox" element={<RepairsInbox />} />
            <Route path="/report" element={<DailyReport />} />
            <Route path="/history" element={<Historial />} />
            <Route path="/tech-dash" element={<TechnicianDashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
