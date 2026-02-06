import { LayoutDashboard, Package, FileText, BarChart3, ChevronLeft, ChevronRight, ArrowDownToLine, User, Gem, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
    currentPage: string;
    onNavigate: (page: string) => void;
    onCollapse?: (collapsed: boolean) => void;
    isOpen?: boolean;
    onMobileClose?: () => void;
}

export default function Sidebar({ currentPage, onNavigate, onCollapse, isOpen, onMobileClose }: SidebarProps) {
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

    const adminItems = [
        { id: 'admin', label: 'Painel Admin', icon: ShieldCheck },
    ];

    return (
        <>
            {/* Backdrop for Mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] md:hidden animate-in fade-in duration-300"
                    onClick={onMobileClose}
                />
            )}

            <aside
                className={`
          ${collapsed ? 'w-20' : 'w-60'} 
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          bg-charcoal-950
          h-screen fixed left-0 top-0 flex flex-col 
          border-r border-charcoal-800
          transition-all duration-300 z-50
        `}
            >
                {/* Branding */}
                <div className="px-6 h-24 flex items-center border-b border-charcoal-900/50">
                    <div className={`flex items-center w-full ${collapsed ? 'justify-center' : 'gap-4'}`}>
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-ruby-600 rounded-xl flex items-center justify-center shadow-sm">
                                <Gem className="w-5 h-5 text-white" />
                            </div>
                        </div>
                        {!collapsed && (
                            <div className="overflow-hidden">
                                <h1 className="text-white font-bold text-lg tracking-tight leading-none uppercase">
                                    S.G.E.
                                </h1>
                                <p className="text-charcoal-500 text-[10px] font-bold uppercase tracking-wider mt-1">Smart Stock</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-6 overflow-y-auto hidden-scrollbar">
                    {!collapsed && (
                        <div className="mb-4 px-4 text-[10px] font-bold text-charcoal-600 uppercase tracking-widest leading-none opacity-60">
                            Menu Principal
                        </div>
                    )}
                    <ul className="space-y-1">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = currentPage === item.id;
                            return (
                                <li key={item.id}>
                                    <button
                                        onClick={() => onNavigate(item.id)}
                                        className={`
                                            w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} 
                                            px-4 py-3 rounded-lg transition-all duration-200 group relative
                                            ${isActive
                                                ? 'bg-charcoal-900 text-white border border-charcoal-800'
                                                : 'text-charcoal-400 hover:text-white hover:bg-charcoal-900/50'}
                                        `}
                                        title={collapsed ? item.label : undefined}
                                    >
                                        <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-ruby-500' : 'group-hover:text-white'}`} />

                                        {!collapsed && (
                                            <span className={`font-semibold text-sm tracking-tight ${isActive ? 'text-white' : ''}`}>
                                                {item.label}
                                            </span>
                                        )}

                                        {isActive && !collapsed && (
                                            <div className="absolute right-2 w-1.5 h-1.5 bg-ruby-500 rounded-full" />
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    {/* Admin Section */}
                    {adminItems.length > 0 && (
                        <div className="mt-8">
                            {!collapsed && (
                                <div className="mb-4 px-4 text-[10px] font-bold text-rub-600 uppercase tracking-widest leading-none opacity-60">
                                    Administração
                                </div>
                            )}
                            <ul className="space-y-1">
                                {adminItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = currentPage === item.id;
                                    return (
                                        <li key={item.id}>
                                            <button
                                                onClick={() => onNavigate(item.id)}
                                                className={`
                                                    w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} 
                                                    px-4 py-3 rounded-lg transition-all duration-200 group relative
                                                    ${isActive
                                                        ? 'bg-charcoal-900 text-white border border-charcoal-800'
                                                        : 'text-charcoal-400 hover:text-white hover:bg-charcoal-900/50'}
                                                `}
                                                title={collapsed ? item.label : undefined}
                                            >
                                                <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-ruby-500' : 'group-hover:text-white'}`} />

                                                {!collapsed && (
                                                    <span className={`font-semibold text-sm tracking-tight ${isActive ? 'text-white' : ''}`}>
                                                        {item.label}
                                                    </span>
                                                )}

                                                {isActive && !collapsed && (
                                                    <div className="absolute right-2 w-1.5 h-1.5 bg-ruby-500 rounded-full" />
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </nav>

                {/* Footer / Profile Card */}
                <div className="p-4 border-t border-white/[0.03]">
                    {!collapsed && user && (
                        <div className="mb-6 p-4 bg-white/[0.02] rounded-3xl border border-white/[0.03] group hover:bg-white/[0.04] transition-all duration-500 cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-10 h-10 bg-gradient-to-tr from-charcoal-800 to-charcoal-700 rounded-xl flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-all">
                                        <User className="w-5 h-5 text-charcoal-300" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[3px] border-charcoal-950 shadow-lg" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-white text-[13px] font-black tracking-tight truncate uppercase leading-none">
                                        {user.email.split('@')[0]}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <div className="w-1.5 h-1.5 bg-ruby-500 rounded-full animate-pulse" />
                                        <p className="text-charcoal-500 text-[9px] font-black truncate tracking-widest uppercase">
                                            Admin Pro
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={toggleCollapse}
                            className={`
                                w-full h-11 flex items-center justify-center 
                                text-charcoal-500 hover:text-white 
                                hover:bg-white/5 transition-all duration-300 
                                rounded-xl border border-transparent hover:border-white/[0.03]
                            `}
                        >
                            {collapsed ? <ChevronRight className="w-4 h-4" /> : (
                                <div className="flex items-center gap-2">
                                    <ChevronLeft className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Recolher Painel</span>
                                </div>
                            )}
                        </button>

                        <div className="text-center opacity-30 mt-1">
                            <span className="text-[9px] font-black text-white/50 tracking-[0.3em] whitespace-nowrap">
                                VERSION 2.0 • PREMIUM
                            </span>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
