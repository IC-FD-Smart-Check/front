import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 min-w-0 w-full p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 lg:ml-64">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;