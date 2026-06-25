import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("sgi_usuario");
    if (raw) setUsuario(JSON.parse(raw));
    setCargando(false);
  }, []);

  const login = async ({ email, password }) => {
    const res = await fetch("http://localhost:8000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Error al iniciar sesión");
    }
    const data = await res.json();
    localStorage.setItem("sgi_token", data.access_token);
    localStorage.setItem("sgi_usuario", JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("sgi_token");
    localStorage.removeItem("sgi_usuario");
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {!cargando && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
