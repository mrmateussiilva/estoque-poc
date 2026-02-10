import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './layout/Sidebar';
import Header from './layout/Header';
import MobileBottomNav from './components/MobileBottomNav';
import Dashboard from './pages/Dashboard';
import Entries from './pages/Entries';
import Stock from './pages/Stock';
import NFe from './pages/NFe';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Admin from './pages/Admin';

function MainApp() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setIsMobileMenuOpen(false);
  };

  const pageConfig = {
    dashboard: { title: 'Dashboard', component: Dashboard, showSync: true },
    entries: { title: 'Entradas', component: Entries, showSync: false },
    stock: { title: 'Estoque', component: Stock, showSync: true },
    nfe: { title: 'NF-e', component: NFe, showSync: false },
    reports: { title: 'Relatórios', component: Reports, showSync: false },
    admin: { title: 'Administração', component: Admin, showSync: false },
  };

  const config = pageConfig[currentPage as keyof typeof pageConfig];
  const PageComponent = config.component;

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onCollapse={setSidebarCollapsed}
        isOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      <div className={`
        flex-1 flex flex-col transition-all duration-300 min-w-0
        ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-60'}
      `}>
        <Header
          title={config.title}
          onSync={config.showSync ? () => window.location.reload() : undefined}
          onLogout={logout}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-auto p-4 md:p-8 pb-20 md:pb-8">
          <PageComponent />
        </main>
        
        {/* Bottom Navigation para Mobile */}
        <MobileBottomNav
          currentPage={currentPage}
          onNavigate={handleNavigate}
        />
      </div>
    </div>
  );
}

import { DataProvider } from './contexts/DataContext';

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <MainApp />
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
