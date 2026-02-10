import { Package, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, Badge, Button } from './UI';
import { type StockItem } from '../contexts/DataContext';

interface StockCardProps {
    item: StockItem;
    onEdit?: (item: StockItem) => void;
}

export default function StockCard({ item, onEdit }: StockCardProps) {
    const getStockStatus = () => {
        if (item.quantity <= 0) {
            return { label: 'Esgotado', color: 'bg-red-500', icon: AlertTriangle };
        }
        if (item.quantity < item.min_stock) {
            return { label: 'Baixo Estoque', color: 'bg-yellow-500', icon: AlertTriangle };
        }
        return { label: 'Em Estoque', color: 'bg-emerald-500', icon: CheckCircle2 };
    };

    const status = getStockStatus();
    const StatusIcon = status.icon;

    return (
        <Card className="p-4 md:p-6 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-ruby-50 rounded-lg">
                            <Package className="w-4 h-4 text-ruby-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-black text-lg text-navy-900 truncate">{item.name}</h3>
                            <p className="text-xs text-charcoal-500 font-bold uppercase tracking-wider mt-0.5">
                                {item.code}
                            </p>
                        </div>
                    </div>
                </div>
                <Badge className={`${status.color} text-white text-[10px] font-black px-2 py-1`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                </Badge>
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">Quantidade</span>
                    <span className="text-xl font-black text-navy-900">{item.quantity.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">Unidade</span>
                    <span className="text-sm font-bold text-charcoal-700">{item.unit || 'UN'}</span>
                </div>
                {item.min_stock > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">Mínimo</span>
                        <span className="text-sm font-bold text-charcoal-700">{item.min_stock.toFixed(2)}</span>
                    </div>
                )}
                {item.category_name && (
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">Categoria</span>
                        <span className="text-sm font-bold text-charcoal-700">{item.category_name}</span>
                    </div>
                )}
                {item.sale_price > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-charcoal-100">
                        <span className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">Preço Venda</span>
                        <span className="text-base font-black text-ruby-600">
                            R$ {item.sale_price.toFixed(2)}
                        </span>
                    </div>
                )}
            </div>

            {onEdit && (
                <Button
                    variant="outline"
                    onClick={() => onEdit(item)}
                    className="w-full text-xs py-2.5"
                >
                    Editar Produto
                </Button>
            )}
        </Card>
    );
}
