import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './layout/Sidebar';
import Header from './layout/Header';
import MobileBottomNav from './components/MobileBottomNav';
import OfflineIndicator from './components/OfflineIndicator';
import InstallPrompt from './components/InstallPrompt';
import Dashboard from './pages/Dashboard';
import Entries from './pages/Entries';
import Stock from './pages/Stock';
import NFe from './pages/NFe';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Admin from './pages/Admin';

import { notificationService } from './services/NotificationService';
import { AnimatePresence, motion } from 'framer-motion';

function MainApp() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isAuthenticated, logout } = useAuth();

  // Inicializar Notificações PWA
  useEffect(() => {
    if (isAuthenticated) {
      // Conectar ao SSE. A lógica de mostrar a notificação no serviço 
      // já verifica se a permissão foi concedida.
      notificationService.connect();
    }
    return () => notificationService.disconnect();
  }, [isAuthenticated]);

  // Registrar Service Worker para PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // O service worker será registrado automaticamente pelo vite-plugin-pwa
      // após o build. Em desenvolvimento, não fazemos nada.
      if (import.meta.env.PROD) {
        navigator.serviceWorker.ready.then(() => {
          console.log('Service Worker registrado e pronto');
        });
      }
    }
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  const pageConfig = {
    dashboard: { title: 'Dashboard', component: Dashboard, showSync: true },
    entries: { title: 'Entradas', component: Entries, showSync: false },
    stock: { title: 'Estoque', component: Stock, showSync: true },
    nfe: { title: 'NF-e', component: NFe, showSync: false },
    reports: { title: 'Relatórios', component: Reports, showSync: false },
    admin: { title: 'Configurações de Admin', component: Admin, showSync: false },
  };

  const config = pageConfig[currentPage as keyof typeof pageConfig];
  const PageComponent = config.component;

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden text-navy-900">
      <OfflineIndicator />
      <InstallPrompt />

      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onCollapse={setSidebarCollapsed}
        onLogout={logout}
        isOpen={false}
        onMobileClose={() => { }}
      />

      <div className={`
        flex-1 flex flex-col transition-all duration-300 min-w-0
        ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}
      `}>
        <Header
          title={config.title}
          onSync={config.showSync ? () => window.location.reload() : undefined}
        />
        <main className="flex-1 overflow-auto p-4 md:p-8 pb-20 md:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <PageComponent />
            </motion.div>
          </AnimatePresence>
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
