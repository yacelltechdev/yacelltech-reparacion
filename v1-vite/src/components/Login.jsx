import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { LogIn } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleLogin = (e) => {
    e.preventDefault();
    const success = login(username.trim().toLowerCase(), password);
    if (!success) {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F8FAFC' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="YACELLTECH" style={{ maxHeight: '80px', marginBottom: '1rem' }} />
          <h2 style={{ color: '#0F172A', margin: 0 }}>Acceso al Sistema</h2>
        </div>
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Usuario</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
              placeholder="ej. caja o admin" 
              style={{ padding: '0.75rem' }} 
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              placeholder="••••" 
              style={{ padding: '0.75rem' }} 
            />
          </div>
          
          {error && (
            <div style={{ background: '#FEF2F2', borderLeft: '4px solid #EF4444', padding: '0.75rem', marginBottom: '1rem', color: '#991B1B', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '1rem' }}>
            <LogIn size={20} /> Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
