class NotificationService {
    private eventSource: EventSource | null = null;

    constructor() {
    }

    getPermissionStatus() {
        if (!('Notification' in window)) return 'denied';
        return Notification.permission;
    }

    async requestPermission() {
        if (!('Notification' in window)) {
            console.log('Este navegador não suporta notificações desktop');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    connect() {
        if (this.eventSource) return;

        const token = localStorage.getItem('auth_token');
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8003';
        const url = `${baseUrl}/api/notifications/stream${token ? `?token=${token}` : ''}`;

        this.eventSource = new EventSource(url);

        this.eventSource.onopen = () => {
            console.log('SSE connected for notifications');
        };

        this.eventSource.addEventListener('NEW_NFE', (e: any) => {
            const data = JSON.parse(e.data);
            this.showNotification('Nova Nota Fiscal!', {
                body: data.message,
                icon: '/icon-192.png',
                tag: 'new-nfe'
            });
        });

        this.eventSource.onerror = (e) => {
            console.error('SSE connection error:', e);
            this.eventSource?.close();
            this.eventSource = null;
            // Tentar reconectar após 5 segundos
            setTimeout(() => this.connect(), 5000);
        };
    }

    private showNotification(title: string, options: NotificationOptions) {
        if (Notification.permission === 'granted') {
            const notification = new Notification(title, options);
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    }

    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }
}

export const notificationService = new NotificationService();
