@echo off
echo 🚀 Iniciando SSH Manager...
echo.

REM Ativar ambiente virtual
call venv\Scripts\activate.bat

REM Verificar se .env existe
if not exist .env (
    echo ❌ Arquivo .env não encontrado!
    echo 📝 Configure o arquivo .env com os dados da VPS primeiro.
    pause
    exit /b 1
)

echo ✅ Ambiente virtual ativado
echo 🌐 Iniciando servidor SSH Manager...
echo.
echo 📖 Acesse: http://localhost:5000
echo 🔧 Para parar: Ctrl+C
echo.

python ssh_manager.py
