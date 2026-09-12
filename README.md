# FD SmartCheck — Frontend

Interface web do FD SmartCheck: sistema de check-in por **QR Code + geolocalização** para eventos acadêmicos. Administradores gerenciam eventos, atividades, usuários e relatórios; alunos veem seus eventos e fazem check-in escaneando o QR e enviando a localização.

## Stack

- **React 19** · **TypeScript** · **Vite 7**
- **Tailwind CSS** (estilo) · **Zustand** (estado global de auth) · **React Router v7**
- **Axios** (instância central em `src/services/api.ts`, injeta o JWT)
- **Leaflet / React Leaflet** (mapas) · **html5-qrcode** + **react-qr-code** (QR) · **crypto-js** (assinatura de geo)

## Pré‑requisitos

- **Node.js** (18+ recomendado) e npm.
- Backend rodando em `http://localhost:8080` (ver `../back/README.md`).

## Como rodar

```bash
cd front
npm install
npm run dev
```

O Vite sobe em **http://localhost:3000** (porta fixada em `vite.config.ts`) com um proxy de `/api` → `http://localhost:8080`.

## Scripts

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (porta **3000**, HMR) |
| `npm run build` | Build de produção (`vite build`) |
| `npm run preview` | Serve o build de produção localmente |
| `npm run lint` | ESLint |
| `npm run typecheck` | Checagem de tipos (`tsc --noEmit`) |

## Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste se necessário:

| Variável | Descrição | Default |
|----------|-----------|---------|
| `VITE_API_URL` | Base da API | `http://localhost:8080/api` |
| `VITE_GEO_SECRET_KEY` | Segredo do HMAC de geolocalização — **precisa ser igual ao `app.geo.secret-key` do backend** | — |

> **Atenção**: `VITE_GEO_SECRET_KEY` vai para o bundle do navegador (toda variável `VITE_*` é embutida no build). É o mesmo segredo compartilhado com o backend para assinar o payload de geolocalização do check-in — mantenha os dois lados em sincronia.

## Estrutura

```
front/src/
├── components/   # check/ (admin, student, shared), common/ (forms, modais, Button/Input), layout/, import/
├── pages/        # uma pasta por feature: Event/, SubEvent/, check/, auth/, Academic/, Import/, Profile/, UsersList.tsx
├── routes/       # index.tsx (router), ProtectedRoute.tsx, routesConfig.ts
├── services/     # um arquivo por recurso de API + api.ts (axios com interceptor de JWT)
├── store/        # authStore.ts (Zustand — só auth)
├── types/        # index.ts (todos os tipos do domínio, espelhando os DTOs do backend)
└── utils/        # crypto.ts, geoSecurity.ts, semester.ts
```

## Convenções

- **Só Tailwind** para estilo (sem CSS custom).
- Estado de UI (loading/erro/dados) é **local** (`useState`); só a auth vai no store global.
- Toda chamada HTTP passa pela instância `api` (`src/services/api.ts`); nunca `fetch` direto.
- Todos os tipos do domínio ficam em `src/types/index.ts`.

Convenções completas em `front/CLAUDE.md`; documentação do backend em `../back/docs/`.
