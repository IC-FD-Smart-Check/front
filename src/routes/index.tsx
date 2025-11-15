import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { routesConfig } from './routesConfig';

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas dinâmicas baseadas na configuração */}
        {routesConfig.map((routeConfig) => (
          <Route
            key={routeConfig.path}
            path={routeConfig.path}
            element={<ProtectedRoute config={routeConfig} />}
          />
        ))}

        {/* Rota 404 - redireciona para login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;