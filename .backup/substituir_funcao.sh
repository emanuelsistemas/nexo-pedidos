#!/bin/bash

# Script para substituir a função finalizarVendaCompleta problemática pela funcional

echo "🔧 Substituindo função finalizarVendaCompleta..."

# 1. Extrair parte ANTES da função (linhas 1-9065)
head -n 9065 src/pages/dashboard/PDVPage.tsx > /tmp/antes_funcao.txt

# 2. Adicionar a função funcional
echo "  // ✅ FUNÇÃO FUNCIONAL RESTAURADA (sem problemas de baixa de insumos)" >> /tmp/antes_funcao.txt
echo "  // Extraída do commit: d6797d075756ff67a0d01c1325999bfd3ff2423d" >> /tmp/antes_funcao.txt
cat .backup/finalizarVendaCompleta_COMPLETA.js >> /tmp/antes_funcao.txt

# 3. Extrair parte DEPOIS da função (a partir da linha 10562)
tail -n +10562 src/pages/dashboard/PDVPage.tsx > /tmp/depois_funcao.txt

# 4. Juntar tudo
cat /tmp/antes_funcao.txt /tmp/depois_funcao.txt > src/pages/dashboard/PDVPage.tsx

echo "✅ Função substituída com sucesso!"
echo "📊 Verificando tamanho do arquivo..."
wc -l src/pages/dashboard/PDVPage.tsx

# Limpar arquivos temporários
rm -f /tmp/antes_funcao.txt /tmp/depois_funcao.txt

echo "🎯 Substituição concluída!"
