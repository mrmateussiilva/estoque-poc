import { createContext, useContext, useState, type ReactNode } from 'react';

export interface StockItem {
    code: string;
    name: string;
    quantity: number;
    unit: string;
    min_stock: number;
    sale_price: number;
    category_name: string;
    description?: string;
    category_id?: number;
    barcode?: string;
    cost_price?: number;
    max_stock?: number;
    location?: string;
}

export interface Category {
    id: number;
    name: string;
}

export interface EntryItem {
    id: string;
    sku: string;
    description: string;
    quantity: number;
    type: 'ENTRADA' | 'SAIDA';
    origin: 'Manual' | 'XML';
    unit_cost?: number;
    batch_number?: string;
    expiration_date?: string;
}

export interface Movement {
    id: number;
    product_code: string;
    product?: StockItem;
    type: 'ENTRADA' | 'SAIDA';
    quantity: number;
    origin?: string;
    reference?: string;
    user_id?: number;
    notes?: string;
    created_at: string;
}

export interface ReportSummary {
    total_entries_quantity: number;
    total_entries_value: number;
    total_exits_quantity: number;
    total_exits_value: number;
    net_quantity: number;
    net_value: number;
    total_movements: number;
    unique_products: number;
}

export interface ReportTimelineItem {
    date: string;
    entries_quantity: number;
    exits_quantity: number;
    entries_value: number;
    exits_value: number;
}

export interface FullReportResponse {
    summary: ReportSummary;
    timeline: ReportTimelineItem[];
    detailed_movements: Movement[];
}

interface DataContextType {
    stock: StockItem[];
    setStock: (items: StockItem[]) => void;
    categories: Category[];
    setCategories: (items: Category[]) => void;
    entryItems: EntryItem[];
    setEntryItems: (items: EntryItem[]) => void;
    clearEntryItems: () => void;
    lastStockSync: number | null;
    setLastStockSync: (timestamp: number) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
    const [stock, setStock] = useState<StockItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [entryItems, setEntryItems] = useState<EntryItem[]>([]);
    const [lastStockSync, setLastStockSync] = useState<number | null>(null);

    const clearEntryItems = () => setEntryItems([]);

    return (
        <DataContext.Provider value={{
            stock, setStock,
            categories, setCategories,
            entryItems, setEntryItems,
            clearEntryItems,
            lastStockSync, setLastStockSync
        }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within DataProvider');
    }
    return context;
}
