import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login     from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Pedidos   from "./pages/Pedidos";
import Productos from "./pages/Productos";
import Clientes  from "./pages/Clientes";
import Stock     from "./pages/Stock";
import Monitor   from "./pages/Monitor";
import Usuarios  from "./pages/Usuarios";
import Reportes  from "./pages/Reportes";
import Layout    from "./components/Layout";
import "./styles/global.css";

function RutaPrivada({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/"          element={<RutaPrivada><Dashboard /></RutaPrivada>} />
          <Route path="/pedidos"   element={<RutaPrivada><Pedidos /></RutaPrivada>} />
          <Route path="/productos" element={<RutaPrivada><Productos /></RutaPrivada>} />
          <Route path="/clientes"  element={<RutaPrivada><Clientes /></RutaPrivada>} />
          <Route path="/stock"     element={<RutaPrivada><Stock /></RutaPrivada>} />
          <Route path="/monitor"   element={<RutaPrivada><Monitor /></RutaPrivada>} />
          <Route path="/usuarios"  element={<RutaPrivada><Usuarios /></RutaPrivada>} />
          <Route path="/reportes"  element={<RutaPrivada><Reportes /></RutaPrivada>} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}