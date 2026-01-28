import { LayoutDashboard, Package, FileText, BarChart3, ChevronLeft, ChevronRight, ArrowDownToLine, User } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
    currentPage: string;
    onNavigate: (page: string) => void;
    onCollapse?: (collapsed: boolean) => void;
}

export default function Sidebar({ currentPage, onNavigate, onCollapse }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false);
    const { user } = useAuth();

    const toggleCollapse = () => {
        const newState = !collapsed;
        setCollapsed(newState);
        onCollapse?.(newState);
    };

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'entries', label: 'Entradas', icon: ArrowDownToLine },
        { id: 'stock', label: 'Estoque', icon: Package },
        { id: 'nfe', label: 'NF-e', icon: FileText },
        { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    ];

    return (
        <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-charcoal-900 h-screen fixed left-0 top-0 flex flex-col border-r border-charcoal-700 transition-all duration-300`}>
            <div className="p-6 border-b border-charcoal-700">
                <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
                    <div className="w-10 h-10 bg-ruby-700 rounded-ruby flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6 text-white" />
                    </div>
                    {!collapsed && (
                        <div>
                            <h1 className="text-white font-bold text-lg tracking-tight">S.G.E.</h1>
                            <p className="text-charcoal-400 text-xs">Sistema de Gestão</p>
                        </div>
                    )}
                </div>
            </div>

            <nav className="flex-1 p-4">
                <ul className="space-y-1">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentPage === item.id;
                        return (
                            <li key={item.id}>
                                <button
                                    onClick={() => onNavigate(item.id)}
                                    className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-ruby transition-all ${isActive
                                        ? 'bg-ruby-700 text-white'
                                        : 'text-charcoal-400 hover:bg-charcoal-700 hover:text-white'
                                        }`}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <Icon className="w-5 h-5 flex-shrink-0" />
                                    {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="p-4 border-t border-charcoal-700 space-y-4">
                {!collapsed && user && (
                    <div className="flex items-center gap-3 px-2 py-1">
                        <div className="w-8 h-8 bg-charcoal-700 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-charcoal-400" />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-white text-xs font-bold truncate">{user.email.split('@')[0]}</p>
                            <p className="text-charcoal-500 text-[10px] truncate">{user.email}</p>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    <button
                        onClick={toggleCollapse}
                        className="w-full flex items-center justify-center p-2 text-charcoal-400 hover:text-white hover:bg-charcoal-700 rounded-ruby transition-all"
                        title={collapsed ? 'Expandir' : 'Recolher'}
                    >
                        {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                    </button>

                    {!collapsed && (
                        <div className="text-center">
                            <span className="text-[10px] font-black tracking-widest text-charcoal-600 uppercase bg-charcoal-800 px-2 py-0.5 rounded">v1.2.4</span>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
