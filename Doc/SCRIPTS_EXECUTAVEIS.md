# Scripts Executáveis - Nexo Pedidos

Esta documentação contém os scripts para automatizar tarefas do projeto Nexo Pedidos.

## 📋 Índice

1. [Script de Inicialização do Projeto](#script-de-inicialização-do-projeto)
2. [Script de Git Manager](#script-de-git-manager)
3. [Como Usar](#como-usar)
4. [Solução de Problemas](#solução-de-problemas)

---

## 🚀 Script de Inicialização do Projeto

### Arquivo: `iniciar-nexo.bat`

```batch
@echo off
powershell.exe -NoExit -ExecutionPolicy Bypass -Command "npx kill-port 5173; cd 'C:\Users\Usuario\Desktop\projetos\nexo-pedidos'; npm run dev"
```

### Arquivo: `iniciar-nexo.ps1` (Alternativo)

```powershell
Write-Host "Matando processo na porta 5173..." -ForegroundColor Yellow
npx kill-port 5173

Write-Host "Navegando para o projeto..." -ForegroundColor Yellow
Set-Location "C:\Users\Usuario\Desktop\projetos\nexo-pedidos"

Write-Host "Iniciando servidor..." -ForegroundColor Green
Write-Host "MANTENHA ESTA JANELA ABERTA!" -ForegroundColor Red
Write-Host "Acesse: http://localhost:5173" -ForegroundColor Cyan

npm run dev
```

### O que faz:
- ✅ Mata qualquer processo rodando na porta 5173
- ✅ Navega para o diretório do projeto
- ✅ Inicia o servidor de desenvolvimento (Vite)
- ✅ Mantém a janela aberta

---

## 📝 Script de Git Manager

### Arquivo: `git-manager.bat`

```batch
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
```

### O que faz:
- ✅ Menu interativo com 5 opções
- ✅ Commit automático com timestamp (formato: Update: 15/12/2024 14:30:45)
- ✅ Commit com mensagem personalizada
- ✅ Visualizar status do Git
- ✅ Visualizar histórico de commits
- ✅ Loop infinito (volta ao menu após cada operação)

---

## 🛠️ Como Usar

### 1. Criar os Arquivos

#### Para o Script de Inicialização:
1. Abra o Bloco de Notas
2. Cole o conteúdo do `iniciar-nexo.bat`
3. Salve como `iniciar-nexo.bat` na área de trabalho
4. **IMPORTANTE**: Altere o caminho se necessário: `C:\Users\Usuario\Desktop\projetos\nexo-pedidos`

#### Para o Git Manager:
1. Abra o Bloco de Notas
2. Cole o conteúdo do `git-manager.bat`
3. Salve como `git-manager.bat` na área de trabalho
4. **IMPORTANTE**: Altere o caminho se necessário: `C:\Users\Usuario\Desktop\projetos\nexo-pedidos`

### 2. Executar

#### Script de Inicialização:
- Duplo clique em `iniciar-nexo.bat`
- **MANTENHA A JANELA ABERTA** para o servidor continuar funcionando
- Acesse: http://localhost:5173

#### Git Manager:
- Duplo clique em `git-manager.bat`
- Escolha a opção desejada (1-5)
- **MANTENHA A JANELA ABERTA** para usar múltiplas vezes

---

## 🔧 Solução de Problemas

### Problema: Arquivo .bat fecha imediatamente

**Solução 1**: Use o comando direto no PowerShell:
```powershell
npx kill-port 5173; cd "C:\Users\Usuario\Desktop\projetos\nexo-pedidos"; npm run dev
```

**Solução 2**: Execute como administrador

**Solução 3**: Verifique se o caminho do projeto está correto

### Problema: "npx não é reconhecido"

**Solução**: Instale o Node.js:
1. Acesse: https://nodejs.org
2. Baixe e instale a versão LTS
3. Reinicie o computador

### Problema: "git não é reconhecido"

**Solução**: Instale o Git:
1. Acesse: https://git-scm.com
2. Baixe e instale
3. Reinicie o computador

### Problema: Caminho do projeto não encontrado

**Solução**: Altere o caminho nos arquivos:
- Substitua `C:\Users\Usuario\Desktop\projetos\nexo-pedidos`
- Pelo caminho correto do seu projeto

---

## 📝 Personalização

### Alterar Caminho do Projeto

Nos arquivos, substitua:
```
C:\Users\Usuario\Desktop\projetos\nexo-pedidos
```

Pelo seu caminho, exemplo:
```
C:\MeusProjetos\nexo-pedidos
```

### Alterar Porta

Nos arquivos, substitua:
```
5173
```

Pela porta desejada, exemplo:
```
3000
```

---

## 🎯 Comandos Úteis

### Comando PowerShell Direto (Inicialização):
```powershell
npx kill-port 5173; cd "SEU_CAMINHO_AQUI"; npm run dev
```

### Comando PowerShell Direto (Git):
```powershell
cd "SEU_CAMINHO_AQUI"; git add .; git commit -m "Update: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')"; git push
```

---

**📅 Criado em**: Dezembro 2024  
**🔄 Última atualização**: Dezembro 2024  
**👨‍💻 Autor**: Augment Agent para Emanuel Luis
