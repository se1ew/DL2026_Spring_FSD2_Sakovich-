# QR Code Generator

Full-stack монорепозиторий для генерации, настройки и управления QR-кодами.

## Стек

| Слой | Технологии |
|---|---|
| **Фронтенд** | React 18, TypeScript, Vite, React Konva, react-colorful |
| **Бэкенд** | Node.js 20, Express 5, TypeScript, Zod |
| **База данных** | PostgreSQL 16 + Prisma ORM |
| **Кэш** | Redis 7 (ioredis) |
| **Реалтайм** | Socket.IO (WebSocket) |
| **Авторизация** | JWT (Bearer token) |
| **Инфраструктура** | Docker, docker-compose |
| **Качество кода** | ESLint, Prettier, Vitest, Jest/Supertest |
| **Безопасность** | Helmet.js, express-rate-limit |
| **Логирование** | Morgan |

## Возможности

### QR-генератор
- Генерация QR-кодов в форматах **PNG** и **SVG** — параллельно через `Promise.allSettled` (провал одного формата не блокирует другой)
- Настройка цвета, фона, уровня коррекции ошибок (L / M / Q / H), отступов и размера
- Live preview обновляется при каждом изменении параметров

### Логотип
- Загрузка логотипа через drag-and-drop или выбор файла
- Размещение логотипа поверх QR с перетаскиванием и ресайзом (React Konva)
- Автоматическое ограничение позиции — логотип не может перекрыть угловые маркеры (finder patterns)

### История
- Пагинированная история QR-кодов (6 на страницу, кнопки ← Prev / Next →)
- Скачивание (PNG или SVG), копирование публичной ссылки, удаление

### Реалтайм & публичный доступ
- Публичная ссылка на каждый QR (`/api/qr/:id/view`) — без авторизации
- Счётчик просмотров в Redis; владелец получает WebSocket-уведомление при каждом открытии

### vCard
- Переключатель режима: **Text/URL** или **vCard** (визитка)
- Заполнение полей (имя, организация, телефон, email, сайт) → автоматическая генерация строки в формате vCard 3.0

### Динамические QR-коды
- Чекбокс «Dynamic QR» при создании — QR кодирует редирект-URL (`/r/:id`), а не конечный адрес
- Целевой URL можно менять в любое время через кнопку **Edit target** в истории
- Эндпоинт `GET /r/:id` выполняет 302-редирект на актуальный URL

### Проекты (серии)
- Страница **Projects**: создание и управление коллекциями QR-кодов
- При создании QR можно выбрать проект из выпадающего списка
- Бейджи **Dynamic** и **Project** на карточках истории

## Архитектурные решения

| Паттерн | Где применяется |
|---|---|
| `AbortController` | Отмена in-flight запросов при размонтировании компонента или повторном вызове |
| Rate limiting | `express-rate-limit`: 20 req/15 мин на auth, 30 req/мин на создание QR |
| Refresh token | `crypto.randomBytes(40)`, хранится в БД, TTL 30 дней; rotation при каждом использовании |
| `Promise.allSettled` | Параллельная генерация PNG + SVG в live preview; параллельный `count` + `findMany` в пагинации |
| `Cache-Control: no-store` | Все приватные и мутирующие эндпоинты (`/api/qr`, `/api/auth`, `/health`) |
| `Cache-Control: public, max-age=60` | Публичная страница просмотра QR (`/api/qr/:id/view`) |
| Redis per-page cache | История кэшируется отдельно на каждую комбинацию `page × limit`; инвалидация по паттерну `qr:history:{uid}:*` |
| TS Utility types | `Omit`, `Pick`, `Partial<Record<...>>`, `Required`, `Awaited<ReturnType<...>>`, `Record` |
| Git Flow | `main` ← `develop` ← `feature/*`; все фичи через `--no-ff` merge |

## Структура проекта

```
.
├── backend/          # Express API
│   ├── prisma/       # Схема и миграции
│   └── src/
│       ├── controllers/
│       ├── middleware/   # auth, validate, cache
│       ├── lib/          # prisma, redis, realtime (Socket.IO)
│       ├── routes/
│       ├── services/
│       └── types/
├── frontend/         # React SPA
│   └── src/
│       ├── components/   # QrPreviewStage, ColorPicker, AuthScreen
│       ├── constants/
│       ├── hooks/
│       ├── pages/        # HistoryPage
│       └── types/
└── docker-compose.yml
```

## Тесты

```bash
npm test --workspace=backend   # Jest (schemas, qrService)
npm test --workspace=frontend  # Vitest (constrainLogoPos, validateQrForm)
```

CI запускается автоматически через GitHub Actions на каждый push в `main`, `develop`, `feature/*`.

## Запуск

### Docker (рекомендуется)

```bash
# 1. Скопировать и заполнить переменные (минимум JWT_SECRET и DATABASE_URL)
cp backend/.env.example backend/.env

# 2. Поднять все сервисы
docker-compose up --build
```

| Сервис | URL |
|---|---|
| Фронтенд | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### Локальная разработка

```bash
# Только инфраструктура
docker-compose up postgres redis -d

# Бэкенд
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev              # :3000

# Фронтенд (отдельный терминал)
cd frontend
npm install
npm run dev              # :5173
```

## Переменные окружения

### `backend/.env`

| Переменная | По умолчанию | Описание |
|---|---|---|
| `DATABASE_URL` | — | Строка подключения к PostgreSQL |
| `JWT_SECRET` | — | Секрет для подписи JWT |
| `JWT_EXPIRES_IN` | `7d` | Время жизни токена |
| `REDIS_URL` | `redis://localhost:6379` | URL Redis |
| `REDIS_HISTORY_TTL` | `60` | TTL кэша истории (сек) |
| `CORS_ORIGIN` | `http://localhost:5173` | Разрешённый CORS origin |
| `PORT` | `3000` | Порт HTTP-сервера |

### `frontend/.env`

| Переменная | По умолчанию | Описание |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Базовый URL бэкенда |

## API

| Метод | Путь | Auth | Описание |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Регистрация |
| `POST` | `/api/auth/login` | — | Вход, возвращает JWT |
| `GET` | `/api/auth/me` | ✓ | Проверка токена |
| `POST` | `/api/qr` | ✓ | Создать QR-код |
| `GET` | `/api/qr?page=1&limit=6` | ✓ | Пагинированный список |
| `GET` | `/api/qr/:id` | ✓ | Получить QR по ID |
| `DELETE` | `/api/qr/:id` | ✓ | Удалить QR |
| `GET` | `/api/qr/:id/view` | — | Публичный просмотр (счётчик++) |
| `GET` | `/r/:id` | — | Редирект на `dynamicUrl` для динамических QR |
| `GET` | `/api/projects` | ✓ | Список проектов пользователя |
| `POST` | `/api/projects` | ✓ | Создать проект |
| `DELETE` | `/api/projects/:id` | ✓ | Удалить проект |
| `PATCH` | `/api/qr/:id` | ✓ | Обновить dynamicUrl / projectId |
| `POST` | `/api/auth/refresh` | — | Обновить access token по refresh token |
| `POST` | `/api/auth/logout` | — | Отозвать refresh token |
| `GET` | `/health` | — | Healthcheck |
