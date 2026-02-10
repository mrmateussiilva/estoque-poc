# 📱 Plano de Otimização Mobile - S.G.E.

Este documento apresenta um plano completo para transformar o S.G.E. em uma aplicação mobile-first, otimizada para dispositivos móveis e tablets.

---

## 📊 Análise do Estado Atual

### ✅ O que já existe:
- ✅ Sidebar responsiva com menu mobile
- ✅ Classes Tailwind responsivas básicas (md:)
- ✅ Header com botão de menu mobile
- ✅ Viewport meta tag configurado
- ✅ Componentes UI básicos (Card, Button, Input)

### ❌ O que falta:
- ❌ PWA (Progressive Web App) - instalação, offline, cache
- ❌ Touch gestures (swipe, pull-to-refresh)
- ❌ Bottom navigation para mobile
- ❌ Otimização de tabelas para mobile (cards)
- ❌ Scanner de código de barras
- ❌ Upload de foto/arquivo otimizado
- ❌ Notificações push
- ❌ Performance mobile (lazy loading, virtual scrolling)
- ❌ Layout mobile-first completo
- ❌ Touch-friendly (tamanhos de toque adequados)

---

## 🎯 Objetivos do Plano Mobile

1. **Experiência Mobile-First**: Interface otimizada para telas pequenas
2. **PWA Completo**: Instalável, offline, notificações
3. **Performance**: Carregamento rápido, scroll suave
4. **Acessibilidade**: Touch-friendly, gestos intuitivos
5. **Funcionalidades Mobile**: Scanner, câmera, geolocalização

---

## 📋 Fase 1: Layout Mobile-First e Responsividade (ALTA PRIORIDADE)

### 1.1 Bottom Navigation para Mobile
**Problema**: Sidebar não é ideal para mobile, ocupa muito espaço

**Solução**: Implementar bottom navigation bar para mobile

```tsx
// frontend/src/components/MobileBottomNav.tsx
export default function MobileBottomNav({ currentPage, onNavigate }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-charcoal-200 z-50 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-1 p-2 ${
              currentPage === item.id ? 'text-ruby-600' : 'text-charcoal-400'
            }`}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
```

**Impacto**: ⚡⚡⚡ Alto - Melhora drasticamente navegação mobile

---

### 1.2 Tabelas Responsivas → Cards Mobile
**Problema**: Tabelas são difíceis de usar em mobile

**Solução**: Converter tabelas em cards em telas pequenas

```tsx
// frontend/src/components/ResponsiveTable.tsx
export function ResponsiveTable({ data, columns }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  if (isMobile) {
    return <CardView data={data} columns={columns} />;
  }
  return <TableView data={data} columns={columns} />;
}
```

**Impacto**: ⚡⚡⚡ Alto - Essencial para uso mobile

---

### 1.3 Otimização de Grids e Layouts
**Problema**: Grids não se adaptam bem a telas pequenas

**Solução**: 
- Grid responsivo: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Stack vertical em mobile
- Padding reduzido em mobile: `p-4 md:p-8`

**Impacto**: ⚡⚡ Médio - Melhora uso do espaço

---

### 1.4 Touch-Friendly Components
**Problema**: Botões e inputs muito pequenos para toque

**Solução**:
- Botões: mínimo 44x44px (Apple HIG) / 48x48px (Material)
- Inputs: altura mínima 48px
- Espaçamento entre elementos: mínimo 8px
- Áreas de toque maiores em mobile

**Impacto**: ⚡⚡⚡ Alto - Essencial para UX mobile

---

## 📋 Fase 2: PWA (Progressive Web App) (ALTA PRIORIDADE)

### 2.1 Service Worker e Cache Strategy
**Problema**: App não funciona offline

**Solução**: Implementar service worker com estratégia de cache

```typescript
// frontend/public/sw.js
const CACHE_NAME = 'sge-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/index.css',
  '/assets/index.js',
];

