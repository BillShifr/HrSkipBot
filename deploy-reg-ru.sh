#!/bin/bash

# 🚀 Скрипт деплоя HR Skip Bot на REG.RU + ISPmanager
# Запускать от имени root или с sudo

set -e  # Остановить при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функции
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка root прав
if [[ $EUID -ne 0 ]]; then
   log_error "Этот скрипт должен запускаться с правами root (sudo)"
   exit 1
fi

# Домены и пути
DOMAIN="tatyankin-portfolio.online"
APP_DIR="/var/www/${DOMAIN}"
REPO_URL="https://github.com/BillShifr/hrskipbot.git"

log_info "🚀 Начало деплоя HR Skip Bot на ${DOMAIN}"

# 1. Обновление системы
log_info "📦 Обновление системы..."
apt update && apt upgrade -y

# 2. Установка Node.js 18
log_info "📦 Установка Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    log_info "✅ Node.js установлен: $(node --version)"
else
    log_info "✅ Node.js уже установлен: $(node --version)"
fi

# 3. Установка MongoDB
log_info "📦 Установка MongoDB..."
if ! command -v mongod &> /dev/null; then
    apt-get install -y mongodb
    systemctl enable mongodb
    systemctl start mongodb
    log_info "✅ MongoDB установлен и запущен"
else
    log_info "✅ MongoDB уже установлен"
fi

# 4. Установка PM2
log_info "📦 Установка PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    log_info "✅ PM2 установлен"
else
    log_info "✅ PM2 уже установлен"
fi

# 5. Установка Git
log_info "📦 Установка Git..."
if ! command -v git &> /dev/null; then
    apt-get install -y git
    log_info "✅ Git установлен"
else
    log_info "✅ Git уже установлен"
fi

# 6. Создание директории приложения
log_info "📁 Создание директории приложения..."
mkdir -p "${APP_DIR}"
cd "${APP_DIR}"

# 7. Клонирование репозитория
if [ -d ".git" ]; then
    log_info "🔄 Обновление репозитория..."
    git pull origin main
else
    log_info "📥 Клонирование репозитория..."
    git clone "${REPO_URL}" .
fi

# 8. Установка зависимостей
log_info "📦 Установка зависимостей..."
npm install --production

# 9. Создание .env файла
if [ ! -f ".env" ]; then
    log_info "📝 Создание .env файла..."
    cp env.example .env

    # Вставка реальных значений
    cat > .env << EOF
# Telegram Bot Configuration
BOT_TOKEN=8416000759:AAHpkrcw2x34cyJxy_VznLI_6nZKtGK0XPM

# HH.ru API Configuration
HH_CLIENT_ID=O5C56ETU1LR3EDGEAPAUUGLOEN1VQAU3J242HD7C6GA8TMGRSIM77NNRIODFF6MU
HH_CLIENT_SECRET=M79JEJ6VH8NRVEKG6P5QK68490DP3S4KPGEJ1GQRDRFKGQFFM3CTNSU6E670O6VJ
HH_REDIRECT_URI=https://${DOMAIN}/auth/callback

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
EOF

    log_info "✅ .env файл создан"
else
    log_info "✅ .env файл уже существует"
fi

# 10. Создание директории для логов
log_info "📁 Создание директории для логов..."
mkdir -p logs

# 11. Настройка прав
log_info "🔐 Настройка прав доступа..."
chown -R www-data:www-data "${APP_DIR}"
chmod -R 755 "${APP_DIR}"

# 12. Запуск приложения через PM2
log_info "🚀 Запуск приложения через PM2..."
if pm2 describe hrskipbot > /dev/null 2>&1; then
    log_info "🔄 Перезапуск существующего процесса..."
    pm2 restart hrskipbot
else
    log_info "🎯 Запуск нового процесса..."
    pm2 start ecosystem.config.js
fi

# 13. Сохранение PM2 конфигурации
pm2 save

# 14. Настройка автозапуска PM2
log_info "🔄 Настройка автозапуска PM2..."
pm2 startup systemd -u root --hp /root

# 15. Создание Nginx конфигурации
log_info "🌐 Создание Nginx конфигурации..."
cat > "/etc/nginx/sites-available/${DOMAIN}" << EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    # Перенаправление на HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    # SSL сертификаты (Let's Encrypt через ISPmanager)
    # ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    # Проксирование на Node.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Заголовки безопасности
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Кэширование статических файлов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Логи
    access_log /var/log/nginx/${DOMAIN}_access.log;
    error_log /var/log/nginx/${DOMAIN}_error.log;
}
EOF

# 16. Включение сайта
if [ -f "/etc/nginx/sites-available/${DOMAIN}" ]; then
    ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/"
    log_info "✅ Nginx конфигурация создана"
else
    log_error "❌ Ошибка создания Nginx конфигурации"
fi

# 17. Проверка и перезапуск Nginx
log_info "🔄 Проверка и перезапуск Nginx..."
nginx -t
systemctl reload nginx

# 18. Настройка firewall (если нужно)
log_info "🔥 Настройка firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 80
    ufw allow 443
    ufw allow 22
    ufw --force enable
    log_info "✅ Firewall настроен"
fi

# 19. Финальная проверка
log_info "🧪 Финальная проверка..."
sleep 5

# Проверка PM2
if pm2 jlist | grep -q '"name":"hrskipbot"'; then
    log_info "✅ Приложение запущено в PM2"
else
    log_error "❌ Приложение не запустилось в PM2"
fi

# Проверка порта
if netstat -tlnp | grep -q ":3000 "; then
    log_info "✅ Приложение слушает порт 3000"
else
    log_error "❌ Приложение не слушает порт 3000"
fi

# Проверка Nginx
if systemctl is-active --quiet nginx; then
    log_info "✅ Nginx запущен"
else
    log_error "❌ Nginx не запущен"
fi

log_info ""
log_info "🎉 Деплой завершен!"
log_info ""
log_info "📋 Следующие шаги:"
log_info "1. В ISPmanager настройте SSL-сертификат Let's Encrypt для ${DOMAIN}"
log_info "2. Проверьте работу: https://${DOMAIN}/health"
log_info "3. Добавьте пользователей в Telegram бота"
log_info ""
log_info "🔧 Управление:"
log_info "• Логи PM2: pm2 logs hrskipbot"
log_info "• Перезапуск: pm2 restart hrskipbot"
log_info "• Статус: pm2 status"
log_info ""
log_info "📞 Поддержка: Если что-то не работает, проверьте логи и переменные окружения"