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
        outline: "bg-white border border-charcoal-200 text-charcoal-700 hover:bg-charcoal-50 hover:border-charcoal-300"
    };

    return (
        <button type={type} onClick={onClick} disabled={disabled || loading} className={`${base} ${variants[variant]} ${className}`}>
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : children}
        </button>
    );
};
