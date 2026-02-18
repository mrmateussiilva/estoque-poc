import { ChevronDown, X } from 'lucide-react';
import ReactDOM from 'react-dom';
import { useEffect } from 'react';

export const Card = ({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) => (
    <div
        onClick={onClick}
        className={`bg-white rounded-2xl border border-charcoal-200/60 shadow-ruby-sm hover:shadow-ruby transition-all duration-300 overflow-hidden ${className} ${onClick ? 'cursor-pointer' : ''}`}
    >
        {children}
    </div>
);

export const KPICard = ({ title, value, subtitle, icon }: { title: string; value: string | number; subtitle?: string; icon?: React.ReactNode }) => (
    <Card className="p-4 relative group">
        <div className="absolute top-0 left-0 w-1 h-0 group-hover:h-full bg-ruby-500 transition-all duration-300" />
        <div className="flex items-center justify-between mb-3">
            <p className="text-charcoal-400 text-[11px] font-bold uppercase tracking-wider">{title}</p>
            <div className="p-2 bg-ruby-50 rounded-xl border border-ruby-100 text-ruby-600 group-hover:bg-ruby-500 group-hover:text-white transition-all duration-300">
                {icon || <div className="w-5 h-5 bg-charcoal-100 rounded-md animate-pulse" />}
            </div>
        </div>
        <div className="space-y-0.5">
            <p className="text-3xl font-black text-navy-900 tracking-tight">{value}</p>
            {subtitle && <p className="text-charcoal-400 text-xs font-medium">{subtitle}</p>}
        </div>
    </Card>
);

export const Button = ({
    children,
    onClick,
    disabled,
    variant = 'primary',
    loading = false,
    type = 'button',
    className = ""
}: {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    disabled?: boolean;
    variant?: 'primary' | 'outline' | 'secondary';
    loading?: boolean;
    type?: 'button' | 'submit' | 'reset';
    className?: string;
}) => {
    // Touch-friendly: mínimo 44x44px (Apple HIG) / 48x48px (Material Design)
    const base = "min-h-[48px] min-w-[48px] px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 text-sm tracking-tight active:scale-[0.98] shadow-sm overflow-hidden relative group touch-manipulation";
    const variants = {
        primary: "bg-ruby-600 text-white hover:bg-ruby-500 hover:shadow-ruby border border-ruby-700",
        secondary: "bg-navy-950 text-white hover:border-ruby-500/50 border border-charcoal-800",
        outline: "bg-white border border-charcoal-200 text-charcoal-700 hover:border-ruby-200 hover:text-ruby-600 hover:bg-ruby-50/30"
    };

    return (
        <button type={type} onClick={onClick} disabled={disabled || loading} className={`${base} ${variants[variant]} ${className}`}>
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative z-10 flex items-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : children}
            </span>
        </button>
    );
};

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className={`
      w-full min-h-[48px] px-4 bg-charcoal-50 border border-charcoal-300 rounded-xl 
      focus:outline-none focus:ring-4 focus:ring-ruby-500/10 focus:border-ruby-500/50 focus:bg-white 
      text-sm font-semibold tracking-tight transition-all placeholder:text-charcoal-400 
      touch-manipulation
      ${props.className || ''}
    `}
    />
);

export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <div className="relative group w-full">
        <select
            {...props}
            className={`
        w-full min-h-[48px] pl-4 pr-10 bg-charcoal-50 border border-charcoal-300 rounded-xl 
        focus:outline-none focus:ring-4 focus:ring-ruby-500/10 focus:border-ruby-500/50 focus:bg-white 
        text-sm font-semibold tracking-tight transition-all appearance-none cursor-pointer uppercase
        touch-manipulation
        ${props.className || ''}
      `}
        >
            {props.children}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-focus-within:text-ruby-600 transition-colors">
            <ChevronDown className="w-4 h-4" />
        </div>
    </div>
);

export const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <label className={`text-[10px] font-black text-charcoal-700 uppercase tracking-[0.15em] ml-1 ${className}`}>
        {children}
    </label>
);

export const TableContainer = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`w-full overflow-x-auto custom-scrollbar-horizontal pb-4 ${className}`}>
        <table className="w-full text-left border-separate border-spacing-0 min-w-[800px] md:min-w-full">
            {children}
        </table>
    </div>
);

export const THead = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <thead className={`bg-navy-950 text-white/50 uppercase ${className}`}>
        {children}
    </thead>
);

export const TBody = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <tbody className={`divide-y divide-charcoal-100 bg-white [&_tr:hover]:bg-ruby-50/30 ${className}`}>
        {children}
    </tbody>
);

export const Th = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <th className={`px-4 py-3 text-[10px] font-black tracking-[0.15em] ${className}`}>
        {children}
    </th>
);

export const Td = ({ children, className = "", colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) => (
    <td colSpan={colSpan} className={`px-4 py-3 text-sm font-bold text-navy-900 ${className}`}>
        {children}
    </td>
);

export const Tr = ({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) => (
    <tr
        onClick={onClick}
        className={`transition-all group ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
        {children}
    </tr>
);

export const Badge = ({ children, variant = 'default', className = "" }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'; className?: string }) => {
    const variants = {
        default: "bg-charcoal-50 text-charcoal-700 border-charcoal-200",
        success: "bg-emerald-50 text-emerald-700 border-emerald-100",
        warning: "bg-amber-50 text-amber-700 border-amber-100",
        error: "bg-ruby-50 text-ruby-700 border-ruby-200",
        info: "bg-blue-50 text-blue-700 border-blue-100",
        purple: "bg-purple-50 text-purple-700 border-purple-100"
    };

    const dotColors = {
        default: "bg-charcoal-400",
        success: "bg-emerald-500",
        warning: "bg-amber-500",
        error: "bg-ruby-600",
        info: "bg-blue-500",
        purple: "bg-purple-500"
    };

    return (
        <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${variants[variant as keyof typeof variants] || variants.default} ${className}`}>
            <div className={`w-1 h-1 rounded-full ${dotColors[variant as keyof typeof dotColors] || dotColors.default}`} />
            {children}
        </span>
    );
};

export const Modal = ({ children, onClose, title, className = "" }: { children: React.ReactNode, onClose: () => void, title?: string, className?: string }) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    let modalRoot = document.getElementById('modal-root');
    if (!modalRoot) {
        modalRoot = document.createElement('div');
        modalRoot.setAttribute('id', 'modal-root');
        document.body.appendChild(modalRoot);
    }

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal-900/40 animate-in fade-in duration-300 backdrop-blur-sm">
            <div className={`bg-white w-full rounded-xl shadow-2xl border border-charcoal-200 overflow-hidden animate-in zoom-in-95 duration-300 ${className}`}>
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-100 bg-charcoal-50/50">
                        <h3 className="text-sm font-bold text-charcoal-950 tracking-tight uppercase">{title}</h3>
                        <button onClick={onClose} className="p-2 text-charcoal-400 hover:text-ruby-700 hover:bg-ruby-50 rounded-lg transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}
                {children}
            </div>
        </div>,
        modalRoot
    );
};
