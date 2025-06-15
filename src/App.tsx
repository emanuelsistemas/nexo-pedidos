import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ErrorBoundary from './components/comum/ErrorBoundary';
import EntrarPage from './pages/EntrarPage';
import CadastrarPage from './pages/CadastrarPage';
import DashboardLayout from './components/dashboard/DashboardLayout';
import DashboardPage from './pages/dashboard/DashboardPage';
import ConexaoPage from './pages/dashboard/ConexaoPage';
import ProdutosPage from './pages/dashboard/ProdutosPage';
import AdicionaisPage from './pages/dashboard/AdicionaisPage';
import UnidadeMedidaPage from './pages/dashboard/UnidadeMedidaPage';
import ClientesPage from './pages/dashboard/ClientesPage';
import FaturamentoPage from './pages/dashboard/FaturamentoPage';
import EditarPedidoPage from './pages/dashboard/EditarPedidoPage';
import GestorPage from './pages/dashboard/GestorPage';
import EntregadorPage from './pages/dashboard/EntregadorPage';
import TaxaEntregaPage from './pages/dashboard/TaxaEntregaPage';
import ConfiguracoesPage from './pages/dashboard/ConfiguracoesPage';
import PDVPage from './pages/dashboard/PDVPage';
import EstoqueMinimoPage from './pages/dashboard/EstoqueMinimoPage';
import NfePage from './pages/dashboard/NfePage';
import InutilizacaoPage from './pages/dashboard/InutilizacaoPage';
import TesteEmailPage from './pages/dashboard/TesteEmailPage';

// Páginas de usuário mobile
import UserMobileLayout from './components/dashboard/UserMobileLayout';
import UserDashboardPage from './pages/user/UserDashboardPage';
import UserPedidosPage from './pages/user/UserPedidosPage';
import UserNovoPedidoPage from './pages/user/UserNovoPedidoPage';
import UserProdutosPage from './pages/user/UserProdutosPage';
import UserClientesPage from './pages/user/UserClientesPage';
import UserNovoClienteCompleto from './pages/user/UserNovoClienteCompleto';
import UserPerfilPage from './pages/user/UserPerfilPage';

// Páginas públicas
import NotaPedidoPage from './pages/public/NotaPedidoPage';
import ContadorPortalPage from './pages/public/ContadorPortalPage';

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/entrar" replace />} />
        <Route path="/entrar" element={<EntrarPage />} />
        <Route path="/cadastrar" element={<CadastrarPage />} />

        {/* Rotas públicas */}
        <Route path="/pedido/:codigoPedido" element={<NotaPedidoPage />} />
        <Route path="/contador" element={<ContadorPortalPage />} />

        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="produtos" element={<ProdutosPage />} />
          <Route path="produtos/adicionais" element={<AdicionaisPage />} />
          <Route path="unidade-medida" element={<UnidadeMedidaPage />} />
          <Route path="clientes" element={<ClientesPage />} />
          <Route path="pedidos" element={<UserPedidosPage />} />
          <Route path="pedidos/novo" element={<UserNovoPedidoPage />} />
          <Route path="pedidos/editar/:id" element={<UserNovoPedidoPage />} />
          <Route path="faturamento" element={<FaturamentoPage />} />
          <Route path="pdv" element={<PDVPage />} />
          <Route path="editar-pedido/:id" element={<EditarPedidoPage />} />
          <Route path="gestor" element={<GestorPage />} />
          <Route path="conexao" element={<ConexaoPage />} />
          <Route path="entregador" element={<EntregadorPage />} />
          <Route path="entregador/taxa" element={<TaxaEntregaPage />} />
          <Route path="estoque-minimo" element={<EstoqueMinimoPage />} />
          <Route path="nfe" element={<NfePage />} />
          <Route path="inutilizacao" element={<InutilizacaoPage />} />
          <Route path="teste-email" element={<TesteEmailPage />} />
          <Route path="configuracoes" element={<ConfiguracoesPage />} />
        </Route>

        {/* Rotas para o layout mobile de usuários do tipo "user" */}
        <Route path="/user" element={<UserMobileLayout />}>
          <Route index element={<Navigate to="/user/dashboard" replace />} />
          <Route path="dashboard" element={<UserDashboardPage />} />
          <Route path="pedidos" element={<UserPedidosPage />} />
          <Route path="pedidos/novo" element={<UserNovoPedidoPage />} />
          <Route path="pedidos/editar/:id" element={<UserNovoPedidoPage />} />
          <Route path="produtos" element={<UserProdutosPage />} />
          <Route path="clientes" element={<UserClientesPage />} />
          <Route path="clientes/novo" element={<UserNovoClienteCompleto />} />
          <Route path="perfil" element={<UserPerfilPage />} />
          <Route path="pdv" element={<PDVPage />} />
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
    </ErrorBoundary>
  );
}

export default App;