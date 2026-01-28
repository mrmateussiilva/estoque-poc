import { PlusCircle, FileUp } from 'lucide-react';
import { Card, Button } from './UI';

interface EntryActionCardsProps {
    onManualClick: () => void;
    onImportClick: () => void;
}

export default function EntryActionCards({ onManualClick, onImportClick }: EntryActionCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 flex items-start gap-4 hover:border-ruby-700/30 transition-colors group">
                <div className="w-12 h-12 rounded-xl bg-ruby-700/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <PlusCircle className="w-6 h-6 text-ruby-700" />
                </div>
                <div className="flex-1 space-y-4">
                    <div>
                        <h3 className="text-sm font-bold text-charcoal-900 leading-none">Entrada Manual</h3>
                        <p className="text-xs text-charcoal-500 mt-2">Registre novos itens individualmente informando SKU, descrição e quantidade.</p>
                    </div>
                    <Button onClick={onManualClick} className="w-full sm:w-auto h-9 text-xs">
                        Nova Entrada Manual
                    </Button>
                </div>
            </Card>

            <Card className="p-6 flex items-start gap-4 hover:border-charcoal-300 transition-colors group">
                <div className="w-12 h-12 rounded-xl bg-charcoal-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <FileUp className="w-6 h-6 text-charcoal-700" />
                </div>
                <div className="flex-1 space-y-4">
                    <div>
                        <h3 className="text-sm font-bold text-charcoal-900 leading-none">Importar XML</h3>
                        <p className="text-xs text-charcoal-500 mt-2">Carregue arquivos NF-e para adicionar múltiplos itens automaticamente.</p>
                    </div>
                    <Button onClick={onImportClick} variant="outline" className="w-full sm:w-auto h-9 text-xs">
                        Importar XML
                    </Button>
                </div>
            </Card>
        </div>
    );
}
