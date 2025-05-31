@echo off
powershell.exe -NoExit -ExecutionPolicy Bypass -Command "npx kill-port 5173; cd 'C:\Users\Usuario\Desktop\projetos\nexo-pedidos'; npm run dev"
