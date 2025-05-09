import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import EntrarPage from './pages/EntrarPage';
import CadastrarPage from './pages/CadastrarPage';
import DashboardLayout from './components/dashboard/DashboardLayout';
import DashboardPage from './pages/dashboard/DashboardPage';
import ConexaoPage from './pages/dashboard/ConexaoPage';
import ProdutosPage from './pages/dashboard/ProdutosPage';
import AdicionaisPage from './pages/dashboard/AdicionaisPage';
import GestorPage from './pages/dashboard/GestorPage';
import EntregadorPage from './pages/dashboard/EntregadorPage';
import TaxaEntregaPage from './pages/dashboard/TaxaEntregaPage';
import ConfiguracoesPage from './pages/dashboard/ConfiguracoesPage';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/entrar" replace />} />
        <Route path="/entrar" element={<EntrarPage />} />
        <Route path="/cadastrar" element={<CadastrarPage />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="produtos" element={<ProdutosPage />} />
          <Route path="produtos/adicionais" element={<AdicionaisPage />} />
          <Route path="gestor" element={<GestorPage />} />
          <Route path="conexao" element={<ConexaoPage />} />
          <Route path="entregador" element={<EntregadorPage />} />
          <Route path="entregador/taxa" element={<TaxaEntregaPage />} />
          <Route path="configuracoes" element={<ConfiguracoesPage />} />
        </Route>
      </Routes>

      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </>
  );
}

export default App;