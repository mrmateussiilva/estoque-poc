export const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white rounded-ruby border border-charcoal-50 shadow-ruby overflow-hidden ${className}`}>
        {children}
    </div>
);

export const KPICard = ({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) => (
    <Card className="p-6">
        <p className="text-charcoal-400 text-xs font-bold uppercase tracking-widest mb-2">{title}</p>
        <p className="text-3xl font-black text-charcoal-900 mb-1">{value}</p>
        {subtitle && <p className="text-charcoal-400 text-sm">{subtitle}</p>}
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
    const base = "px-6 py-2.5 rounded-ruby font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-40 disabled:grayscale text-sm tracking-tight active:scale-[0.98]";
    const variants = {
        primary: "bg-ruby-700 text-white hover:bg-ruby-900 shadow-sm",
        outline: "bg-transparent border border-charcoal-50 text-charcoal-700 hover:bg-charcoal-50"
    };

    return (
        <button type={type} onClick={onClick} disabled={disabled || loading} className={`${base} ${variants[variant]} ${className}`}>
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : children}
        </button>
    );
};
