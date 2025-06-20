-- =====================================================
-- EXEMPLOS DE USO DA TABELA NCM
-- =====================================================
-- Consultas úteis para implementação no sistema NFe
-- =====================================================

-- =====================================================
-- 1. BUSCAR TODOS OS CEST PARA UM NCM ESPECÍFICO
-- =====================================================
-- Exemplo: NCM 22021000 (Águas minerais)

SELECT 
    codigo_cest,
    descricao_cest,
    especificacao_cest
FROM buscar_cest_por_ncm('22021000');

-- Resultado esperado: 7 registros com diferentes CEST para água mineral

-- =====================================================
-- 2. VERIFICAR SE NCM TEM SUBSTITUIÇÃO TRIBUTÁRIA
-- =====================================================

SELECT ncm_tem_substituicao_tributaria('22021000') as tem_st; -- TRUE
SELECT ncm_tem_substituicao_tributaria('20089900') as tem_st; -- FALSE

-- =====================================================
-- 3. VALIDAR CORRESPONDÊNCIA NCM-CEST
-- =====================================================

SELECT validar_ncm_cest('22021000', '03.001.00') as valido; -- TRUE
SELECT validar_ncm_cest('22021000', '01.001.00') as valido; -- FALSE (CEST de autopeças)

-- =====================================================
-- 4. BUSCAR NCM POR DESCRIÇÃO
-- =====================================================

SELECT * FROM buscar_ncm_por_descricao('água mineral');
SELECT * FROM buscar_ncm_por_descricao('cerveja');
SELECT * FROM buscar_ncm_por_descricao('medicamento');

-- =====================================================
-- 5. OBTER INFORMAÇÕES COMPLETAS DE UM NCM
-- =====================================================

SELECT * FROM obter_info_ncm('22021000');

-- =====================================================
-- 6. LISTAR TODAS AS CATEGORIAS DE ST DISPONÍVEIS
-- =====================================================

SELECT * FROM listar_categorias_st();

-- =====================================================
-- 7. BUSCAR NCM POR CATEGORIA DE ST
-- =====================================================

SELECT * FROM buscar_ncm_por_categoria_st('CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS');
SELECT * FROM buscar_ncm_por_categoria_st('AUTOPEÇAS');

-- =====================================================
-- 8. CONSULTAS DIRETAS NA TABELA
-- =====================================================

-- Todos os NCM com substituição tributária
SELECT DISTINCT codigo_ncm, descricao_ncm, categoria_st
FROM ncm 
WHERE tem_substituicao_tributaria = TRUE
ORDER BY categoria_st, codigo_ncm;

-- Todos os CEST de uma categoria específica
SELECT codigo_ncm, codigo_cest, descricao_cest, especificacao_cest
FROM ncm 
WHERE categoria_st = 'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS'
  AND codigo_cest IS NOT NULL
ORDER BY codigo_ncm, codigo_cest;

-- NCM sem substituição tributária
SELECT codigo_ncm, descricao_ncm
FROM ncm 
WHERE tem_substituicao_tributaria = FALSE
ORDER BY codigo_ncm;

-- =====================================================
-- 9. CONSULTAS PARA INTERFACE DO USUÁRIO
-- =====================================================

-- Para dropdown de NCM (com indicação de ST)
SELECT 
    codigo_ncm,
    descricao_ncm,
    tem_substituicao_tributaria,
    CASE 
        WHEN tem_substituicao_tributaria THEN ' (ST)'
        ELSE ''
    END as indicador_st
FROM ncm 
WHERE ativo = TRUE
GROUP BY codigo_ncm, descricao_ncm, tem_substituicao_tributaria
ORDER BY codigo_ncm;

-- Para dropdown de CEST baseado no NCM selecionado
SELECT 
    codigo_cest,
    CONCAT(codigo_cest, ' - ', descricao_cest, 
           CASE 
               WHEN especificacao_cest IS NOT NULL 
               THEN ' (' || especificacao_cest || ')'
               ELSE ''
           END
    ) as descricao_completa
FROM ncm 
WHERE codigo_ncm = '22021000' -- Parâmetro do NCM selecionado
  AND codigo_cest IS NOT NULL
  AND ativo = TRUE
ORDER BY codigo_cest;

-- =====================================================
-- 10. CONSULTAS PARA VALIDAÇÃO NA EMISSÃO NFe
-- =====================================================

-- Validar se produto precisa de CEST
SELECT 
    CASE 
        WHEN ncm_tem_substituicao_tributaria('22021000') THEN 
            'CEST obrigatório para este NCM'
        ELSE 
            'CEST não necessário'
    END as validacao;

-- Obter dados para validação SEFAZ
SELECT 
    n.codigo_ncm,
    n.codigo_cest,
    n.categoria_st,
    n.tem_substituicao_tributaria
FROM ncm n
WHERE n.codigo_ncm = '22021000' -- NCM do produto
  AND n.codigo_cest = '03.001.00' -- CEST informado
  AND n.ativo = TRUE;

-- =====================================================
-- 11. RELATÓRIOS E ESTATÍSTICAS
-- =====================================================

-- Estatísticas gerais da tabela
SELECT 
    COUNT(DISTINCT codigo_ncm) as total_ncm,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN tem_substituicao_tributaria THEN 1 END) as registros_com_st,
    COUNT(CASE WHEN NOT tem_substituicao_tributaria THEN 1 END) as registros_sem_st,
    COUNT(DISTINCT categoria_st) as total_categorias_st
FROM ncm 
WHERE ativo = TRUE;

-- NCM com mais opções de CEST
SELECT 
    codigo_ncm,
    descricao_ncm,
    COUNT(codigo_cest) as total_cest
FROM ncm 
WHERE codigo_cest IS NOT NULL
  AND ativo = TRUE
GROUP BY codigo_ncm, descricao_ncm
ORDER BY total_cest DESC, codigo_ncm
LIMIT 10;

-- Distribuição por categoria de ST
SELECT 
    categoria_st,
    COUNT(DISTINCT codigo_ncm) as ncm_distintos,
    COUNT(codigo_cest) as total_cest
FROM ncm 
WHERE categoria_st IS NOT NULL
  AND ativo = TRUE
GROUP BY categoria_st
ORDER BY ncm_distintos DESC;

-- =====================================================
-- 12. MANUTENÇÃO E LIMPEZA
-- =====================================================

-- Verificar inconsistências
SELECT 
    codigo_ncm,
    tem_substituicao_tributaria,
    COUNT(codigo_cest) as cest_count
FROM ncm 
GROUP BY codigo_ncm, tem_substituicao_tributaria
HAVING (tem_substituicao_tributaria = TRUE AND COUNT(codigo_cest) = 0)
    OR (tem_substituicao_tributaria = FALSE AND COUNT(codigo_cest) > 0);

-- Verificar duplicatas
SELECT 
    codigo_ncm,
    codigo_cest,
    COUNT(*) as duplicatas
FROM ncm 
WHERE codigo_cest IS NOT NULL
GROUP BY codigo_ncm, codigo_cest
HAVING COUNT(*) > 1;

-- =====================================================
-- 13. EXEMPLOS DE FORMATAÇÃO
-- =====================================================

-- Formatar CEST com pontos
SELECT 
    codigo_ncm,
    codigo_cest,
    formatar_cest(codigo_cest) as cest_formatado
FROM ncm 
WHERE codigo_cest IS NOT NULL
LIMIT 5;

-- Limpar formatação do CEST
SELECT 
    limpar_cest('03.001.00') as cest_limpo, -- Resultado: 0300100
    limpar_cest('03001.00') as cest_limpo2; -- Resultado: 0300100
