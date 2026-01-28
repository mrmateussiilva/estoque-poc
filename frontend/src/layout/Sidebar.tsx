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
        ${collapsed ? 'w-20' : 'w-72'} 
        bg-[#111318] 
        h-screen fixed left-0 top-0 flex flex-col 
        border-r border-white/5 
        transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] z-50
      `}
        >
            {/* Branding */}
            <div className="px-7 h-32 flex items-center mb-4">
                <div className={`flex items-center w-full ${collapsed ? 'justify-center' : 'gap-4'}`}>
                    <div className="relative group">
                        <div className="absolute -inset-1.5 bg-ruby-600/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                        <div className="relative w-11 h-11 bg-gradient-to-br from-ruby-600 to-ruby-700 rounded-2xl shadow-xl flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden animate-in fade-in slide-in-from-left-4 duration-500 delay-150">
                            <h1 className="text-white font-black text-2xl tracking-tighter leading-none italic uppercase">S.G.E.</h1>
                            <p className="text-ruby-500/80 text-[10px] font-black uppercase tracking-[0.2em] mt-1.5 ml-0.5">Smart Stock</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 overflow-y-auto custom-scrollbar">
                <div className="mb-4 px-3 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                    {!collapsed && "Menu Principal"}
                </div>
                <ul className="space-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentPage === item.id;
                        return (
                            <li key={item.id}>
                                <button
                                    onClick={() => onNavigate(item.id)}
                                    className={`
                    w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3.5'} 
                    px-4 py-3.5 rounded-2xl transition-all duration-300 group relative
                    ${isActive
                                            ? 'bg-white/[0.03] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'
                                            : 'text-white/40 hover:text-white hover:bg-white/[0.02]'}
                  `}
                                    title={collapsed ? item.label : undefined}
                                >
                                    {/* Premium Active Indicator */}
                                    {isActive && (
                                        <div className="absolute left-0 w-1.5 h-7 bg-ruby-600 rounded-r-full shadow-[0_0_15px_#9b111e] animate-in slide-in-from-left-1 duration-300" />
                                    )}

                                    <Icon className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${isActive ? 'text-ruby-500 scale-110' : 'group-hover:scale-110 group-hover:text-white'}`} />

                                    {!collapsed && (
                                        <span className={`font-bold text-sm tracking-tight transition-all duration-300 ${isActive ? 'translate-x-0.5' : 'group-hover:translate-x-1'}`}>
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
            <div className="p-4 mt-auto">
                {!collapsed && user && (
                    <div className="mb-6 mx-1 p-4 bg-[#1a1c23] rounded-[24px] border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-ruby-600/5 blur-3xl rounded-full"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="relative">
                                <div className="w-10 h-10 bg-[#252833] rounded-2xl flex items-center justify-center border border-white/5 transition-transform group-hover:scale-105 duration-300">
                                    <User className="w-5 h-5 text-white/50" />
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[3px] border-[#1a1c23] shadow-lg animate-pulse" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-white text-[13px] font-black tracking-tight truncate uppercase leading-none">
                                    {user.email.split('@')[0]}
                                </p>
                                <p className="text-white/30 text-[10px] font-bold truncate mt-1.5 tracking-wide">
                                    ADMINISTRADOR
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-4">
                    <button
                        onClick={toggleCollapse}
                        className={`
              w-full h-12 flex items-center justify-center 
              text-white/30 hover:text-white 
              bg-white/5 hover:bg-ruby-600 transition-all duration-300 
              rounded-2xl border border-white/5
            `}
                    >
                        {collapsed ? <ChevronRight className="w-5 h-5" /> : (
                            <div className="flex items-center gap-2">
                                <ChevronLeft className="w-4 h-4" />
                                <span className="text-[11px] font-black uppercase tracking-widest">Recolher</span>
                            </div>
                        )}
                    </button>

                    <div className="flex items-center justify-center py-2 opacity-30 hover:opacity-100 transition-opacity duration-300">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                            <span className="text-[9px] font-black text-white tracking-[0.2em] whitespace-nowrap">
                                V1.5.0 <span className="text-ruby-500">•</span> PRO
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
