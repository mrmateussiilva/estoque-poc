import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { type StockItem, type Category, type EntryItem, type FullReportResponse } from '../contexts/DataContext';

// Tipos adicionais necessários
interface DashboardStats {
    total_items: number;
    total_skus: number;
    entries_this_month: number;
    low_stock_count: number;
    stock_wealth: number;
    stock_wealth_sale: number;
    idle_stock_count: number;
    average_cost: number;
    last_movement_at?: string;
}

interface StockEvolution {
    date: string;
    entries: number;
    exits: number;
}

interface User {
    id: number;
    name?: string;
    email: string;
    role: string;
    active: boolean;
}

export interface NFe {
    access_key: string;
    number?: string;
    supplier_name?: string;
    total_items: number;
    total_value: number;
    status: 'PENDENTE' | 'PROCESSADA';
    processed_at: string;
}

export interface NFeDetail {
    access_key: string;
    number: string;
    supplier_name: string;
    total_value: number;
    items: {
        code: string;
        name: string;
        quantity: number;
        unit_price: number;
        total_price: number;
    }[];
}

// Queries
export function useReportsQuery(startDate: string, endDate: string) {
    const { apiFetch } = useAuth();
    return useQuery({
        queryKey: ['reports', startDate, endDate],
        queryFn: async () => {
            if (!startDate || !endDate) return null;
            const query = new URLSearchParams({ start_date: startDate, end_date: endDate });
            const response = await apiFetch(`/api/reports/movements?${query.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch reports');
            return response.json() as Promise<FullReportResponse>;
        },
        enabled: !!startDate && !!endDate
    });
}

export function useStockQuery(search?: string) {
    const { apiFetch } = useAuth();
    return useQuery({
        queryKey: ['stock', search],
        queryFn: async () => {
            const query = new URLSearchParams();
            if (search) query.append('search', search);
            const queryString = query.toString();
            const url = queryString ? `/api/stock?${queryString}` : '/api/stock';

            const response = await apiFetch(url);
            if (!response.ok) throw new Error('Failed to fetch stock');
            const data = await response.json();
            // Backend retorna resposta paginada, extrair o array de data
            return (Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])) as StockItem[];
        }
    });
}

export function useDashboardStatsQuery() {
    const { apiFetch } = useAuth();
    return useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const response = await apiFetch('/api/dashboard/stats');
            if (!response.ok) throw new Error('Failed to fetch stats');
            return response.json() as Promise<DashboardStats>;
        }
    });
}

export function useDashboardEvolutionQuery() {
    const { apiFetch } = useAuth();
    return useQuery({
        queryKey: ['dashboard-evolution'],
        queryFn: async () => {
            const response = await apiFetch('/api/dashboard/evolution');
            if (!response.ok) throw new Error('Failed to fetch evolution');
            return response.json() as Promise<StockEvolution[]>;
        }
    });
}

export function useCategoriesQuery() {
    const { apiFetch } = useAuth();
    return useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const response = await apiFetch('/api/categories');
            if (!response.ok) throw new Error('Failed to fetch categories');
            return response.json() as Promise<Category[]>;
        }
    });
}

export function useUsersQuery() {
    const { apiFetch } = useAuth();
    return useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await apiFetch('/api/users');
            if (!response.ok) throw new Error('Failed to fetch users');
            return response.json() as Promise<User[]>;
        }
    });
}

// Mutations
export function useProductMutation() {
    const { apiFetch } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (product: StockItem) => {
            const response = await apiFetch(`/api/products/${product.code}`, {
                method: 'PUT',
                body: JSON.stringify(product)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Erro ao salvar produto');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
    });
}

export function useMovementMutation() {
    const { apiFetch } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (items: EntryItem[]) => {
            const promises = items.map(async (item) => {
                const response = await apiFetch('/api/movements', {
                    method: 'POST',
                    body: JSON.stringify({
                        product_code: item.sku,
                        type: 'ENTRADA',
                        quantity: item.quantity,
                        origin: 'MANUAL',
                        notes: `Entrada manual: ${item.description}`
                    })
                });

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || `Erro ao processar item ${item.sku}`);
                }
                return response.json();
            });

            return Promise.all(promises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-evolution'] });
        }
    });
}

export function useCategoryMutations() {
    const { apiFetch } = useAuth();
    const queryClient = useQueryClient();

    const saveCategory = useMutation({
        mutationFn: async ({ id, name }: { id?: number | null, name: string }) => {
            const isEdit = !!id;
            const url = isEdit ? `/api/categories/${id}` : '/api/categories';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await apiFetch(url, {
                method,
                body: JSON.stringify({ name })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Erro ao processar categoria');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });

    const deleteCategory = useMutation({
        mutationFn: async (id: number) => {
            const response = await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Erro ao excluir categoria');
            }
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });

    return { saveCategory, deleteCategory };
}

export function useUserMutations() {
    const { apiFetch } = useAuth();
    const queryClient = useQueryClient();

    const saveUser = useMutation({
        mutationFn: async ({ id, data }: { id?: number | null, data: any }) => {
            const isEdit = !!id;
            const url = isEdit ? `/api/users/${id}` : '/api/users';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await apiFetch(url, {
                method,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const resData = await response.json();
                throw new Error(resData.error || 'Erro ao processar usuário');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        }
    });

    const toggleUserStatus = useMutation({
        mutationFn: async (user: User) => {
            const response = await apiFetch(`/api/users/${user.id}`, {
                method: 'PUT',
                body: JSON.stringify({ active: !user.active })
            });
            if (!response.ok) throw new Error('Erro ao alterar status');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        }
    });

    return { saveUser, toggleUserStatus };
}

export function useEmailConfigQuery() {
    const { apiFetch } = useAuth();
    return useQuery({
        queryKey: ['email-config'],
        queryFn: async () => {
            const response = await apiFetch('/api/config/email');
            if (!response.ok) throw new Error('Failed to fetch email config');
            return response.json();
        }
    });
}

export function useEmailConfigMutations() {
    const { apiFetch } = useAuth();
    const queryClient = useQueryClient();

    const saveEmailConfig = useMutation({
        mutationFn: async (data: any) => {
            const response = await apiFetch('/api/config/email', {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Erro ao salvar configuração');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['email-config'] });
        }
    });

    const testConnection = useMutation({
        mutationFn: async (data: any) => {
            const response = await apiFetch('/api/config/email/test', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Erro ao testar conexão');
            return result;
        }
    });

    return { saveEmailConfig, testConnection };
}

export function useAuditLogsQuery(page = 1, limit = 50) {
    const { apiFetch } = useAuth();
    return useQuery({
        queryKey: ['audit-logs', page, limit],
        queryFn: async () => {
            const query = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
            const response = await apiFetch(`/api/audit/logs?${query.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch audit logs');
            return response.json();
        }
    });
}