// Cache-first para assets estáticos
// Network-first para API calls
// Fallback para offline
```

**Benefícios**:
- Funciona offline (modo básico)
- Carregamento mais rápido
- Reduz uso de dados

**Impacto**: ⚡⚡⚡ Alto - Transforma em app instalável

---

### 2.2 Web App Manifest
**Problema**: App não pode ser instalado

**Solução**: Criar `manifest.json` completo

```json
{
  "name": "S.G.E. - Smart Stock",
  "short_name": "SGE",
  "description": "Sistema de Gestão de Estoque",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#e11d48",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "orientation": "portrait-primary",
  "categories": ["business", "productivity"]
}
```

**Impacto**: ⚡⚡⚡ Alto - Permite instalação como app nativo

---

### 2.3 Offline Support e Sync
**Problema**: Sem conexão = sem funcionalidade

**Solução**:
- IndexedDB para armazenar dados offline
- Queue de ações para sincronizar quando online
- Indicador de status de conexão
- Modo offline com funcionalidades limitadas

**Impacto**: ⚡⚡⚡ Alto - Funcionalidade crítica

---

## 📋 Fase 3: Funcionalidades Mobile Específicas (MÉDIA PRIORIDADE)

### 3.1 Scanner de Código de Barras/QR Code
**Problema**: Digitar códigos manualmente é lento

**Solução**: Usar Web API para scanner de código de barras

```typescript
// frontend/src/hooks/useBarcodeScanner.ts
import { Html5Qrcode } from 'html5-qrcode';

export function useBarcodeScanner() {
  const scanBarcode = async () => {
    const scanner = new Html5Qrcode("reader");
    await scanner.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      (decodedText) => {
        scanner.stop();
        return decodedText;
      }
    );
  };
}
```

**Uso**: 
- Buscar produto por código
- Registrar entrada/saída rápida
- Verificar estoque

**Impacto**: ⚡⚡⚡ Alto - Diferencial competitivo

---

### 3.2 Upload Otimizado com Preview
**Problema**: Upload de NF-e é complicado em mobile

**Solução**:
- Input file com preview de imagem
- Drag & drop (desktop) / seleção de arquivo (mobile)
- Compressão de imagens antes do upload
- Progress bar visual

**Impacto**: ⚡⚡ Médio - Melhora UX

---

### 3.3 Pull-to-Refresh
**Problema**: Usuário precisa clicar em botão para atualizar

**Solução**: Implementar pull-to-refresh nativo

```typescript
// frontend/src/hooks/usePullToRefresh.ts
export function usePullToRefresh(onRefresh: () => void) {
  useEffect(() => {
    let startY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };
    // Implementar lógica de pull-to-refresh
  }, [onRefresh]);
}
```

**Impacto**: ⚡⚡ Médio - UX mais natural

---

### 3.4 Swipe Gestures
**Problema**: Ações rápidas são difíceis em mobile

**Solução**: 
- Swipe left → Delete (com confirmação)
- Swipe right → Editar
- Swipe down → Refresh
- Implementar com `react-swipeable` ou `@dnd-kit/core`

**Impacto**: ⚡⚡ Médio - Interações mais rápidas

---

## 📋 Fase 4: Performance e Otimizações Mobile (MÉDIA PRIORIDADE)

### 4.1 Lazy Loading e Code Splitting
**Problema**: Bundle grande demais para mobile

**Solução**:
- Lazy load de rotas: `React.lazy(() => import('./pages/Reports'))`
- Code splitting por página
- Dynamic imports para componentes pesados
- Tree shaking otimizado

**Impacto**: ⚡⚡⚡ Alto - Reduz tempo de carregamento

---

### 4.2 Virtual Scrolling para Listas Grandes
**Problema**: Listas grandes travam em mobile

**Solução**: Usar `react-window` ou `@tanstack/react-virtual`

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualizedList({ items }) {
  const parentRef = useRef();
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
  });
  
  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      {virtualizer.getVirtualItems().map(virtualRow => (
        <div key={virtualRow.key} style={{ height: virtualRow.size }}>
          {items[virtualRow.index]}
        </div>
      ))}
    </div>
  );
}
```

**Impacto**: ⚡⚡⚡ Alto - Performance em listas grandes

---

### 4.3 Image Optimization
**Problema**: Imagens grandes consomem dados e são lentas

**Solução**:
- Lazy loading de imagens: `loading="lazy"`
- WebP com fallback
- Responsive images: `srcset` e `sizes`
- Compressão automática

