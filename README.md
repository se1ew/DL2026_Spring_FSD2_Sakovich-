# Генератор QR-кодов

Full-stack веб-приложение для генерации, настройки и управления QR-кодами.

## Стек технологий

| Слой | Технология |
|---|---|
| Фронтенд | React 18, TypeScript, Vite, React Konva, react-colorful |
| Бэкенд | Node.js, Express, TypeScript, Socket.IO |
| База данных | PostgreSQL 16 + Prisma ORM |
| Кэш | Redis 7 |
| Авторизация | JWT (Bearer token) |
| Инфраструктура | Docker, docker-compose |

## Возможности

- Генерация QR-кодов (PNG / SVG) с настройкой цвета, уровня коррекции ошибок, отступов и размера
- Загрузка логотипа и его размещение на QR через drag-and-drop; логотип автоматически не даёт перекрыть угловые маркеры
- Интерактивный превью на React Konva с перетаскиванием и ресайзом логотипа
- История сгенерированных QR-кодов: скачивание (PNG или SVG), копирование публичной ссылки, удаление
- Публичная ссылка на каждый QR (`/api/qr/:id/view`) — без авторизации
- Счётчик просмотров в Redis; владелец получает уведомление в реальном времени через WebSocket при открытии ссылки

## Требования

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (включает docker-compose)
- Node.js 20+ (для локальной разработки без Docker)

## Запуск через Docker (рекомендуется)

```bash
# 1. Скопировать пример окружения и заполнить секреты (минимум JWT_SECRET)
cp .env.example .env

# 2. Запустить все сервисы
docker-compose up --build
```

| Сервис | URL |
|---|---|
| Фронтенд | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## Локальная разработка (без Docker)

### 1. Запуск инфраструктуры

```bash
# Только PostgreSQL и Redis
docker-compose up postgres redis -d
```

### 2. Бэкенд

```bash
cd backend
cp .env.example .env        # заполнить DATABASE_URL, JWT_SECRET, REDIS_URL
npm install
npx prisma migrate dev      # применить миграции
npm run dev                 # запускается на :3000
```

### 3. Фронтенд

```bash
cd frontend
npm install
npm run dev                 # запускается на :5173
```

## Переменные окружения

### Бэкенд (`backend/.env`)

| Переменная | По умолчанию | Описание |
|---|---|---|
| `DATABASE_URL` | — | Строка подключения к PostgreSQL |
| `JWT_SECRET` | — | Секрет для подписи JWT-токенов |
| `JWT_EXPIRES_IN` | `7d` | Время жизни токена |
| `REDIS_URL` | `redis://localhost:6379` | URL подключения к Redis |
| `REDIS_HISTORY_TTL` | `60` | TTL кэша истории в секундах |
| `CORS_ORIGIN` | `http://localhost:5173` | Разрешённый CORS origin |
| `PORT` | `3000` | Порт HTTP-сервера |

### Фронтенд (`frontend/.env`)

| Переменная | По умолчанию | Описание |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Базовый URL бэкенда |

## Обзор API

| Метод | Путь | Авторизация | Описание |
|---|---|---|---|
| POST | `/api/auth/register` | — | Регистрация |
| POST | `/api/auth/login` | — | Вход, возвращает JWT |
| POST | `/api/qr` | ✓ | Сгенерировать и сохранить QR |
| GET | `/api/qr` | ✓ | Список QR-кодов пользователя |
| GET | `/api/qr/:id` | ✓ | Получить QR по ID |
| DELETE | `/api/qr/:id` | ✓ | Удалить QR |
| GET | `/api/qr/:id/view` | — | Публичная страница QR (увеличивает счётчик просмотров) |
