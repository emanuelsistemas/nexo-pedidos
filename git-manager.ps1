# Configurar console
$Host.UI.RawUI.WindowTitle = "Git Manager - Nexo Pedidos [MANTENHA ABERTO]"
$projectPath = "C:\Users\Usuario\Desktop\projetos\nexo-pedidos"

function Show-Menu {
    Clear-Host
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host "           GIT MANAGER - NEXO PEDIDOS" -ForegroundColor Cyan
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "[1] Git Add + Commit + Push (Auto timestamp)" -ForegroundColor Green
    Write-Host "[2] Git Add + Commit + Push (Mensagem personalizada)" -ForegroundColor Green
    Write-Host "[3] Ver status do Git" -ForegroundColor Yellow
    Write-Host "[4] Ver historico de commits" -ForegroundColor Yellow
    Write-Host "[5] Sair" -ForegroundColor Red
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host ""
}

function Test-GitRepository {
    if (-not (Test-Path $projectPath)) {
        Write-Host "ERRO: Diretorio do projeto nao encontrado!" -ForegroundColor Red
        Write-Host "Caminho: $projectPath" -ForegroundColor Red
        return $false
    }
    
    Set-Location $projectPath
    
    if (-not (Test-Path ".git")) {
        Write-Host "ERRO: Nao e um repositorio Git!" -ForegroundColor Red
        return $false
    }
    
    return $true
}

function Get-GitStatus {
    try {
        $status = git status --porcelain 2>$null
        return $status
    } catch {
        return $null
    }
}

function Auto-Commit {
    Clear-Host
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host "        COMMIT AUTOMATICO COM TIMESTAMP" -ForegroundColor Cyan
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host ""
    
    if (-not (Test-GitRepository)) {
        Read-Host "Pressione Enter para continuar"
        return
    }
    
    Write-Host "Verificando alteracoes..." -ForegroundColor Yellow
    $changes = Get-GitStatus
    
    if (-not $changes -or $changes.Count -eq 0) {
        Write-Host ""
        Write-Host "Nenhuma alteracao encontrada para commit!" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Pressione Enter para continuar"
        return
    }
    
    Write-Host "Alteracoes encontradas:" -ForegroundColor Green
    $changes | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    Write-Host ""
    
    Write-Host "Adicionando arquivos..." -ForegroundColor Yellow
    git add .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: Falha ao adicionar arquivos!" -ForegroundColor Red
        Read-Host "Pressione Enter para continuar"
        return
    }
    
    # Gerar timestamp
    $timestamp = Get-Date -Format "dd/MM/yyyy HH:mm:ss"
    $commitMsg = "Update: $timestamp"
    
    Write-Host "Fazendo commit com mensagem: $commitMsg" -ForegroundColor Yellow
    git commit -m $commitMsg
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: Falha ao fazer commit!" -ForegroundColor Red
        Read-Host "Pressione Enter para continuar"
        return
    }
    
    Write-Host ""
    Write-Host "Fazendo push..." -ForegroundColor Yellow
    git push
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: Falha ao fazer push!" -ForegroundColor Red
        Read-Host "Pressione Enter para continuar"
        return
    }
    
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host "SUCESSO! Commit realizado com timestamp!" -ForegroundColor Green
    Write-Host "Mensagem: $commitMsg" -ForegroundColor Green
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host ""
    Read-Host "Pressione Enter para continuar"
}

function Custom-Commit {
    Clear-Host
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host "        COMMIT COM MENSAGEM PERSONALIZADA" -ForegroundColor Cyan
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host ""
    
    if (-not (Test-GitRepository)) {
        Read-Host "Pressione Enter para continuar"
        return
    }
    
    Write-Host "Verificando alteracoes..." -ForegroundColor Yellow
    $changes = Get-GitStatus
    
    if (-not $changes -or $changes.Count -eq 0) {
        Write-Host ""
        Write-Host "Nenhuma alteracao encontrada para commit!" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Pressione Enter para continuar"
        return
    }
    
    Write-Host "Alteracoes encontradas:" -ForegroundColor Green
    $changes | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    Write-Host ""
    
    $customMsg = Read-Host "Digite sua mensagem de commit"
    
    if ([string]::IsNullOrWhiteSpace($customMsg)) {
        Write-Host "Mensagem nao pode estar vazia!" -ForegroundColor Red
        Read-Host "Pressione Enter para continuar"
        return
    }
    
    Write-Host ""
    Write-Host "Adicionando arquivos..." -ForegroundColor Yellow
    git add .
    
    Write-Host "Fazendo commit..." -ForegroundColor Yellow
    git commit -m $customMsg
    
    Write-Host "Fazendo push..." -ForegroundColor Yellow
    git push
    
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host "SUCESSO! Commit realizado!" -ForegroundColor Green
    Write-Host "Mensagem: $customMsg" -ForegroundColor Green
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host ""
    Read-Host "Pressione Enter para continuar"
}

function Show-GitStatus {
    Clear-Host
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host "              STATUS DO GIT" -ForegroundColor Cyan
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host ""
    
    if (-not (Test-GitRepository)) {
        Read-Host "Pressione Enter para continuar"
        return
    }
    
    git status
    
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Cyan
    Read-Host "Pressione Enter para continuar"
}

function Show-GitLog {
    Clear-Host
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host "           HISTORICO DE COMMITS" -ForegroundColor Cyan
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host ""
    
    if (-not (Test-GitRepository)) {
        Read-Host "Pressione Enter para continuar"
        return
    }
    
    git log --oneline -10
    
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host "(Mostrando ultimos 10 commits)" -ForegroundColor Gray
    Read-Host "Pressione Enter para continuar"
}

# Loop principal
do {
    Show-Menu
    $opcao = Read-Host "Escolha uma opcao (1-5)"
    
    switch ($opcao) {
        "1" { Auto-Commit }
        "2" { Custom-Commit }
        "3" { Show-GitStatus }
        "4" { Show-GitLog }
        "5" { 
            Clear-Host
            Write-Host ""
            Write-Host "Saindo do Git Manager..." -ForegroundColor Yellow
            Write-Host "Obrigado por usar!" -ForegroundColor Green
            Start-Sleep -Seconds 2
            exit 
        }
        default { 
            Write-Host "Opcao invalida! Pressione Enter para tentar novamente." -ForegroundColor Red
            Read-Host
        }
    }
} while ($true)