**Impacto**: ⚡⚡ Médio - Reduz uso de dados

---

### 4.4 Debounce e Throttle em Inputs
**Problema**: Buscas muito frequentes em mobile

**Solução**: Debounce em inputs de busca (300-500ms)

```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback(
  (value: string) => {
    // Fazer busca
  },
  400
);
```

**Impacto**: ⚡⚡ Médio - Reduz requisições

---

## 📋 Fase 5: Notificações e Interatividade (BAIXA PRIORIDADE)

### 5.1 Notificações Push
**Problema**: Usuário não é notificado de eventos importantes

**Solução**: Web Push API com service worker

```typescript
// Solicitar permissão
const permission = await Notification.requestPermission();

// Enviar notificação
if (permission === 'granted') {
  new Notification('Estoque Baixo', {
    body: 'Produto X está abaixo do estoque mínimo',
    icon: '/icon-192.png',
    badge: '/badge.png',
  });
}
```

**Casos de uso**:
- Estoque baixo
- NF-e processada
- Movimentação importante

**Impacto**: ⚡⚡ Médio - Engajamento

---

### 5.2 Haptic Feedback
**Problema**: Falta feedback tátil em ações

**Solução**: Vibrar em ações importantes (se suportado)

```typescript
if ('vibrate' in navigator) {
  navigator.vibrate(50); // Vibrar 50ms
}
```

**Impacto**: ⚡ Baixo - Nice to have

---

### 5.3 Geolocalização (Opcional)
**Problema**: Não há contexto de localização

**Solução**: Usar Geolocation API para:
- Registrar localização em movimentações
- Filtrar por localização
- Mapa de estoque por localização

**Impacto**: ⚡ Baixo - Funcionalidade avançada

---

## 📋 Fase 6: Acessibilidade e UX Mobile (MÉDIA PRIORIDADE)

### 6.1 Safe Area Insets (iPhone Notch)
**Problema**: Conteúdo fica atrás do notch

**Solução**: Usar CSS safe-area-inset

```css
.bottom-nav {
  padding-bottom: env(safe-area-inset-bottom);
}

.header {
  padding-top: env(safe-area-inset-top);
}
```

**Impacto**: ⚡⚡ Médio - Essencial para iPhones modernos

---

### 6.2 Dark Mode Support
**Problema**: Não há suporte a dark mode

**Solução**: 
- Detectar preferência do sistema: `prefers-color-scheme`
- Toggle manual
- Persistir preferência

**Impacto**: ⚡⚡ Médio - UX moderna

---

### 6.3 Keyboard Handling
**Problema**: Teclado virtual cobre inputs

**Solução**:
- Scroll automático para input focado
- `scrollIntoView` quando input ganha foco
- Ajustar viewport quando teclado aparece

**Impacto**: ⚡⚡ Médio - Melhora UX de formulários

---

### 6.4 Loading States Otimizados
**Problema**: Loading genérico não informa progresso

**Solução**:
- Skeleton screens para conteúdo
- Progress bars para uploads
- Loading states específicos por ação
- Otimistic updates quando possível

**Impacto**: ⚡⚡ Médio - Percepção de velocidade

---

## 🛠️ Stack Tecnológica Recomendada

### Bibliotecas Adicionais:
```json
{
  "dependencies": {
    "@tanstack/react-virtual": "^3.0.0",        // Virtual scrolling
    "html5-qrcode": "^2.3.8",                    // Scanner de código
    "react-swipeable": "^7.0.1",                // Swipe gestures
    "use-debounce": "^10.0.0",                  // Debounce
    "workbox-window": "^7.0.0",                 // PWA
    "idb": "^8.0.0"                              // IndexedDB wrapper
  }
}
```

### Vite PWA Plugin:
```bash
pnpm add -D vite-plugin-pwa
```

---

## 📊 Priorização e Roadmap

### Sprint 1 (Semana 1-2): Fundação Mobile
1. ✅ Bottom Navigation
2. ✅ Tabelas → Cards Mobile
3. ✅ Touch-friendly components
4. ✅ Layout responsivo completo

**Impacto**: ⚡⚡⚡ Alto - Base essencial

---

