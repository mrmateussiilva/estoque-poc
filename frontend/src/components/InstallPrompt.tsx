import { useState, useEffect } from 'react';
import { Download, X, Gem } from 'lucide-react';
import { Card, Button } from './UI';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Verificar se já está instalado
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsStandalone(true);
            return;
        }

        // Detectar iOS
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(iOS);

        // Capturar evento beforeinstallprompt (Android/Chrome)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            const prompt = e as BeforeInstallPromptEvent;
            setDeferredPrompt(prompt);
            // Mostrar prompt após um delay
            setTimeout(() => {
                setShowPrompt(true);
            }, 3000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Para iOS, mostrar prompt após delay
        if (iOS) {
            const timer = setTimeout(() => {
                setShowPrompt(true);
            }, 3000);
            return () => {
                window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
                clearTimeout(timer);
            };
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            // Android/Chrome
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('PWA instalado com sucesso');
            }
            
            setDeferredPrompt(null);
            setShowPrompt(false);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Salvar no localStorage para não mostrar novamente nesta sessão
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    };

    // Não mostrar se já está instalado ou se foi dispensado recentemente
    if (isStandalone || !showPrompt) return null;

    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
        const dismissedTime = parseInt(dismissed);
        const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60);
        // Não mostrar novamente por 24 horas
        if (hoursSinceDismissed < 24) return null;
    }

    return (
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in slide-in-from-bottom-5 duration-300 safe-area-inset-bottom">
            <Card className="p-4 bg-gradient-to-br from-navy-950 to-charcoal-900 border-ruby-500/20 shadow-2xl">
                <div className="flex items-start gap-3">
                    {/* Ícone Ruby */}
                    <div className="flex-shrink-0 relative">
                        <div className="absolute inset-0 bg-ruby-500/20 blur-xl rounded-full" />
                        <div className="relative w-12 h-12 bg-gradient-to-br from-ruby-600 to-ruby-700 rounded-xl flex items-center justify-center shadow-lg border border-ruby-500/30">
                            <Gem className="w-6 h-6 text-white" />
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-black text-sm mb-1 uppercase tracking-tight">
                            Instalar S.G.E.
                        </h3>
                        <p className="text-charcoal-300 text-xs font-medium mb-3 leading-relaxed">
                            {isIOS
                                ? 'Toque em Compartilhar e depois em "Adicionar à Tela de Início"'
                                : 'Instale o app para acesso rápido e uso offline'}
                        </p>

                        <div className="flex gap-2">
                            {!isIOS && deferredPrompt && (
                                <Button
                                    onClick={handleInstall}
                                    variant="primary"
                                    className="flex-1 min-h-[40px] text-xs"
                                >
                                    <Download className="w-4 h-4" />
                                    Instalar Agora
                                </Button>
                            )}
                            <button
                                onClick={handleDismiss}
                                className="px-4 py-2 text-charcoal-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {isIOS && (
                            <div className="mt-3 p-2 bg-white/5 rounded-lg border border-white/10">
                                <p className="text-charcoal-400 text-[10px] font-bold uppercase tracking-wider text-center">
                                    📱 Safari → Compartilhar → Adicionar à Tela de Início
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}
