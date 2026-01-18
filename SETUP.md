# Руководство по развертыванию HADA

## Системные требования

### Минимальные требования

- **ОС**: Windows 11 (основная), Linux, macOS
- **RAM**: 16 GB (32 GB рекомендуется для больших моделей)
- **Диск**: 50 GB свободного места
- **CPU**: 4+ ядер (8+ рекомендуется)
- **GPU**: Опционально, для ускорения Ollama

### Программное обеспечение

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- Ollama >= 0.1.0

## Пошаговая установка

### Шаг 1: Установка Node.js

#### Windows

```bash
# Скачайте с https://nodejs.org/
# Выберите LTS версию
# Установите с настройками по умолчанию
```

Проверка:

```bash
node --version  # должно быть >= 18.0.0
npm --version   # должно быть >= 9.0.0
```

### Шаг 2: Установка Ollama

#### Windows

1. Скачайте Ollama: https://ollama.ai/download/windows
2. Запустите установщик
3. Ollama запустится автоматически в системном трее

#### Linux

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

#### macOS

```bash
brew install ollama
```

Проверка:

```bash
ollama --version
```

### Шаг 3: Загрузка моделей

```bash
# Основная модель-исполнитель (обязательно)
ollama pull qwen3:latest

# Опционально: другие размеры
ollama pull qwen3:14b
ollama pull qwen3:32b
```

Проверка загруженных моделей:

```bash
ollama list
```

### Шаг 4: Клонирование и настройка проекта

```bash
# Перейдите в рабочую директорию
cd d:\Work

# Клонируйте репозиторий (если используете Git)
# или распакуйте архив в d:\Work\LLM

cd LLM

# Установка зависимостей
npm install
```

### Шаг 5: Настройка окружения

Создайте файл `.env`:

```bash
# Windows
copy .env.example .env

# Linux/macOS
cp .env.example .env
```

Отредактируйте `.env`:

#### Для локального режима (без Claude):

```env
# Не указывайте ANTHROPIC_API_KEY или оставьте пустым
LOCAL_LLM_PROVIDER=ollama
LOCAL_LLM_HOST=http://localhost:11434
DEFAULT_EXECUTOR_MODEL=qwen3
AGENT_MODE=local_only
PORT=3001
```

#### Для гибридного режима (с Claude):

```env
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx...

LOCAL_LLM_PROVIDER=ollama
LOCAL_LLM_HOST=http://localhost:11434
DEFAULT_EXECUTOR_MODEL=qwen3
AGENT_MODE=hybrid
PORT=3001
```

**Получение ключа Anthropic:**

1. Зарегистрируйтесь на https://console.anthropic.com/
2. Создайте API ключ
3. Скопируйте в `.env`

### Шаг 6: Запуск приложения

#### Режим разработки (рекомендуется для начала)

```bash
npm run dev
```

Это запустит:

- Backend на http://localhost:3001
- Frontend на http://localhost:5173

#### Раздельный запуск

Терминал 1 (Backend):

```bash
npm run server
```

Терминал 2 (Frontend):

```bash
npm run client
```

#### Production режим

```bash
# Сборка
npm run build

# Запуск
npm start
```

### Шаг 7: Проверка работоспособности

Откройте браузер: http://localhost:5173

Проверьте:

1. ✅ Страница загрузилась
2. ✅ Сайдбар виден слева
3. ✅ Можно создать новый чат
4. ✅ Можно отправить сообщение
5. ✅ Ассистент отвечает

Проверьте статус в настройках (⚙️):

- **Ollama**: должен быть 🟢 онлайн
- **Claude**: зависит от вашего режима

## Настройка для различных сценариев

### Сценарий 1: Полностью локальная работа

Идеально для:

- Работы без интернета
- Конфиденциальных проектов
- Ограниченного бюджета

Настройка:

```env
AGENT_MODE=local_only
# ANTHROPIC_API_KEY не нужен
```

Преимущества:

- Бесплатно
- Приватность
- Работает оффлайн

Недостатки:

