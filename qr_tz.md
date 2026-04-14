# 📄 Техническое задание (ТЗ)
## Проект: QR Code Generator (Fullstack)

## 1. Общая цель
Разработать fullstack-приложение для генерации QR-кодов с возможностью кастомизации внешнего вида, хранения истории и скачивания результата.

Приложение должно включать:
- Frontend (React + TypeScript)
- Backend (Node.js + TypeScript, REST API)
- Базу данных (PostgreSQL)
- (Опционально) Redis, Docker, WebSocket

## 2. Пользовательские сценарии (User Stories)
1. Как пользователь, я хочу ввести текст или URL и получить QR-код.
2. Как пользователь, я хочу настроить внешний вид QR-кода.
3. Как пользователь, я хочу видеть историю созданных QR-кодов.

## 3. Функциональные требования

### Frontend:
- Ввод текста/URL
- Валидация URL
- Настройка внешнего вида QR
- Live preview
- Скачать PNG/SVG
- История QR

### Backend:
- Генерация QR
- Сохранение данных
- API
- Валидация
- Обработка ошибок

## 4. API

POST /api/qr

Request:
{
  "data": "https://example.com",
  "color": "#000",
  "background": "#fff",
  "size": 300
}

GET /api/qr

GET /api/qr/:id

## 5. Модель данных

qr_codes:
- id (UUID)
- data (TEXT)
- color (VARCHAR)
- background (VARCHAR)
- size (INTEGER)
- image_url (TEXT)
- created_at (TIMESTAMP)

## 6. Стек технологий

Frontend:
- React
- TypeScript

Backend:
- Node.js
- Express
- Prisma

DB:
- PostgreSQL

## 7. Требования

- Чистый код
- TypeScript
- Работает на Linux/Windows

## 8. README

Инструкция по запуску проекта

## 9. AI_REFLECTION

Описание использования AI

## 10. Готовность

- Работает frontend и backend
- Есть генерация QR
- Есть история
- Есть документация
