'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [fighter, setFighter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.get('/auth/me')
      .then((res) => {
        setUser(res.data.user);
        setFighter(res.data.fighter);
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (token, userData, fighterData) => {
    localStorage.setItem('token', token);
    setUser(userData);
    setFighter(fighterData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setFighter(null);
  };

  const updateFighter = (fighterData) => {
    setFighter(fighterData);
  };

  // Refetch the fighter profile from the server.
  // Call this after a fight result is confirmed so ELO, wins/losses,
  // and badgesEarned update in the UI without a page reload.
  const refreshFighter = async () => {
    try {
      const res = await api.get('/fighter/me');
      setFighter(res.data);
    } catch (err) {
      console.error('Failed to refresh fighter profile:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, fighter, loading, login, logout, updateFighter, refreshFighter }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
