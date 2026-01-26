<?php
/**
 * GitHub Webhook для автоматического деплоя HR Skip Bot
 * Разместить в корне сайта: /var/www/tatyankin-portfolio.online/deploy.php
 * Настроить в GitHub: Settings → Webhooks → Add webhook
 * Payload URL: https://tatyankin-portfolio.online/deploy.php
 * Content type: application/json
 * Secret: установить в GITHUB_WEBHOOK_SECRET
 */

// Настройки безопасности
// Чтение секрета из .env файла
$envFile = __DIR__ . '/.env';
$GITHUB_SECRET = 'your-secret-key-change-me';

if (file_exists($envFile)) {
    $envContent = file_get_contents($envFile);
    if (preg_match('/GITHUB_WEBHOOK_SECRET=(.+)/', $envContent, $matches)) {
        $GITHUB_SECRET = trim($matches[1]);
    }
}

// Также проверяем переменную окружения (для ISPmanager)
if (empty($GITHUB_SECRET) || $GITHUB_SECRET === 'your-secret-key-change-me') {
    $GITHUB_SECRET = getenv('GITHUB_WEBHOOK_SECRET') ?: 'your-secret-key-change-me';
}

$ALLOWED_IPS = ['127.0.0.1', '::1']; // GitHub IPs (можно добавить конкретные)

// Логирование
$logFile = __DIR__ . '/logs/deploy.log';
$logDir = dirname($logFile);
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
}

function logMessage($message) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND);
    echo $logMessage;
}

// Проверка метода запроса
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    logMessage('ERROR: Only POST method allowed');
    die('Method not allowed');
}

// Получение заголовков
$headers = getallheaders();
$signature = $headers['X-Hub-Signature-256'] ?? '';
$event = $headers['X-GitHub-Event'] ?? '';

// Получение тела запроса
$payload = file_get_contents('php://input');
$data = json_decode($payload, true);

// Проверка подписи (если настроен секрет)
if ($GITHUB_SECRET && $GITHUB_SECRET !== 'your-secret-key-change-me') {
    $expectedSignature = 'sha256=' . hash_hmac('sha256', $payload, $GITHUB_SECRET);
    if (!hash_equals($expectedSignature, $signature)) {
        http_response_code(403);
        logMessage('ERROR: Invalid signature');
        die('Invalid signature');
    }
}

if ($event !== 'push') {
    http_response_code(200);
    logMessage("INFO: Ignoring event: $event");
    die('Event ignored');
}

// Проверка ветки
$branch = explode('/', $data['ref'] ?? '')[2] ?? '';
if ($branch !== 'main' && $branch !== 'master') {
    http_response_code(200);
    logMessage("INFO: Ignoring branch: $branch");
    die('Branch ignored');
}

logMessage("INFO: Deployment started for branch: $branch");

// Путь к проекту
$projectPath = __DIR__;

// Автоматическое определение путей к командам
function findCommand($command, $defaultPaths = []) {
    // Проверяем стандартные пути
    foreach ($defaultPaths as $path) {
        if (file_exists($path) && is_executable($path)) {
            return $path;
        }
    }
    // Пытаемся найти через which
    $found = trim(shell_exec("which $command 2>/dev/null"));
    if (!empty($found) && file_exists($found)) {
        return $found;
    }
    // Возвращаем команду как есть (надеемся, что она в PATH)
    return $command;
}

$gitPath = findCommand('git', ['/usr/bin/git', '/usr/local/bin/git']);
$npmPath = findCommand('npm', ['/usr/bin/npm', '/usr/local/bin/npm', '/opt/nodejs/bin/npm']);
$pm2Path = findCommand('pm2', ['/usr/local/bin/pm2', '/usr/bin/pm2', '/opt/nodejs/bin/pm2']);

logMessage("INFO: Using paths - git: $gitPath, npm: $npmPath, pm2: $pm2Path");

// Выполнение команд деплоя
try {
    // 1. Переход в директорию проекта
    chdir($projectPath);
    logMessage("INFO: Changed directory to: $projectPath");

    // 2. Git pull
    logMessage("INFO: Pulling latest changes...");
    $gitPull = exec("cd $projectPath && $gitPath pull origin $branch 2>&1", $output, $returnCode);
    logMessage("INFO: Git pull output: " . implode("\n", $output));
    
    if ($returnCode !== 0) {
        throw new Exception("Git pull failed with code: $returnCode");
    }

    // 3. Установка зависимостей
    logMessage("INFO: Installing dependencies...");
    $npmInstall = exec("cd $projectPath && $npmPath install --production --prefer-offline --no-audit 2>&1", $npmOutput, $npmReturnCode);
    logMessage("INFO: NPM install output: " . implode("\n", $npmOutput));
    
    if ($npmReturnCode !== 0) {
        logMessage("WARN: NPM install returned code: $npmReturnCode (continuing anyway)");
    }

    // 4. Перезапуск PM2
    logMessage("INFO: Restarting PM2 process...");
    $pm2Restart = exec("cd $projectPath && $pm2Path restart hrskipbot 2>&1", $pm2Output, $pm2ReturnCode);
    
    if ($pm2ReturnCode !== 0) {
        // Попытка запустить, если процесс не существует
        logMessage("INFO: PM2 restart failed, trying to start...");
        exec("cd $projectPath && $pm2Path start ecosystem.config.js 2>&1", $pm2StartOutput, $pm2StartReturnCode);
        logMessage("INFO: PM2 start output: " . implode("\n", $pm2StartOutput));
    } else {
        logMessage("INFO: PM2 restart output: " . implode("\n", $pm2Output));
    }

    // 5. Проверка статуса
    logMessage("INFO: Checking PM2 status...");
    exec("cd $projectPath && $pm2Path status 2>&1", $statusOutput, $statusReturnCode);
    logMessage("INFO: PM2 status: " . implode("\n", $statusOutput));

    logMessage("SUCCESS: Deployment completed successfully");
    
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Deployment completed',
        'branch' => $branch,
        'commit' => $data['head_commit']['id'] ?? 'unknown'
    ]);

} catch (Exception $e) {
    logMessage("ERROR: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
