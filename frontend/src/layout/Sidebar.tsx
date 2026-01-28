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
        <aside
            className={`
        ${collapsed ? 'w-20' : 'w-64'} 
        bg-charcoal-900/95 backdrop-blur-md 
        h-screen fixed left-0 top-0 flex flex-col 
        border-r border-charcoal-700/50 
        transition-all duration-300 ease-in-out z-50
      `}
        >
            {/* Branding */}
            <div className="p-6 h-28 flex items-center border-b border-charcoal-800/50">
                <div className={`flex items-center w-full ${collapsed ? 'justify-center' : 'gap-3'}`}>
                    <div className="w-10 h-10 bg-gradient-to-br from-ruby-600 to-ruby-800 rounded-xl shadow-lg shadow-ruby-900/20 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-white" />
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
                            <h1 className="text-white font-black text-xl tracking-tighter leading-none">S.G.E.</h1>
                            <p className="text-charcoal-500 text-[10px] font-bold uppercase tracking-widest mt-1">Smart Stock</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 overflow-y-auto custom-scrollbar">
                <ul className="space-y-1.5">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentPage === item.id;
                        return (
                            <li key={item.id}>
                                <button
                                    onClick={() => onNavigate(item.id)}
                                    className={`
                    w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} 
                    px-4 py-3 rounded-xl transition-all duration-200 group relative
                    ${isActive
                                            ? 'bg-ruby-700/10 text-ruby-500 shadow-sm'
                                            : 'text-charcoal-400 hover:bg-charcoal-800/50 hover:text-charcoal-100'}
                  `}
                                    title={collapsed ? item.label : undefined}
                                >
                                    {/* Active Indicator Bar */}
                                    {isActive && (
                                        <div className="absolute left-0 w-1 h-6 bg-ruby-600 rounded-r-full shadow-[0_0_8px_rgba(155,17,30,0.5)]" />
                                    )}

                                    <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-ruby-500' : 'group-hover:text-white'}`} />

                                    {!collapsed && (
                                        <span className={`font-semibold text-sm whitespace-nowrap transition-colors duration-200 ${isActive ? 'text-white' : ''}`}>
                                            {item.label}
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer / Profile */}
            <div className="p-3 bg-charcoal-900/50 border-t border-charcoal-800/50">
                {!collapsed && user && (
                    <div className="mb-4 mx-1 p-3 bg-charcoal-800/30 rounded-2xl border border-charcoal-700/30">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-tr from-charcoal-700 to-charcoal-600 rounded-xl flex items-center justify-center border border-charcoal-600/50">
                                <User className="w-4 h-4 text-charcoal-300" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-charcoal-100 text-xs font-bold truncate leading-tight">
                                    {user.email.split('@')[0].toUpperCase()}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    <p className="text-charcoal-500 text-[10px] font-medium truncate">Online Now</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    <button
                        onClick={toggleCollapse}
                        className="w-full h-10 flex items-center justify-center text-charcoal-500 hover:text-white hover:bg-ruby-700/10 hover:border-ruby-700/30 transition-all rounded-xl border border-transparent"
                        title={collapsed ? 'Expandir Menu' : 'Recolher Menu'}
                    >
                        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4 ml-1" />}
                        {!collapsed && <span className="text-xs font-bold ml-2">Recolher</span>}
                    </button>

                    <div className="flex items-center justify-center p-1">
                        <span className="text-[10px] font-black text-charcoal-600 bg-charcoal-800/30 px-2 py-0.5 rounded-md border border-charcoal-700/20">
                            v1.5.0 <span className="opacity-40">• PRO</span>
                        </span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
