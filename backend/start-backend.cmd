@echo off
cd /d "%~dp0"
set "PATH=D:\master\php85;%PATH%"
set "PHPRC=%~dp0.php85"
php --ini
php -m | findstr /i "pdo_mysql pdo_sqlsrv sqlsrv ldap mbstring"
php artisan config:cache
php artisan serve --host=127.0.0.1 --port=8000 --no-reload
