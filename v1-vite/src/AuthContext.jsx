import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('yacelltech_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (username, password) => {
    if (username === 'admin' && password === 'admin123') {
      const u = { username: 'Administrador', role: 'admin' };
      setUser(u);
      localStorage.setItem('yacelltech_user', JSON.stringify(u));
      return true;
    }
    if (username === 'caja' && password === '1234') {
      const u = { username: 'Caja', role: 'caja' };
      setUser(u);
      localStorage.setItem('yacelltech_user', JSON.stringify(u));
      return true;
    }

    const techs = ['Carlos', 'Oscar', 'Freddy'];
    if (techs.some(t => t.toLowerCase() === username.toLowerCase()) && password === '1234') {
      const selectedTech = techs.find(t => t.toLowerCase() === username.toLowerCase());
      const u = { username: selectedTech, role: 'tech' };
      setUser(u);
      localStorage.setItem('yacelltech_user', JSON.stringify(u));
      return true;
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('yacelltech_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
