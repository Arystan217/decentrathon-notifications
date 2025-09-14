# Push Notification Generator

Генерирует персонализированные push-уведомления для банковских клиентов на основе анализа их транзакций и переводов.

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка API ключа

Создайте файл `.env` в папке `server/`:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Подготовка данных

Поместите CSV файлы в корневую папку `server/` с именами:

- `client_1_transactions_3m.csv`
- `client_1_transfers_3m.csv`
- `client_2_transactions_3m.csv`
- `client_2_transfers_3m.csv`
- ... и так далее для всех клиентов

### 4. Запуск сервера

```bash
npm run dev
```

### 5. Генерация push-уведомлений

```bash
# Для клиента с ID 1
curl http://localhost:3000/api/generate-push/1

# Для клиента с ID 2
curl http://localhost:3000/api/generate-push/2
```

## Результат

CSV файлы создаются в папке `output/`:

- `client_1_recommendation.csv`
- `client_2_recommendation.csv`
- и т.д.

Формат CSV:

```csv
client_code,product,push_notification
1,"Карта для путешествий","Айгерим, в августе вы сделали 12 поездок на такси на 27 400 ₸. С картой для путешествий вернули бы ≈1 100 ₸. Откройте карту в приложении."
```

## Структура CSV файлов

### Транзакции (client_X_transactions_3m.csv)

```csv
client_code,name,product,status,city,date,category,amount,currency
1,Айгерим,Карта для путешествий,зп,Алматы,2025-06-01 09:10:36,Такси,6424.48,KZT
```

### Переводы (client_X_transfers_3m.csv)

```csv
client_code,name,product,status,city,date,type,direction,amount,currency
1,Айгерим,Карта для путешествий,зп,Алматы,2025-06-01 11:40:16,card_out,out,9359.56,KZT
```

## Доступные продукты

1. Карта для путешествий
2. Премиальная карта
3. Кредитная карта
4. Обмен валют
5. Кредит наличными
6. Депозит мультивалютный
7. Депозит сберегательный
8. Депозит накопительный
9. Инвестиции
10. Золотые слитки

## Логи

Сервер выводит в консоль:

- Информацию о промпте
- Использование токенов OpenAI
- Созданные CSV файлы
- Ошибки (если есть)

## Требования

- Node.js 16+
- OpenAI API ключ
- CSV файлы с данными клиентов