### Sprint 2 (Semana 3-4): PWA Básico
1. ✅ Service Worker
2. ✅ Web App Manifest
3. ✅ Cache Strategy
4. ✅ Instalação PWA

**Impacto**: ⚡⚡⚡ Alto - App instalável

---

### Sprint 3 (Semana 5-6): Funcionalidades Mobile
1. ✅ Scanner de código de barras
2. ✅ Pull-to-refresh
3. ✅ Swipe gestures básicos
4. ✅ Upload otimizado

**Impacto**: ⚡⚡⚡ Alto - Diferenciais

---

### Sprint 4 (Semana 7-8): Performance
1. ✅ Lazy loading
2. ✅ Virtual scrolling
3. ✅ Image optimization
4. ✅ Debounce/throttle

**Impacto**: ⚡⚡⚡ Alto - Performance

---

### Sprint 5 (Semana 9-10): Polimento
1. ✅ Notificações push
2. ✅ Offline support completo
3. ✅ Dark mode
4. ✅ Acessibilidade mobile

**Impacto**: ⚡⚡ Médio - Polimento

---

## 🎯 Métricas de Sucesso

### Performance:
- **First Contentful Paint (FCP)**: < 1.5s (mobile)
- **Largest Contentful Paint (LCP)**: < 2.5s (mobile)
- **Time to Interactive (TTI)**: < 3.5s (mobile)
- **Bundle Size**: < 500KB (gzipped)

### UX:
- **Touch Target Size**: Mínimo 44x44px
- **Scroll Performance**: 60 FPS
- **Offline Functionality**: Básico funcionando
- **PWA Score**: > 90 (Lighthouse)

### Funcionalidades:
- ✅ App instalável
- ✅ Scanner funcionando
- ✅ Offline básico
- ✅ Notificações push

---

## 📝 Checklist de Implementação

### Fase 1: Layout Mobile-First
- [ ] Criar `MobileBottomNav` component
- [ ] Implementar `ResponsiveTable` → Cards
- [ ] Ajustar grids para mobile (`grid-cols-1 md:grid-cols-2`)
- [ ] Aumentar tamanhos de toque (mínimo 44px)
- [ ] Otimizar padding/spacing mobile
- [ ] Testar em diferentes tamanhos de tela

### Fase 2: PWA
- [ ] Criar `manifest.json`
- [ ] Gerar ícones (192x192, 512x512)
- [ ] Implementar Service Worker
- [ ] Configurar cache strategy
- [ ] Testar instalação PWA
- [ ] Implementar offline fallback

### Fase 3: Funcionalidades Mobile
- [ ] Integrar scanner de código de barras
- [ ] Implementar pull-to-refresh
- [ ] Adicionar swipe gestures
- [ ] Otimizar upload de arquivos
- [ ] Adicionar preview de imagens

### Fase 4: Performance
- [ ] Implementar lazy loading de rotas
- [ ] Adicionar virtual scrolling
- [ ] Otimizar imagens (WebP, lazy load)
- [ ] Debounce em inputs de busca
- [ ] Code splitting otimizado

### Fase 5: Notificações
- [ ] Solicitar permissão de notificações
- [ ] Implementar notificações push
- [ ] Configurar service worker para push
- [ ] Criar UI de configuração

### Fase 6: Polimento
- [ ] Safe area insets (iPhone)
- [ ] Dark mode
- [ ] Keyboard handling
- [ ] Skeleton screens
- [ ] Testes em dispositivos reais

---

## 🚀 Quick Wins (Implementar Primeiro)

1. **Bottom Navigation** - Impacto imediato na navegação
2. **Tabelas → Cards** - Essencial para uso mobile
3. **Touch-friendly** - Melhora UX imediatamente
4. **PWA Manifest** - Permite instalação rapidamente
5. **Scanner de Código** - Diferencial competitivo

---

## 📚 Recursos e Referências

- **PWA Checklist**: https://web.dev/pwa-checklist/
- **Mobile UX Guidelines**: https://developer.apple.com/design/human-interface-guidelines/
- **Material Design Mobile**: https://material.io/design
- **Web Vitals**: https://web.dev/vitals/
- **Touch Target Guidelines**: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html

---

*Plano criado em: 2026-02-10*
*Versão: 1.0*
