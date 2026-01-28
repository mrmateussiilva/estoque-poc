import { LayoutDashboard, Package, FileText, BarChart3, ChevronLeft, ChevronRight, ArrowDownToLine, User } from 'lucide-react';
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
          bg-[#0D0F14] 
          h-screen fixed left-0 top-0 flex flex-col 
          border-r border-white/5 
          transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] z-50
        `}
            >
                {/* Branding */}
                <div className="px-6 h-24 flex items-center">
                    <div className={`flex items-center w-full ${collapsed ? 'justify-center' : 'gap-3'}`}>
                        <div className="w-9 h-9 bg-ruby-700 rounded-xl shadow-lg flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-white" />
                        </div>
                        {!collapsed && (
                            <div className="overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
                                <h1 className="text-white font-black text-lg tracking-tighter leading-none italic uppercase">S.G.E.</h1>
                                <p className="text-white/20 text-[9px] font-bold uppercase tracking-widest mt-0.5">Smart Stock</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar">
                    {!collapsed && (
                        <div className="mb-4 px-4 text-[9px] font-black text-white/20 uppercase tracking-[0.2em] leading-none">
                            Main
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
                    px-4 py-3 rounded-xl transition-all duration-200 group relative
                    ${isActive
                                                ? 'bg-ruby-700/10 text-white'
                                                : 'text-white/40 hover:text-white hover:bg-white/[0.03]'}
                  `}
                                        title={collapsed ? item.label : undefined}
                                    >
                                        {isActive && (
                                            <div className="absolute left-0 w-1 h-5 bg-ruby-600 rounded-r-full shadow-[0_0_10px_#9b111e]" />
                                        )}

                                        <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isActive ? 'text-ruby-500' : 'group-hover:scale-105 group-hover:text-white'}`} />

                                        {!collapsed && (
                                            <span className={`font-bold text-sm tracking-tight transition-colors duration-200 ${isActive ? 'text-white' : ''}`}>
                                                {item.label}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Footer / Profile Card */}
                <div className="p-3 border-t border-white/5">
                    {!collapsed && user && (
                        <div className="mb-4 p-3 bg-white/[0.02] rounded-2xl border border-white/5 group hover:bg-white/[0.04] transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-all">
                                        <User className="w-4 h-4 text-white/40" />
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0D0F14] animate-pulse" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-white text-[12px] font-bold tracking-tight truncate uppercase leading-none">
                                        {user.email.split('@')[0]}
                                    </p>
                                    <p className="text-white/20 text-[9px] font-black truncate mt-1 tracking-wider uppercase">
                                        Admin
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={toggleCollapse}
                            className={`
              w-full h-10 flex items-center justify-center 
              text-white/20 hover:text-white 
              hover:bg-white/5 transition-all duration-200 
              rounded-xl
            `}
                        >
                            {collapsed ? <ChevronRight className="w-4 h-4" /> : (
                                <div className="flex items-center gap-2">
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Recolher</span>
                                </div>
                            )}
                        </button>

                        <div className="text-center opacity-20">
                            <span className="text-[8px] font-black text-white tracking-[0.2em] whitespace-nowrap">
                                V1.5.0 • PRO
                            </span>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
