// ✅ BACKUP COMPLETO DA FUNÇÃO finalizarVendaCompleta
// Data: 26/07/2025 - Antes da implementação da baixa automática de insumos
// Status: Função funcionando após correção do problema com adicionais
// Próximo: Implementar baixa automática de insumos usando campo JSONB existente

// BACKUP CRIADO ANTES DE IMPLEMENTAR:
// - Baixa automática de insumos
// - Uso do campo produtos.insumos (JSONB)
// - Integração com função atualizar_estoque_produto() existente
// - Rastreabilidade com tipo 'consumo_insumo'

// ESTRUTURA DOS INSUMOS NO JSONB:
// [
//   {
//     "produto_id": "uuid-do-insumo",
//     "nome": "Nome do Insumo", 
//     "quantidade": 0.2,
//     "unidade_medida": "KG"
//   }
// ]

// IMPLEMENTAÇÃO PLANEJADA:
// 1. Buscar insumos do produto vendido (campo JSONB)
// 2. Calcular quantidade proporcional (insumo.quantidade × item.quantidade)
// 3. Dar baixa usando atualizar_estoque_produto() existente
// 4. Registrar como tipo 'consumo_insumo' para rastreabilidade

// LOCALIZAÇÃO DA IMPLEMENTAÇÃO:
// - Após a baixa de estoque dos produtos principais
// - Antes da finalização da venda
// - Dentro do bloco de controle de estoque existente
