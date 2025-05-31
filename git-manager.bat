@echo off
title Git Manager - Nexo Pedidos [MANTENHA ABERTO]
color 0B

:MENU
cls
echo.
echo ===============================================
echo           GIT MANAGER - NEXO PEDIDOS
echo ===============================================
echo.
echo [1] Git Add + Commit + Push (Auto timestamp)
echo [2] Git Add + Commit + Push (Mensagem personalizada)
echo [3] Ver status do Git
echo [4] Ver historico de commits
echo [5] Sair
echo.
echo ===============================================
echo.

set /p opcao="Escolha uma opcao (1-5): "

if "%opcao%"=="1" goto AUTO_COMMIT
if "%opcao%"=="2" goto CUSTOM_COMMIT
if "%opcao%"=="3" goto GIT_STATUS
if "%opcao%"=="4" goto GIT_LOG
if "%opcao%"=="5" goto SAIR
goto MENU

:AUTO_COMMIT
cls
echo.
echo ===============================================
echo        COMMIT AUTOMATICO COM TIMESTAMP
echo ===============================================
echo.

echo Navegando para o projeto...
cd /d "C:\Users\Usuario\Desktop\projetos\nexo-pedidos"
if errorlevel 1 (
    echo ERRO: Nao foi possivel acessar o diretorio do projeto!
    pause
    goto MENU
)

echo.
echo Verificando alteracoes...
git status --porcelain > temp_status.txt
if %errorlevel% neq 0 (
    echo ERRO: Falha ao verificar status do Git!
    del temp_status.txt 2>nul
    pause
    goto MENU
)

for /f %%i in ("temp_status.txt") do set size=%%~zi
del temp_status.txt

if %size% equ 0 (
    echo.
    echo Nenhuma alteracao encontrada para commit!
    echo.
    pause
    goto MENU
)

echo Adicionando arquivos...
git add .
if errorlevel 1 (
    echo ERRO: Falha ao adicionar arquivos!
    pause
    goto MENU
)

echo.
echo Gerando timestamp...
for /f "tokens=1-6 delims=/:. " %%a in ("%date% %time%") do (
    set dia=%%a
    set mes=%%b
    set ano=%%c
    set hora=%%d
    set min=%%e
    set seg=%%f
)

set "timestamp=%dia%/%mes%/%ano% %hora%:%min%:%seg%"
set "commit_msg=Update: %timestamp%"

echo Fazendo commit com mensagem: %commit_msg%
git commit -m "%commit_msg%"
if errorlevel 1 (
    echo ERRO: Falha ao fazer commit!
    pause
    goto MENU
)

echo.
echo Fazendo push...
git push
if errorlevel 1 (
    echo ERRO: Falha ao fazer push!
    pause
    goto MENU
)

echo.
echo ===============================================
echo SUCESSO! Commit realizado com timestamp!
echo Mensagem: %commit_msg%
echo ===============================================
echo.
pause
goto MENU

:CUSTOM_COMMIT
cls
echo.
echo ===============================================
echo        COMMIT COM MENSAGEM PERSONALIZADA
echo ===============================================
echo.

echo Navegando para o projeto...
cd /d "C:\Users\Usuario\Desktop\projetos\nexo-pedidos"
if errorlevel 1 (
    echo ERRO: Nao foi possivel acessar o diretorio do projeto!
    pause
    goto MENU
)

echo.
echo Verificando alteracoes...
git status --porcelain > temp_status.txt
for /f %%i in ("temp_status.txt") do set size=%%~zi
del temp_status.txt

if %size% equ 0 (
    echo.
    echo Nenhuma alteracao encontrada para commit!
    echo.
    pause
    goto MENU
)

echo.
set /p "custom_msg=Digite sua mensagem de commit: "
if "%custom_msg%"=="" (
    echo Mensagem nao pode estar vazia!
    pause
    goto MENU
)

echo.
echo Adicionando arquivos...
git add .

echo Fazendo commit...
git commit -m "%custom_msg%"

echo Fazendo push...
git push

echo.
echo ===============================================
echo SUCESSO! Commit realizado!
echo Mensagem: %custom_msg%
echo ===============================================
echo.
pause
goto MENU

:GIT_STATUS
cls
echo.
echo ===============================================
echo              STATUS DO GIT
echo ===============================================
echo.

cd /d "C:\Users\Usuario\Desktop\projetos\nexo-pedidos"
git status

echo.
echo ===============================================
pause
goto MENU

:GIT_LOG
cls
echo.
echo ===============================================
echo           HISTORICO DE COMMITS
echo ===============================================
echo.

cd /d "C:\Users\Usuario\Desktop\projetos\nexo-pedidos"
git log --oneline -10

echo.
echo ===============================================
echo (Mostrando ultimos 10 commits)
pause
goto MENU

:SAIR
cls
echo.
echo Saindo do Git Manager...
echo Obrigado por usar!
timeout /t 2 >nul
exit
