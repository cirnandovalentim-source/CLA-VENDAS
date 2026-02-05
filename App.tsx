import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetails from './pages/ClientDetails';
import SalesList from './pages/SalesList';
import Payments from './pages/Payments';
import NewSale from './pages/NewSale';
import Sellers from './pages/Sellers';
import Reports from './pages/Reports';
import Products from './pages/Products';
import Settings from './pages/Settings';
import Setup from './pages/Setup';
import { ROUTES } from './constants';
import { ThemeProvider } from './contexts/ThemeContext';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path={ROUTES.LOGIN} element={<Login />} />
          <Route path={ROUTES.REGISTER} element={<Register />} />
          <Route path={ROUTES.SETUP} element={<Setup />} />
          
          {/* Protected Routes inside Layout */}
          <Route element={<Layout />}>
            <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
            <Route path={ROUTES.CLIENTS} element={<Clients />} />
            <Route path={ROUTES.SALES} element={<SalesList />} />
            <Route path={ROUTES.PAYMENTS} element={<Payments />} />
          </Route>

          {/* Fullscreen Routes */}
          <Route path={ROUTES.NEW_SALE} element={<NewSale />} />
          <Route path={ROUTES.CLIENT_DETAILS} element={<ClientDetails />} />
          <Route path={ROUTES.SELLERS} element={<Sellers />} />
          <Route path={ROUTES.REPORTS} element={<Reports />} />
          <Route path={ROUTES.PRODUCTS} element={<Products />} />
          <Route path={ROUTES.SETTINGS} element={<Settings />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;