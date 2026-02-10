import { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';
import { Button, Card } from './UI';

interface BarcodeScannerProps {
    onScan: (code: string) => void;
    onClose: () => void;
    title?: string;
}

export default function BarcodeScanner({ onScan, onClose, title = 'Escanear Código' }: BarcodeScannerProps) {
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const readerId = useRef<string>('reader');

    useEffect(() => {
        return () => {
            // Cleanup ao desmontar
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
            }
        };
    }, []);

    const startScan = async () => {
        try {
            setError(null);
            setScanning(true);

            const scanner = new Html5Qrcode(readerId.current);
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' }, // Câmera traseira
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                },
                (decodedText) => {
                    // Código escaneado com sucesso
                    scanner.stop().catch(() => {});
                    setScanning(false);
                    onScan(decodedText);
                    onClose();
                },
                () => {
                    // Ignorar erros de leitura (normal durante scan)
                }
            );
        } catch (err: any) {
            setError(err.message || 'Erro ao iniciar scanner');
            setScanning(false);
            scannerRef.current = null;
        }
    };

    const stopScan = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
            } catch (err) {
                // Ignorar erros ao parar
            }
            scannerRef.current = null;
        }
        setScanning(false);
    };

    const handleClose = async () => {
        await stopScan();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 safe-area-inset-top safe-area-inset-bottom">
            <Card className="w-full max-w-md bg-white p-6 relative">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-black text-navy-900 uppercase tracking-tight">{title}</h2>
                    <button
                        onClick={handleClose}
                        className="p-2 text-charcoal-400 hover:text-ruby-600 hover:bg-ruby-50 rounded-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label="Fechar scanner"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-ruby-50 border border-ruby-200 rounded-xl">
                        <p className="text-sm font-bold text-ruby-700">{error}</p>
                    </div>
                )}

                <div className="mb-4">
                    <div
                        id={readerId.current}
                        className="w-full rounded-xl overflow-hidden bg-charcoal-900"
                        style={{ minHeight: '300px' }}
                    />
                </div>

                <div className="flex gap-3">
                    {!scanning ? (
                        <Button
                            onClick={startScan}
                            variant="primary"
                            className="flex-1 min-h-[48px]"
                        >
                            <Camera className="w-5 h-5" />
                            Iniciar Scanner
                        </Button>
                    ) : (
                        <Button
                            onClick={stopScan}
                            variant="outline"
                            className="flex-1 min-h-[48px]"
                        >
                            Parar Scanner
                        </Button>
                    )}
                    <Button
                        onClick={handleClose}
                        variant="outline"
                        className="min-h-[48px]"
                    >
                        Cancelar
                    </Button>
                </div>

                <p className="text-xs text-charcoal-500 text-center mt-4">
                    Posicione o código de barras ou QR Code dentro da área de leitura
                </p>
            </Card>
        </div>
    );
}
