import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ht_token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      axios.get(`${API}/api/auth/me`)
        .then(r => setUser(r.data))
        .catch(() => { localStorage.removeItem("ht_token"); delete axios.defaults.headers.common["Authorization"]; })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function register(email, password) {
    const { data } = await axios.post(`${API}/api/auth/register`, { email, password });
    localStorage.setItem("ht_token", data.token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
    setUser(data.user);
    return data.user;
  }

  async function login(email, password) {
    const { data } = await axios.post(`${API}/api/auth/login`, { email, password });
    localStorage.setItem("ht_token", data.token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem("ht_token");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
