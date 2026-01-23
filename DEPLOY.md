# 🚀 Быстрый деплой HR Skip Bot

## 🏠 REG.RU + ISPmanager (Рекомендую для России)

### Автоматизированный деплой

```bash
# На сервере выполнить:
curl -fsSL https://raw.githubusercontent.com/your-username/hrskipbot/main/deploy-reg-ru.sh | sudo bash

# Или скачать и запустить:
wget https://raw.githubusercontent.com/your-username/hrskipbot/main/deploy-reg-ru.sh
chmod +x deploy-reg-ru.sh
sudo ./deploy-reg-ru.sh
```

**Что делает скрипт:**
- ✅ Устанавливает Node.js 18, MongoDB, PM2
- ✅ Клонирует проект с GitHub
- ✅ Настраивает переменные окружения
- ✅ Запускает приложение через PM2
- ✅ Настраивает Nginx прокси
- ✅ Включает автозапуск

### Ручная настройка

Смотрите подробную инструкцию в `DEPLOY_REG_RU.md`

---

## Быстрый старт с Vercel (Облачный)

### 1. Подготовка
```bash
# Установить Vercel CLI
npm install -g vercel

# Авторизация
vercel login

# Перейти в папку проекта
cd hrskipbot
```

### 2. Деплой
```bash
# Первый деплой (интерактивный)
vercel

# Или сразу в продакшн
vercel --prod
```

### 3. Настройка переменных окружения
В Vercel Dashboard перейдите в Settings → Environment Variables:

```
BOT_TOKEN=8416000759:AAHpkrcw2x34cyJxy_VznLI_6nZKtGK0XPM
HH_CLIENT_ID=O5C56ETU1LR3EDGEAPAUUGLOEN1VQAU3J242HD7C6GA8TMGRSIM77NNRIODFF6MU
HH_CLIENT_SECRET=M79JEJ6VH8NRVEKG6P5QK68490DP3S4KPGEJ1GQRDRFKGQFFM3CTNSU6E670O6VJ
OPENAI_API_KEY=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
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=vladislavtatynkin01@gmail.com
SMTP_PASS=1245Dkfl-
MONGODB_URI=mongodb://127.0.0.1:27017/hhbot
```

### 4. Готово! 🎉
Бот будет доступен по URL от Vercel. Подключите домен `tatyankin-portfolio.online` если нужно.

---

## Альтернатива: Railway

### 1. Регистрация
Перейдите на [railway.app](https://railway.app) и зарегистрируйтесь через GitHub.

### 2. Создание проекта
```bash
# Установить CLI
npm install -g @railway/cli

# Авторизация
railway login

# Создать проект
railway init hrskipbot

# Добавить переменные окружения
railway variables set BOT_TOKEN=8416000759:AAHpkrcw2x34cyJxy_VznLI_6nZKtGK0XPM
railway variables set HH_CLIENT_ID=O5C56ETU1LR3EDGEAPAUUGLOEN1VQAU3J242HD7C6GA8TMGRSIM77NNRIODFF6MU
# ... остальные переменные

# Деплой
railway up
```

---

## Альтернатива: Render

### 1. Регистрация
Перейдите на [render.com](https://render.com) и зарегистрируйтесь.

### 2. Создание сервиса
- Выберите "Web Service"
- Подключите GitHub репозиторий
- Выберите Node.js
- Настройте переменные окружения
- Деплой!

---

## Альтернатива: Heroku

### 1. Установка
```bash
# Установить Heroku CLI
npm install -g heroku

# Авторизация
heroku login
```

### 2. Создание приложения
```bash
# Создать приложение
heroku create hrskipbot

# Настроить переменные
heroku config:set BOT_TOKEN=8416000759:AAHpkrcw2x34cyJxy_VznLI_6nZKtGK0XPM
heroku config:set HH_CLIENT_ID=O5C56ETU1LR3EDGEAPAUUGLOEN1VQAU3J242HD7C6GA8TMGRSIM77NNRIODFF6MU
# ... остальные

# Деплой
git push heroku main
```

---

## 🗄️ База данных

Для продакшена используйте:

- **MongoDB Atlas** (бесплатно): [mongodb.com/atlas](https://www.mongodb.com/atlas)
- **Railway** имеет встроенную MongoDB
- **Vercel** работает с MongoDB Atlas

### Настройка MongoDB Atlas:
1. Зарегистрируйтесь на MongoDB Atlas
2. Создайте кластер (бесплатный tier)
3. Создайте пользователя БД
4. Получите connection string
5. Добавьте в переменные окружения: `MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hrskipbot`

---

## 🔧 Переменные окружения

Обязательные переменные:

```env
BOT_TOKEN=ваш_telegram_token
HH_CLIENT_ID=ваш_hh_client_id
HH_CLIENT_SECRET=ваш_hh_client_secret
OPENAI_API_KEY=ваш_openai_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ваш_email@gmail.com
SMTP_PASS=ваш_app_password
MONGODB_URI=mongodb://127.0.0.1:27017/hhbot
```

---

## 🚨 Важные замечания

1. **База данных**: Обязательно настройте MongoDB (локально или в облаке)
2. **Email**: Используйте App Password для Gmail, не обычный пароль
3. **API ключи**: Никогда не коммитьте реальные ключи в Git
4. **Домены**: Для кастомного домена настройте DNS в панели платформы

---

## 🆘 Проблемы?

### Бот не запускается:
- Проверьте все переменные окружения
- Проверьте логи: `vercel logs` или в dashboard платформы

### База данных не подключается:
- Проверьте MONGODB_URI
- Убедитесь, что IP адрес разрешен в MongoDB Atlas

### Email не работает:
- Используйте App Password для Gmail
- Проверьте SMTP настройки

---

## 📞 Поддержка

Если что-то не работает, проверьте:
1. Логи платформы
2. Переменные окружения
3. Подключение к внешним сервисам (HH.ru, OpenAI, email)