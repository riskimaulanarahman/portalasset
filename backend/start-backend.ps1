$ErrorActionPreference = 'Stop'

Set-Location -LiteralPath $PSScriptRoot
$env:PATH = "D:\master\php85;$env:PATH"
$env:PHPRC = Join-Path $PSScriptRoot '.php85'

php --ini
php -m | Select-String -Pattern '^(pdo_mysql|pdo_sqlsrv|sqlsrv|ldap|mbstring)$'
php artisan config:cache
php artisan serve --host=127.0.0.1 --port=8000 --no-reload
