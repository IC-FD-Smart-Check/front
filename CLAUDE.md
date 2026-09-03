# Frontend — FD SmartCheck (React + TypeScript)

## Stack
- React 19 · TypeScript · Vite
- Tailwind CSS (styling — sem CSS modules, sem styled-components)
- Zustand (estado global — apenas auth)
- React Router v7
- Axios (HTTP — instância centralizada em `src/services/api.ts`)
- Lucide React (ícones)
- Leaflet + React Leaflet (mapas de geolocalização)
- html5-qrcode + react-qr-code (leitura e exibição de QR)
- jsPDF + xlsx (geração de relatórios no cliente)
- crypto-js (segurança de geo)

## Estrutura de pastas
```
src/
├── components/
│   ├── check/
│   │   ├── admin/       → CheckCards, CheckFilters, CheckTable, Reports, AdminCheck
│   │   ├── student/     → QRScanner, StudentCheck, CheckHistory, CheckTabs, CheckinInitial, EventConfirmation
│   │   └── shared/      → CheckStats (compartilhado entre admin e student)
│   ├── common/          → Componentes reutilizáveis (Button, Input, Toast, LoadingOverlay, modals, forms)
│   └── layout/          → Layout.tsx (wrapper), Sidebar.tsx
├── hooks/               → useAuth.ts, useToast.ts
├── pages/               → Uma pasta por feature (Event/, SubEvent/, check/, auth/)
├── routes/              → index.tsx (router), ProtectedRoute.tsx, routesConfig.ts
├── services/            → Um arquivo por recurso de API + api.ts (instância axios)
├── store/               → authStore.ts (Zustand)
├── types/               → index.ts (todos os tipos TypeScript do domínio)
└── utils/               → crypto.ts, geoSecurity.ts
```

## Convenções obrigatórias

### Componentes
- Functional components com TypeScript — nunca class components
- Props tipadas com `interface` (não `type` para props de componente)
- Arquivos `.tsx` para componentes, `.ts` para lógica pura
- Nomenclatura: PascalCase para componentes, camelCase para hooks e utils

```tsx
interface MyComponentProps {
  title: string;
  onAction: () => void;
}

const MyComponent = ({ title, onAction }: MyComponentProps) => {
  return (
    <div className="...tailwind...">
      ...
    </div>
  );
};

export default MyComponent;
```

### Styling
- **Somente Tailwind** — não criar CSS custom salvo em casos muito específicos (animações, overrides de lib)
- Classes responsivas mobile-first quando necessário
- Estados visuais (hover, focus, disabled) sempre explícitos nas classes Tailwind

### Roteamento
Toda rota nova deve ser registrada em `src/routes/routesConfig.ts`:

```ts
{
  path: '/nova-rota',
  component: NovoComponente,
  isPrivate: true,
  layout: true,
  roles: ['ADMIN'], // ou ['STUDENT', 'ADMIN'] se compartilhada
}
```

`ProtectedRoute.tsx` valida autenticação e role automaticamente com base nesse config.

### Estado global (Zustand)
Somente `authStore` é global. Contém: usuário autenticado, token, actions de login/logout.

```ts
// Consumo
import { useAuthStore } from '@/store/authStore';
const { user, token } = useAuthStore();
```

Estado de UI local (loading, error, dados de página) fica em `useState` no próprio componente ou página — não vai pro store global.

### Serviços de API
Cada recurso tem seu service em `src/services/`. Todos usam a instância `api` de `src/services/api.ts` (que já injeta o JWT via interceptor).

```ts
// Padrão de service
import api from './api';
import type { EventResponse, EventRequest } from '@/types';

export const eventService = {
  getAll: () => api.get<EventResponse[]>('/events').then(r => r.data),
  getById: (id: string) => api.get<EventResponse>(`/events/${id}`).then(r => r.data),
  create: (data: EventRequest) => api.post<EventResponse>('/events', data).then(r => r.data),
  update: (id: string, data: EventRequest) => api.put<EventResponse>(`/events/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/events/${id}`),
};
```

### Tipos TypeScript
Todos os tipos do domínio ficam em `src/types/index.ts`. Nomes espelham os DTOs do backend:

```ts
// Nomenclatura alinhada com o backend
interface EventResponse { id: string; title: string; status: EventStatus; ... }
interface EventRequest { title: string; startDate: string; ... }
type EventStatus = 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'COMPLETED';
type Role = 'STUDENT' | 'ADMIN';
```

### Tratamento de erros e loading
- Loading state: `useState<boolean>` local no componente/página
- Erro: capturado no catch e exibido via `useToast` (não alert/console.error)
- Campos de formulário: validação antes do submit, nunca confiar só no backend

```tsx
const [loading, setLoading] = useState(false);
const { showToast } = useToast();

const handleSubmit = async () => {
  setLoading(true);
  try {
    await eventService.create(formData);
    showToast('Evento criado com sucesso', 'success');
  } catch (err) {
    showToast('Erro ao criar evento', 'error');
  } finally {
    setLoading(false);
  }
};
```

### Geolocalização
`GeoSecurity` e `crypto.ts` são utilitários de segurança para check-in. Não mover nem refatorar sem entender o contrato com o backend (`GeoSecurityService.java`).

### QR Code
- **Leitura** (aluno faz scan): `html5-qrcode` via `QRScanner.tsx`
- **Exibição** (admin mostra QR): `react-qr-code` via `QRCodeManager.tsx`

## Como rodar e buildar
```bash
npm run dev      # desenvolvimento (porta 5173)
npm run build    # build de produção
npm run lint     # checar lint (eslint + typescript-eslint)
npm run preview  # servir o build de produção localmente
```

## Variável de ambiente
```
VITE_API_URL=http://localhost:8080/api   # padrão se não definido
```

## O que NÃO fazer
- Não criar CSS custom — usar Tailwind
- Não adicionar estado ao store global sem motivo — estado local é padrão
- Não fazer fetch direto com `fetch()` ou `XMLHttpRequest` — sempre usar a instância `api`
- Não armazenar dados sensíveis além do token (que vai no localStorage por ora)
- Não duplicar tipos — todos em `src/types/index.ts`
- Não criar componentes de página em `components/` — pages ficam em `pages/`
- Não ignorar estados de loading e erro — toda chamada assíncrona precisa tratá-los
