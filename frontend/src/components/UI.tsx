import { ChevronDown } from 'lucide-react';

export const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white rounded-xl border border-charcoal-200/60 shadow-sm transition-all duration-300 overflow-hidden ${className}`}>
        {children}
    </div>
);

export const KPICard = ({ title, value, subtitle, icon }: { title: string; value: string | number; subtitle?: string; icon?: React.ReactNode }) => (
    <Card className="p-6">
        <div className="flex items-center justify-between mb-3">
            <p className="text-charcoal-400 text-[11px] font-bold uppercase tracking-wider">{title}</p>
            <div className="p-2 bg-charcoal-50 rounded-lg border border-charcoal-100 text-charcoal-500">
                {icon || <div className="w-5 h-5 bg-charcoal-100 rounded-md animate-pulse" />}
            </div>
        </div>
        <div className="space-y-0.5">
            <p className="text-2xl font-bold text-charcoal-900 tracking-tight">{value}</p>
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
    onClick?: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'outline';
    loading?: boolean;
    type?: 'button' | 'submit' | 'reset';
    className?: string;
}) => {
    const base = "px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm tracking-tight active:scale-[0.98]";
    const variants = {
        primary: "bg-charcoal-900 text-white hover:bg-black border border-charcoal-950",
        outline: "bg-white border border-charcoal-200 text-charcoal-700 hover:bg-charcoal-100 hover:border-charcoal-300"
    };

    return (
        <button type={type} onClick={onClick} disabled={disabled || loading} className={`${base} ${variants[variant]} ${className}`}>
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : children}
        </button>
    );
};

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className={`
      w-full h-12 px-4 bg-charcoal-50 border border-charcoal-200 rounded-lg 
      focus:outline-none focus:ring-4 focus:ring-ruby-600/5 focus:border-ruby-600/50 focus:bg-white 
      text-sm font-semibold tracking-tight transition-all placeholder:text-charcoal-300 
      ${props.className || ''}
    `}
    />
);

export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <div className="relative group w-full">
        <select
            {...props}
            className={`
        w-full h-12 pl-4 pr-10 bg-charcoal-50 border border-charcoal-200 rounded-lg 
        focus:outline-none focus:ring-4 focus:ring-ruby-600/5 focus:border-ruby-600/50 focus:bg-white 
        text-sm font-semibold tracking-tight transition-all appearance-none cursor-pointer uppercase
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
    <label className={`text-[10px] font-bold text-charcoal-400 uppercase tracking-widest ml-1 ${className}`}>
        {children}
    </label>
);

export const TableContainer = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`overflow-x-auto rounded-xl border border-charcoal-200 shadow-sm ${className}`}>
        <table className="w-full text-left border-collapse">
            {children}
        </table>
    </div>
);

export const THead = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <thead className={`bg-charcoal-900 text-white/40 uppercase ${className}`}>
        {children}
    </thead>
);

export const TBody = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <tbody className={`divide-y divide-charcoal-100 bg-white [&_tr:hover]:bg-charcoal-100/50 ${className}`}>
        {children}
    </tbody>
);

export const Th = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <th className={`px-8 py-5 text-[10px] font-bold tracking-widest ${className}`}>
        {children}
    </th>
);

export const Td = ({ children, className = "", colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) => (
    <td colSpan={colSpan} className={`px-8 py-6 text-sm font-medium text-charcoal-700 ${className}`}>
        {children}
    </td>
);

export const Tr = ({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
    <tr
        onClick={onClick}
        className={`transition-all group ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
        {children}
    </tr>
);

export const Badge = ({ children, variant = 'default', className = "" }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'error'; className?: string }) => {
    const variants = {
        default: "bg-charcoal-50 text-charcoal-700 border-charcoal-200",
        success: "bg-emerald-50 text-emerald-700 border-emerald-100",
        warning: "bg-amber-50 text-amber-700 border-amber-100",
        error: "bg-ruby-50 text-ruby-700 border-ruby-100"
    };

    return (
        <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${variants[variant]} ${className}`}>
            <div className={`w-1 h-1 rounded-full ${variant === 'success' ? 'bg-emerald-500' : variant === 'warning' ? 'bg-amber-500' : variant === 'error' ? 'bg-ruby-600' : 'bg-charcoal-400'}`} />
            {children}
        </span>
    );
};
