Write-Host "Matando processo na porta 5173..." -ForegroundColor Yellow
npx kill-port 5173

Write-Host "Navegando para o projeto..." -ForegroundColor Yellow
Set-Location "C:\Users\Usuario\Desktop\projetos\nexo-pedidos"

Write-Host "Iniciando servidor..." -ForegroundColor Green
Write-Host "MANTENHA ESTA JANELA ABERTA!" -ForegroundColor Red
Write-Host "Acesse: http://localhost:5173" -ForegroundColor Cyan

npm run dev
