import { LayoutDashboard, Package, FileText, BarChart3, ArrowDownToLine, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface MobileBottomNavProps {
    currentPage: string;
    onNavigate: (page: string) => void;
}

export default function MobileBottomNav({ currentPage, onNavigate }: MobileBottomNavProps) {
    const { user } = useAuth();

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'entries', label: 'Entradas', icon: ArrowDownToLine },
        { id: 'stock', label: 'Estoque', icon: Package },
        { id: 'nfe', label: 'NF-e', icon: FileText },
        { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    ];

    const adminItems = [
        { id: 'admin', label: 'Admin', icon: ShieldCheck },
    ];

    // Verificar se usuário é admin (pode ser role, isAdmin ou fallback por email)
    const isAdmin =
        (user as any)?.role === 'ADMIN' ||
        (user as any)?.isAdmin === true ||
        user?.email === 'mateus@finderbit.com.br'; // Fallback para o admin principal

    const allItems = isAdmin ? [...menuItems, ...adminItems] : menuItems;

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-charcoal-200 z-50 safe-area-inset-bottom shadow-lg">
            <div className="flex justify-around items-center h-16 px-2">
                {allItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={`
                                flex flex-col items-center justify-center gap-1 
                                min-w-[60px] h-full px-2
                                transition-all duration-200
                                ${isActive
                                    ? 'text-ruby-600'
                                    : 'text-charcoal-400 active:text-ruby-600'
                                }
                            `}
                            aria-label={item.label}
                        >
                            <div className={`
                                relative p-2 rounded-xl transition-all duration-200
                                ${isActive
                                    ? 'bg-ruby-50'
                                    : 'hover:bg-charcoal-50'
                                }
                            `}>
                                <Icon className={`w-5 h-5 transition-all duration-200 ${isActive ? 'scale-110' : ''}`} />
                                {isActive && (
                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-ruby-600 rounded-full" />
                                )}
                            </div>
                            <span className={`
                                text-[10px] font-bold uppercase tracking-tight
                                transition-all duration-200
                                ${isActive ? 'text-ruby-600' : 'text-charcoal-500'}
                            `}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
