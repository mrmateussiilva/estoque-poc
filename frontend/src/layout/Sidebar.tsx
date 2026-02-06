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
          ${collapsed ? 'w-20' : 'w-64'} 
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          bg-navy-950
          h-screen fixed left-0 top-0 flex flex-col 
          border-r border-charcoal-800/50
          transition-all duration-300 z-50 shadow-2xl
        `}
            >
                {/* Branding */}
                <div className="px-6 h-24 flex items-center border-b border-charcoal-800/30">
                    <div className={`flex items-center w-full ${collapsed ? 'justify-center' : 'gap-4'}`}>
                        <div className="flex-shrink-0 relative">
                            <div className="absolute inset-0 bg-ruby-500/20 blur-xl rounded-full" />
                            <div className="relative w-11 h-11 bg-ruby-600 rounded-xl flex items-center justify-center shadow-ruby-sm border border-ruby-500/20">
                                <Gem className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        {!collapsed && (
                            <div className="overflow-hidden">
                                <h1 className="text-white font-black text-xl tracking-tighter leading-none uppercase">
                                    S.G.E.
                                </h1>
                                <p className="text-charcoal-500 text-[9px] font-black uppercase tracking-[0.2em] mt-1.5 opacity-60">Smart Stock</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-8 overflow-y-auto hidden-scrollbar">
                    {!collapsed && (
                        <div className="mb-6 px-4 text-[10px] font-black text-charcoal-500 uppercase tracking-[0.2em] leading-none opacity-40">
                            Menu Principal
                        </div>
                    )}
                    <ul className="space-y-2">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = currentPage === item.id;
                            return (
                                <li key={item.id}>
                                    <button
                                        onClick={() => {
                                            onNavigate(item.id);
                                            if (window.innerWidth < 768 && onMobileClose) onMobileClose();
                                        }}
                                        className={`
                                            w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} 
                                            px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden
                                            ${isActive
                                                ? 'bg-ruby-500/10 text-white border border-ruby-500/20 shadow-ruby-sm'
                                                : 'text-charcoal-400 hover:text-white hover:bg-white/5'}
                                        `}
                                        title={collapsed ? item.label : undefined}
                                    >
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-ruby-500 rounded-r-full shadow-[0_0_12px_rgba(225,29,72,0.8)]" />
                                        )}

                                        <Icon className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${isActive ? 'text-ruby-500 scale-110 drop-shadow-[0_0_8px_rgba(225,29,72,0.4)]' : 'group-hover:text-white group-hover:scale-110'}`} />

                                        {!collapsed && (
                                            <span className={`font-bold text-[13px] tracking-tight ${isActive ? 'text-white' : ''}`}>
                                                {item.label}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    {/* Admin Section */}
                    {adminItems.length > 0 && (
                        <div className="mt-10">
                            {!collapsed && (
                                <div className="mb-6 px-4 text-[10px] font-black text-charcoal-500 uppercase tracking-[0.2em] leading-none opacity-40">
                                    Administração
                                </div>
                            )}
                            <ul className="space-y-2">
                                {adminItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = currentPage === item.id;
                                    return (
                                        <li key={item.id}>
                                            <button
                                                onClick={() => {
                                                    onNavigate(item.id);
                                                    if (window.innerWidth < 768 && onMobileClose) onMobileClose();
                                                }}
                                                className={`
                                                    w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} 
                                                    px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden
                                                    ${isActive
                                                        ? 'bg-ruby-500/10 text-white border border-ruby-500/20 shadow-ruby-sm'
                                                        : 'text-charcoal-400 hover:text-white hover:bg-white/5'}
                                                `}
                                                title={collapsed ? item.label : undefined}
                                            >
                                                {isActive && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-ruby-500 rounded-r-full shadow-[0_0_12px_rgba(225,29,72,0.8)]" />
                                                )}

                                                <Icon className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${isActive ? 'text-ruby-500 scale-110 drop-shadow-[0_0_8px_rgba(225,29,72,0.4)]' : 'group-hover:text-white group-hover:scale-110'}`} />

                                                {!collapsed && (
                                                    <span className={`font-bold text-[13px] tracking-tight ${isActive ? 'text-white' : ''}`}>
                                                        {item.label}
                                                    </span>
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
                <div className="p-4 border-t border-charcoal-800/30">
                    {!collapsed && user && (
                        <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all duration-500 cursor-pointer overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-ruby-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="relative">
                                    <div className="w-10 h-10 bg-gradient-to-tr from-charcoal-800 to-navy-900 rounded-xl flex items-center justify-center border border-white/10 group-hover:border-ruby-500/30 transition-all">
                                        <User className="w-5 h-5 text-charcoal-300" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[3px] border-navy-950 shadow-lg" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-white text-[13px] font-black tracking-tight truncate uppercase leading-none">
                                        {user.email.split('@')[0]}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <div className="w-1.5 h-1.5 bg-ruby-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(225,29,72,0.8)]" />
                                        <p className="text-charcoal-500 text-[9px] font-black truncate tracking-[0.2em] uppercase">
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
                                rounded-xl border border-transparent hover:border-white/5
                            `}
                        >
                            {collapsed ? <ChevronRight className="w-4 h-4" /> : (
                                <div className="flex items-center gap-2">
                                    <ChevronLeft className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Ocultar</span>
                                </div>
                            )}
                        </button>

                        <div className="text-center opacity-20 mt-1">
                            <span className="text-[8px] font-black text-white tracking-[0.4em] whitespace-nowrap">
                                V 2.0 • PREMIUM RUBY
                            </span>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
