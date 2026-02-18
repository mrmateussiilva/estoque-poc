import { useState, useEffect, useRef } from 'react';
import { Search, Package, Hash, ChevronRight } from 'lucide-react';
import { Input } from './UI';
import { useAuth } from '../contexts/AuthContext';
import { type Product } from '../hooks/useQueries';

interface ProductSearchProps {
    onSelect: (product: Product) => void;
    placeholder?: string;
}

export default function ProductSearch({ onSelect, placeholder = "BUSCAR PRODUTO..." }: ProductSearchProps) {
    const { apiFetch } = useAuth();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Product[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const searchProducts = async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }

            setIsLoading(true);
            try {
                const response = await apiFetch(`/api/products?search=${encodeURIComponent(query)}&limit=5`);
                if (response.ok) {
                    const data = await response.json();
                    setResults(data.items || []);
                }
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(searchProducts, 300);
        return () => clearTimeout(timer);
    }, [query, apiFetch]);

    const handleSelect = (product: Product) => {
        onSelect(product);
        setQuery('');
        setResults([]);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="relative">
                <Input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="h-12 border-ruby-200 focus:ring-4 focus:ring-ruby-600/5 focus:border-ruby-600/50 bg-white font-black text-base placeholder:text-ruby-200 pl-12"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ruby-400" />
                {isLoading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-ruby-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>

            {isOpen && (results.length > 0 || (query.length >= 2 && !isLoading)) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border-2 border-ruby-100 shadow-ruby-lg z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {results.length > 0 ? (
                        <div className="p-2">
                            {results.map((product) => (
                                <button
                                    key={product.code}
                                    onClick={() => handleSelect(product)}
                                    className="w-full flex items-center justify-between p-3 hover:bg-ruby-50 rounded-xl transition-all group border border-transparent hover:border-ruby-100"
                                >
                                    <div className="flex items-center gap-4 text-left">
                                        <div className="w-10 h-10 bg-navy-50 rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
                                            <Package className="w-5 h-5 text-navy-900 opacity-40 group-hover:opacity-100" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-navy-900 uppercase tracking-tight leading-none mb-1">{product.name}</p>
                                            <div className="flex items-center gap-2">
                                                <Hash className="w-3 h-3 text-ruby-500" />
                                                <span className="text-[10px] font-bold text-navy-400 tracking-wider uppercase">{product.code}</span>
                                                <span className="text-[8px] bg-navy-900/5 text-navy-900 px-1.5 py-0.5 rounded font-black uppercase ml-1 italic">{product.unit}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-ruby-200 group-hover:text-ruby-600 group-hover:translate-x-1 transition-all" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center">
                            <p className="text-[10px] font-black text-navy-900/40 uppercase tracking-widest">Nenhum produto encontrado</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