- Ниже качество для сложных задач
- Больше нагрузка на CPU/RAM

### Сценарий 2: Гибридный режим

Идеально для:

- Профессиональной разработки
- Сложных архитектурных задач
- Качественного кода

Настройка:

```env
AGENT_MODE=hybrid
ANTHROPIC_API_KEY=sk-ant-...
```

Преимущества:

- Высокое качество
- Архитектурное мышление Claude
- Качественный код-ревью

Недостатки:

- Требует API ключ (платный)
- Требует интернет

## Оптимизация производительности

### Для систем с ограниченной RAM

Используйте меньшую модель:

```env
DEFAULT_EXECUTOR_MODEL=qwen3:7b
```

### Для систем с GPU

Ollama автоматически использует GPU если доступен:

- NVIDIA: CUDA
- AMD: ROCm
- Apple: Metal

Проверка использования GPU:

```bash
ollama ps
```

### Ускорение запуска

#### Windows - автозапуск Ollama

Ollama добавляется в автозагрузку при установке.

#### Linux - systemd service

```bash
sudo systemctl enable ollama
sudo systemctl start ollama
```

## Решение распространенных проблем

### Проблема: "Cannot connect to Ollama"

**Решение:**

```bash
# Проверьте, запущен ли Ollama
curl http://localhost:11434/api/tags

# Windows: проверьте трей, перезапустите Ollama
# Linux:
sudo systemctl restart ollama
```

### Проблема: "Module not found"

**Решение:**

```bash
# Очистите и переустановите зависимости
rm -rf node_modules package-lock.json
npm install
```

### Проблема: Порт 3001 или 5173 занят

**Решение:**

```bash
# Измените порт в .env
PORT=3002

# Или завершите процесс
# Windows:
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/macOS:
lsof -ti:3001 | xargs kill -9
```

### Проблема: Медленная генерация

**Причины и решения:**

1. **Слабая система** → используйте меньшую модель
2. **Нет GPU** → рассмотрите гибридный режим
3. **Большая модель** → переключитесь на qwen3:7b

### Проблема: Голосовой ввод не работает

**Решение:**

1. Используйте Chrome или Edge (не Firefox)
2. Разрешите доступ к микрофону
3. Проверьте HTTPS (в продакшене)
4. Убедитесь, что язык системы поддерживает русский

## Обновление системы

```bash
# Обновить зависимости
npm update

# Обновить Ollama
# Windows: скачайте новую версию
# Linux:
curl -fsSL https://ollama.ai/install.sh | sh

# Обновить модели
ollama pull qwen3:latest
```

## Безопасность

### Рекомендации:

1. **Никогда не коммитьте `.env`** - файл в `.gitignore`
2. **Ограничьте доступ** - не выставляйте в интернет
3. **Используйте файрволл** - ограничьте порты
4. **Регулярно обновляйте** - npm audit

### Для production деплоя:

```bash
# Используйте переменные окружения
# Настройте reverse proxy (nginx)
# Включите HTTPS
# Ограничьте CORS
```

## Резервное копирование

### Что бэкапить:

- `context_storage/` - все контексты чатов
- `.env` - конфигурация (без коммита!)
- Пользовательские конфиги

```bash
# Пример скрипта бэкапа
tar -czf backup-$(date +%Y%m%d).tar.gz context_storage/ .env
```

## Мониторинг

### Проверка здоровья системы:

```bash
# Backend health
curl http://localhost:3001/api/health

# Ollama health
curl http://localhost:11434/api/tags
```

### Логи:

- Backend: console.log в терминале
- Ollama: системные логи
- Frontend: DevTools консоль

## Следующие шаги

После успешной установки:

1. 📖 Изучите [основное README](README.md)
2. 🎮 Попробуйте простые запросы
3. ⚙️ Настройте под свои нужды
4. 🚀 Начните разработку!

## Поддержка

При проблемах:

1. Проверьте этот гайд
2. Изучите [Troubleshooting в README](README.md#-решение-проблем)
3. Создайте issue с описанием проблемы

---

Удачного использования HADA! 🚀
