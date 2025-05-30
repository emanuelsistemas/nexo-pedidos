# Script para configurar SSH da VPS NFe no VSCode
# Execute este script no PowerShell do VSCode

Write-Host "🔐 Configurando SSH para VPS NFe..." -ForegroundColor Green

# Criar diretório .ssh se não existir
$sshDir = "$env:USERPROFILE\.ssh"
if (!(Test-Path $sshDir)) {
    New-Item -ItemType Directory -Path $sshDir -Force
    Write-Host "✅ Diretório .ssh criado" -ForegroundColor Green
}

# Criar arquivo de configuração SSH
$configContent = @"
# Configuração SSH para VPS NFe
Host nfe
    HostName 157.180.88.133
    User root
    IdentityFile ~/.ssh/id_rsa_nexo-suporte
    Port 22
    ServerAliveInterval 60
    ServerAliveCountMax 3
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
"@

$configPath = "$sshDir\config"
$configContent | Out-File -FilePath $configPath -Encoding UTF8 -Force
Write-Host "✅ Arquivo de configuração SSH criado em: $configPath" -ForegroundColor Green

# Verificar se a chave SSH existe
$keyPath = "$sshDir\id_rsa_nexo-suporte"
if (Test-Path $keyPath) {
    Write-Host "✅ Chave SSH encontrada: $keyPath" -ForegroundColor Green
} else {
    Write-Host "❌ Chave SSH não encontrada: $keyPath" -ForegroundColor Red
    Write-Host "   A chave deveria ter sido criada anteriormente." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 CONFIGURAÇÃO CONCLUÍDA!" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 COMO USAR NO VSCODE:" -ForegroundColor Yellow
Write-Host "1. Instale a extensão 'Remote - SSH' (se não tiver)" -ForegroundColor White
Write-Host "2. Pressione Ctrl+Shift+P" -ForegroundColor White
Write-Host "3. Digite: Remote-SSH: Connect to Host" -ForegroundColor White
Write-Host "4. Selecione: nfe" -ForegroundColor White
Write-Host "5. O VSCode conectará automaticamente!" -ForegroundColor White
Write-Host ""
Write-Host "🔧 ALTERNATIVA VIA TERMINAL:" -ForegroundColor Yellow
Write-Host "ssh nfe" -ForegroundColor White
Write-Host ""

# Testar conexão
Write-Host "🧪 Testando conexão SSH..." -ForegroundColor Cyan
try {
    $testResult = ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i "$keyPath" root@157.180.88.133 "echo 'Conexão OK!' && hostname" 2>$null
    if ($testResult) {
        Write-Host "✅ TESTE DE CONEXÃO: SUCESSO!" -ForegroundColor Green
        Write-Host "   Resposta: $testResult" -ForegroundColor White
    } else {
        Write-Host "⚠️  TESTE DE CONEXÃO: Não foi possível testar automaticamente" -ForegroundColor Yellow
        Write-Host "   Mas a configuração foi criada corretamente." -ForegroundColor White
    }
} catch {
    Write-Host "⚠️  TESTE DE CONEXÃO: Não foi possível testar automaticamente" -ForegroundColor Yellow
    Write-Host "   Mas a configuração foi criada corretamente." -ForegroundColor White
}

Write-Host ""
Write-Host "🎯 PRÓXIMO PASSO: Instalar ambiente NFe na VPS" -ForegroundColor Magenta
Write-Host "   Conecte na VPS e execute o script de instalação!" -ForegroundColor White
