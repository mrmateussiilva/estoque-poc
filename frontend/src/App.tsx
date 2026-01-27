import { useState } from 'react';
import Sidebar from './layout/Sidebar';
import Header from './layout/Header';
import Dashboard from './pages/Dashboard';
import Entries from './pages/Entries';
import Stock from './pages/Stock';
import NFe from './pages/NFe';
import Reports from './pages/Reports';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const pageConfig = {
    dashboard: { title: 'Dashboard', component: Dashboard, showSync: true },
    entries: { title: 'Entradas', component: Entries, showSync: false },
    stock: { title: 'Estoque', component: Stock, showSync: true },
    nfe: { title: 'NF-e', component: NFe, showSync: false },
    reports: { title: 'Relatórios', component: Reports, showSync: false },
  };

  const config = pageConfig[currentPage as keyof typeof pageConfig];
  const PageComponent = config.component;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} onCollapse={setSidebarCollapsed} />
      <div className={`flex-1 ${sidebarCollapsed ? 'ml-20' : 'ml-64'} flex flex-col transition-all duration-300`}>
        <Header title={config.title} onSync={config.showSync ? () => window.location.reload() : undefined} />
        <main className="flex-1 overflow-auto p-8">
          <PageComponent />
        </main>
      </div>
    </div>
  );
}

export default App;
