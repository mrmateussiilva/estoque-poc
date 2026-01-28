import { Card } from './UI';

interface EntryFooterProps {
    totalItems: number;
    totalSKUs: number;
}

export default function EntryFooter({ totalItems, totalSKUs }: EntryFooterProps) {
    return (
        <Card className="bg-charcoal-900 border-none p-4 px-8 mt-6">
            <div className="flex items-center justify-between">
                <div className="flex gap-12">
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-bold text-charcoal-500 uppercase tracking-widest">Total de Itens</p>
                        <p className="text-xl font-black text-white">{totalItems}</p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-bold text-charcoal-500 uppercase tracking-widest">Total de SKUs</p>
                        <p className="text-xl font-black text-white">{totalSKUs}</p>
                    </div>
                </div>
            </div>
        </Card>
    );
}
