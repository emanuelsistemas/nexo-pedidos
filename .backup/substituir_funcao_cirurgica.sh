#!/bin/bash

echo "🔧 Substituição cirúrgica da função finalizarVendaCompleta..."

# 1. Encontrar linha de início da função
LINHA_INICIO=$(grep -n "const finalizarVendaCompleta" src/pages/dashboard/PDVPage.tsx | cut -d: -f1)
echo "📍 Função inicia na linha: $LINHA_INICIO"

# 2. Encontrar linha de fim da função (procurar por }; após a linha de início)
LINHA_FIM=$(tail -n +$LINHA_INICIO src/pages/dashboard/PDVPage.tsx | grep -n "^  };" | head -1 | cut -d: -f1)
LINHA_FIM=$((LINHA_INICIO + LINHA_FIM - 1))
echo "📍 Função termina na linha: $LINHA_FIM"

# 3. Fazer backup do arquivo atual
cp src/pages/dashboard/PDVPage.tsx .backup/PDVPage_ANTES_SUBSTITUICAO.tsx
echo "💾 Backup criado: .backup/PDVPage_ANTES_SUBSTITUICAO.tsx"

# 4. Extrair parte ANTES da função
head -n $((LINHA_INICIO - 1)) src/pages/dashboard/PDVPage.tsx > /tmp/antes_funcao.txt

# 5. Adicionar a função funcional (com indentação correta)
echo "  // ✅ FUNÇÃO FUNCIONAL RESTAURADA (backup do commit funcionando)" >> /tmp/antes_funcao.txt
cat .backup/finalizarVendaCompleta_FUNCIONANDO_ATUAL.js >> /tmp/antes_funcao.txt

# 6. Extrair parte DEPOIS da função
tail -n +$((LINHA_FIM + 1)) src/pages/dashboard/PDVPage.tsx > /tmp/depois_funcao.txt

# 7. Juntar tudo
cat /tmp/antes_funcao.txt /tmp/depois_funcao.txt > src/pages/dashboard/PDVPage.tsx

echo "✅ Função substituída com sucesso!"
echo "📊 Verificando tamanho do arquivo..."
wc -l src/pages/dashboard/PDVPage.tsx

# Limpar arquivos temporários
rm -f /tmp/antes_funcao.txt /tmp/depois_funcao.txt

echo "🎯 Substituição cirúrgica concluída!"
