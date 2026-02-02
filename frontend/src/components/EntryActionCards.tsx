import { PlusCircle, FileUp } from 'lucide-react';
import { Card, Button } from './UI';

interface EntryActionCardsProps {
    onManualClick: () => void;
    onImportClick: () => void;
}

export default function EntryActionCards({ onManualClick, onImportClick }: EntryActionCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-8 flex flex-col md:flex-row items-start gap-6 group">
                <div className="w-16 h-16 rounded-2xl bg-ruby-50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-ruby-100 transition-all duration-500 border border-ruby-100">
                    <PlusCircle className="w-8 h-8 text-ruby-600" />
                </div>
                <div className="flex-1 space-y-6">
                    <div>
                        <h3 className="text-lg font-black text-charcoal-950 tracking-tighter leading-none uppercase italic">Entrada Manual</h3>
                        <p className="text-sm font-medium text-charcoal-500 mt-3 leading-relaxed">Registre novos itens individualmente informando SKU, descrição e quantidades precisas.</p>
                    </div>
                    <Button onClick={onManualClick} className="w-full md:w-auto px-8 h-12 bg-charcoal-950">
                        Abrir Formulário Manual
                    </Button>
                </div>
            </Card>

            <Card className="p-8 flex flex-col md:flex-row items-start gap-6 group">
                <div className="w-16 h-16 rounded-2xl bg-charcoal-50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-charcoal-100 transition-all duration-500 border border-charcoal-100">
                    <FileUp className="w-8 h-8 text-charcoal-700" />
                </div>
                <div className="flex-1 space-y-6">
                    <div>
                        <h3 className="text-lg font-black text-charcoal-950 tracking-tighter leading-none uppercase italic">Importação XML</h3>
                        <p className="text-sm font-medium text-charcoal-500 mt-3 leading-relaxed">Carregue arquivos NF-e (SEFAZ) para automatizar múltiplos lançamentos em segundos.</p>
                    </div>
                    <Button onClick={onImportClick} variant="outline" className="w-full md:w-auto px-8 h-12">
                        Selecionar Arquivo
                    </Button>
                </div>
            </Card>
        </div>
    );
}
