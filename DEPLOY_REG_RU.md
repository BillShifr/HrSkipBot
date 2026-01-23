# 🚀 Деплой на REG.RU + ISPmanager

## Быстрый старт для домена tatyankin-portfolio.online

### 📋 Предварительные требования

- ✅ Аккаунт на REG.RU
- ✅ VPS/Выделенный сервер с ISPmanager
- ✅ SSH доступ к серверу
- ✅ Домен tatyankin-portfolio.online

---

## 1️⃣ Подготовка сервера

### Через ISPmanager

1. **Войдите в ISPmanager** (обычно `https://ваш-ip:1500`)
2. **Перейдите**: Система → Управление пакетами
3. **Установите пакеты**:
   - ✅ `nodejs` (версия 18+)
   - ✅ `npm`
   - ✅ `mongodb`
   - ✅ `nginx`
   - ✅ `git`

### Через SSH (если ISPmanager не позволяет)

```bash
# Подключиться к серверу
ssh root@ваш-ip-сервера

# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs npm

# Установить MongoDB
sudo apt-get install -y mongodb

# Установить PM2 глобально
sudo npm install -g pm2

# Установить git
sudo apt-get install -y git
```

---

## 2️⃣ Создание сайта в ISPmanager

1. **В ISPmanager**: WWW → WWW-домены → Создать
2. **Заполните**:
   - **Имя**: `tatyankin-portfolio.online`
   - **Корневая папка**: `/var/www/tatyankin-portfolio.online`
   - **PHP**: ❌ **Отключить** (нам нужен Node.js)
   - **SSL**: ✅ Включить (Let's Encrypt)

3. **Сохраните** настройки

---

## 3️⃣ Деплой приложения

### Через SSH

```bash
# Подключиться к серверу
ssh root@ваш-ip-сервера

# Перейти в папку сайта
cd /var/www/tatyankin-portfolio.online

# Клонировать проект
git clone https://github.com/your-username/hrskipbot.git .

# Установить зависимости
npm install

# Создать .env файл
cp env.example .env

# Отредактировать .env
nano .env
```

### Содержимое .env файла

```env
# Telegram Bot Configuration
BOT_TOKEN=8416000759:AAHpkrcw2x34cyJxy_VznLI_6nZKtGK0XPM

# HH.ru API Configuration
HH_CLIENT_ID=O5C56ETU1LR3EDGEAPAUUGLOEN1VQAU3J242HD7C6GA8TMGRSIM77NNRIODFF6MU
HH_CLIENT_SECRET=M79JEJ6VH8NRVEKG6P5QK68490DP3S4KPGEJ1GQRDRFKGQFFM3CTNSU6E670O6VJ
HH_REDIRECT_URI=https://tatyankin-portfolio.online/auth/callback

# OpenAI Configuration
OPENAI_API_KEY=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

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=vladislavtatynkin01@gmail.com
SMTP_PASS=1245Dkfl-

# Database Configuration
MONGODB_URI=mongodb://127.0.0.1:27017/hhbot

# Server Configuration
PORT=3000
NODE_ENV=production
```

---

## 4️⃣ Настройка PM2

### Создать файл ecosystem.config.js

```bash
nano ecosystem.config.js
```

**Содержимое**:

```javascript
module.exports = {
  apps: [{
    name: 'hrskipbot',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### Запустить приложение

```bash
# Запустить
pm2 start ecosystem.config.js

# Сохранить конфигурацию
pm2 save

# Настроить автозапуск при перезагрузке сервера
pm2 startup

# Следовать инструкциям PM2
```

---

## 5️⃣ Настройка Nginx

### Через ISPmanager

1. **WWW → WWW-домены** → Выберите `tatyankin-portfolio.online`
2. **Настройки** → **Конфигурация Nginx**
3. **Дополнительная конфигурация** (вставьте):

```nginx
# Проксирование на Node.js приложение
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# Заголовки безопасности
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;

# Кэширование статических файлов (если будут)
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

4. **Сохраните** и **перезапустите** Nginx

---

## 6️⃣ SSL сертификат

### Через ISPmanager

1. **WWW → SSL-сертификаты**
2. **Создать** → **Бесплатный сертификат Let's Encrypt**
3. **Домен**: `tatyankin-portfolio.online`
4. **Выпустить** сертификат

### Автоматическое продление

ISPmanager автоматически продлевает Let's Encrypt сертификаты.

---

## 7️⃣ Проверка работы

```bash
# Проверить статус PM2
pm2 status
pm2 logs hrskipbot

# Проверить работу приложения
curl https://tatyankin-portfolio.online/health

# Проверить логи
tail -f logs/combined.log
```

### В браузере

- Откройте: `https://tatyankin-portfolio.online/health`
- Должны увидеть: `{"status":"OK","timestamp":"..."}`

### В Telegram

- Найдите бота: `@your_bot_username`
- Отправьте: `/start`
- Бот должен ответить

---

## 🔧 Управление и обслуживание

### Просмотр логов

```bash
# Логи PM2
pm2 logs hrskipbot

# Логи приложения
tail -f logs/combined.log

# Логи Nginx (через ISPmanager)
```

### Перезапуск приложения

```bash
# Перезапуск
pm2 restart hrskipbot

# Полная остановка
pm2 stop hrskipbot

# Запуск
pm2 start hrskipbot
```

### Обновление кода

```bash
cd /var/www/tatyankin-portfolio.online

# Получить обновления
git pull origin main

# Переустановить зависимости (если package.json изменился)
npm install

# Перезапустить
pm2 restart hrskipbot
```

---

## 🆘 Устранение неполадок

### Приложение не запускается

```bash
# Проверить логи
pm2 logs hrskipbot

# Проверить переменные окружения
cat .env

# Проверить MongoDB
sudo systemctl status mongodb

# Проверить Node.js
node --version
npm --version
```

### Ошибка подключения к MongoDB

```bash
# Проверить работу MongoDB
sudo systemctl status mongodb

# Проверить конфигурацию
sudo nano /etc/mongodb.conf

# Перезапустить MongoDB
sudo systemctl restart mongodb
```

### Nginx не проксирует

```bash
# Проверить конфигурацию Nginx
sudo nginx -t

# Перезапустить Nginx
sudo systemctl reload nginx

# Проверить логи
sudo tail -f /var/log/nginx/error.log
```

### Бот не отвечает в Telegram

```bash
# Проверить токен бота
curl "https://api.telegram.org/bot{YOUR_BOT_TOKEN}/getMe"

# Проверить логи приложения
pm2 logs hrskipbot
```

---

## 📊 Мониторинг

### Через ISPmanager

- **Мониторинг** → **Системный монитор**
- **WWW** → **Статистика** (для просмотра логов доступа)

### PM2 команды

```bash
pm2 monit          # Интерактивный монитор
pm2 list           # Список процессов
pm2 show hrskipbot # Детали процесса
```

---

## 🔄 Резервное копирование

### База данных

```bash
# Создать бэкап MongoDB
mongodump --db hhbot --out /var/backups/mongodb/$(date +%Y%m%d_%H%M%S)

# Восстановить из бэкапа
mongorestore --db hhbot /path/to/backup
```

### Файлы приложения

```bash
# Создать архив
tar -czf /var/backups/hrskipbot_$(date +%Y%m%d_%H%M%S).tar.gz /var/www/tatyankin-portfolio.online
```

### Настроить cron для автоматического бэкапа

```bash
# Отредактировать crontab
sudo crontab -e

# Добавить строки (ежедневно в 2:00)
0 2 * * * mongodump --db hhbot --out /var/backups/mongodb/$(date +\%Y\%m\%d_\%H\%M\%S)
0 2 * * * tar -czf /var/backups/hrskipbot_$(date +\%Y\%m\%d_\%H\%M\%S).tar.gz /var/www/tatyankin-portfolio.online
```

---

## 🎉 Готово!

Теперь ваш HR Skip Bot работает на домене `tatyankin-portfolio.online`!

### Следующие шаги:

1. **Настройте домен** в REG.RU (если не настроен)
2. **Протестируйте** все функции бота
3. **Настройте мониторинг** и резервное копирование
4. **Добавьте пользователей** в Telegram бота

### Контакты поддержки:

- **REG.RU**: support@reg.ru
- **ISPmanager**: документация на сайте
- **PM2**: https://pm2.keymetrics.io/

---

*Документация обновлена: $(date +%Y-%m-%d)*