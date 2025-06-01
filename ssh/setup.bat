@echo off
echo 🚀 Configurando SSH Manager para VPS...
echo.

REM Verificar se Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python não encontrado. Instale Python 3.8+ primeiro.
    pause
    exit /b 1
)

echo ✅ Python encontrado

REM Criar ambiente virtual
echo 📦 Criando ambiente virtual...
python -m venv venv

REM Ativar ambiente virtual
echo 🔧 Ativando ambiente virtual...
call venv\Scripts\activate.bat

REM Instalar dependências
echo 📥 Instalando dependências...
pip install -r requirements.txt

echo.
echo ✅ Setup concluído!
echo.
echo 📋 Próximos passos:
echo 1. Edite o arquivo .env com os dados da sua VPS
echo 2. Execute: start.bat
echo.
pause
