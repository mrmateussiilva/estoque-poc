import { useState } from 'react';
import { AlertCircle, Gem, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Label } from '../components/UI';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
        } catch (err: any) {
            setError(err.message || 'Erro ao fazer login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col md:flex-row antialiased overflow-hidden">
            {/* Visual side for desktop */}
            <div className="hidden md:flex md:w-3/5 bg-charcoal-900 items-center justify-center p-20 relative">
                <div className="relative z-10 text-center space-y-8 max-w-md">
                    <div className="w-20 h-20 bg-ruby-600 rounded-xl flex items-center justify-center mx-auto shadow-xl">
                        <Gem className="w-10 h-10 text-white" />
                    </div>

                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                            <span className="w-1.5 h-1.5 bg-ruby-500 rounded-full" />
                            <p className="text-white/60 font-bold uppercase tracking-widest text-[9px]">Portal Corporativo</p>
                        </div>
                        <h1 className="text-5xl font-bold text-white tracking-tight uppercase">
                            Smart<span className="text-ruby-500">Stock</span>
                        </h1>
                        <p className="text-white/30 text-lg font-medium tracking-tight">
                            Sistema de Gestão para controle de ativos e fluxos logísticos.
                        </p>
                    </div>
                </div>
            </div>

            {/* Login form side */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-20 bg-white">
                <div className="w-full max-w-sm space-y-10 animate-in fade-in duration-500">
                    {/* Mobile Branding */}
                    <div className="md:hidden flex items-center gap-3 mb-12">
                        <div className="w-10 h-10 bg-charcoal-900 rounded-lg flex items-center justify-center">
                            <Gem className="w-5 h-5 text-ruby-500" />
                        </div>
                        <h1 className="text-xl font-bold text-charcoal-950 tracking-tight uppercase">S.G.E.</h1>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-charcoal-950 tracking-tight">Painel de Acesso</h2>
                        <p className="text-charcoal-500 text-sm font-medium">Entre com suas credenciais para continuar.</p>
                    </div>

                    {error && (
                        <div className="p-4 bg-ruby-50 border border-ruby-100 rounded-lg flex items-start gap-4 animate-in fade-in duration-300">
                            <AlertCircle className="w-5 h-5 text-ruby-600 flex-shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                                <p className="text-[10px] font-bold text-ruby-900 uppercase tracking-widest">Erro de Acesso</p>
                                <p className="text-sm text-ruby-800 font-semibold">{error}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1.5">
                            <Label>Usuário / Email</Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ex: admin@empresa.com"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label>Senha de Acesso</Label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="tracking-widest"
                            />
                        </div>

                        <Button type="submit" loading={loading} className="w-full h-12 bg-charcoal-900 hover:bg-black uppercase tracking-widest text-xs">
                            Iniciar Sessão
                        </Button>
                    </form>

                    <footer className="pt-8 flex flex-col items-center gap-4 border-t border-charcoal-100">
                        <p className="text-charcoal-300 text-[10px] font-bold uppercase tracking-widest">Powered by</p>
                        <a
                            href="https://finderbit.com.br"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-charcoal-200 hover:border-ruby-600/20 hover:bg-ruby-50/50 transition-all group"
                        >
                            <span className="text-charcoal-500 font-bold text-[10px] group-hover:text-charcoal-950 transition-colors tracking-widest uppercase">Finderbit</span>
                            <ExternalLink className="w-3 h-3 text-charcoal-300 group-hover:text-ruby-600 transition-colors" />
                        </a>
                    </footer>
                </div>
            </div>
        </div>
    );
}
