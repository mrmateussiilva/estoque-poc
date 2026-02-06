import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface User {
    email: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    apiFetch: (endpoint: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');
        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const login = async (email: string, password: string) => {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
        const response = await fetch(`${apiUrl}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            throw new Error('Credenciais inválidas');
        }

        const data = await response.json();
        setToken(data.token);
        setUser({ email });
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify({ email }));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
    };

    const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
        const headers: HeadersInit = {
            ...options.headers,
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        };

        const response = await fetch(`${apiUrl}${endpoint}`, { ...options, headers });

        if (response.status === 401) {
            logout();
            throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }

        return response;
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, apiFetch }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
