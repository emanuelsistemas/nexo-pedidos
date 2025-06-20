-- =====================================================
-- FUNÇÕES AUXILIARES PARA TABELA NCM
-- =====================================================
-- Funções para facilitar consultas e validações NCM-CEST
-- =====================================================

-- =====================================================
-- FUNÇÃO: Buscar CEST por NCM
-- =====================================================
CREATE OR REPLACE FUNCTION buscar_cest_por_ncm(p_codigo_ncm VARCHAR(8))
RETURNS TABLE (
    codigo_cest VARCHAR(7),
    descricao_cest TEXT,
    especificacao_cest TEXT,
    categoria_st VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.codigo_cest,
        n.descricao_cest,
        n.especificacao_cest,
        n.categoria_st
    FROM ncm n
    WHERE n.codigo_ncm = p_codigo_ncm
      AND n.ativo = TRUE
      AND n.tem_substituicao_tributaria = TRUE
    ORDER BY n.codigo_cest;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: Verificar se NCM tem Substituição Tributária
-- =====================================================
CREATE OR REPLACE FUNCTION ncm_tem_substituicao_tributaria(p_codigo_ncm VARCHAR(8))
RETURNS BOOLEAN AS $$
DECLARE
    v_tem_st BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM ncm 
        WHERE codigo_ncm = p_codigo_ncm 
          AND tem_substituicao_tributaria = TRUE 
          AND ativo = TRUE
    ) INTO v_tem_st;
    
    RETURN v_tem_st;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: Validar correspondência NCM-CEST
-- =====================================================
CREATE OR REPLACE FUNCTION validar_ncm_cest(
    p_codigo_ncm VARCHAR(8),
    p_codigo_cest VARCHAR(7)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_valido BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM ncm 
        WHERE codigo_ncm = p_codigo_ncm 
          AND codigo_cest = p_codigo_cest
          AND ativo = TRUE
    ) INTO v_valido;
    
    RETURN v_valido;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: Buscar NCM por descrição (busca parcial)
-- =====================================================
CREATE OR REPLACE FUNCTION buscar_ncm_por_descricao(p_termo_busca TEXT)
RETURNS TABLE (
    codigo_ncm VARCHAR(8),
    descricao_ncm TEXT,
    tem_substituicao_tributaria BOOLEAN,
    categoria_st VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        n.codigo_ncm,
        n.descricao_ncm,
        n.tem_substituicao_tributaria,
        n.categoria_st
    FROM ncm n
    WHERE n.descricao_ncm ILIKE '%' || p_termo_busca || '%'
      AND n.ativo = TRUE
    ORDER BY n.codigo_ncm;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: Obter informações completas do NCM
-- =====================================================
CREATE OR REPLACE FUNCTION obter_info_ncm(p_codigo_ncm VARCHAR(8))
RETURNS TABLE (
    codigo_ncm VARCHAR(8),
    descricao_ncm TEXT,
    tem_substituicao_tributaria BOOLEAN,
    categoria_st VARCHAR(100),
    unidade_medida VARCHAR(10),
    observacoes TEXT,
    total_cest INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.codigo_ncm,
        n.descricao_ncm,
        n.tem_substituicao_tributaria,
        n.categoria_st,
        n.unidade_medida,
        n.observacoes,
        COUNT(CASE WHEN n.codigo_cest IS NOT NULL THEN 1 END)::INTEGER as total_cest
    FROM ncm n
    WHERE n.codigo_ncm = p_codigo_ncm
      AND n.ativo = TRUE
    GROUP BY n.codigo_ncm, n.descricao_ncm, n.tem_substituicao_tributaria, 
             n.categoria_st, n.unidade_medida, n.observacoes
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: Listar categorias de Substituição Tributária
-- =====================================================
CREATE OR REPLACE FUNCTION listar_categorias_st()
RETURNS TABLE (
    categoria_st VARCHAR(100),
    total_ncm INTEGER,
    total_cest INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.categoria_st,
        COUNT(DISTINCT n.codigo_ncm)::INTEGER as total_ncm,
        COUNT(n.codigo_cest)::INTEGER as total_cest
    FROM ncm n
    WHERE n.categoria_st IS NOT NULL
      AND n.ativo = TRUE
    GROUP BY n.categoria_st
    ORDER BY n.categoria_st;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: Buscar NCM por categoria ST
-- =====================================================
CREATE OR REPLACE FUNCTION buscar_ncm_por_categoria_st(p_categoria VARCHAR(100))
RETURNS TABLE (
    codigo_ncm VARCHAR(8),
    descricao_ncm TEXT,
    total_cest INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.codigo_ncm,
        n.descricao_ncm,
        COUNT(n.codigo_cest)::INTEGER as total_cest
    FROM ncm n
    WHERE n.categoria_st = p_categoria
      AND n.ativo = TRUE
    GROUP BY n.codigo_ncm, n.descricao_ncm
    ORDER BY n.codigo_ncm;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: Formatar código CEST (adicionar pontos)
-- =====================================================
CREATE OR REPLACE FUNCTION formatar_cest(p_codigo_cest VARCHAR(7))
RETURNS VARCHAR(9) AS $$
BEGIN
    IF p_codigo_cest IS NULL OR LENGTH(p_codigo_cest) != 7 THEN
        RETURN p_codigo_cest;
    END IF;

    -- Formato: 01.001.00
    RETURN SUBSTRING(p_codigo_cest, 1, 2) || '.' ||
           SUBSTRING(p_codigo_cest, 3, 3) || '.' ||
           SUBSTRING(p_codigo_cest, 6, 2);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: Buscar ou validar NCM via BrasilAPI
-- =====================================================
CREATE OR REPLACE FUNCTION buscar_ncm_completo(p_codigo_ncm VARCHAR(8))
RETURNS TABLE (
    codigo_ncm VARCHAR(8),
    descricao_ncm TEXT,
    tem_substituicao_tributaria BOOLEAN,
    fonte VARCHAR(20),
    cest_opcoes INTEGER
) AS $$
BEGIN
    -- Primeiro, buscar na tabela local
    RETURN QUERY
    SELECT DISTINCT
        n.codigo_ncm,
        n.descricao_ncm,
        n.tem_substituicao_tributaria,
        'LOCAL'::VARCHAR(20) as fonte,
        COUNT(n.codigo_cest)::INTEGER as cest_opcoes
    FROM ncm n
    WHERE n.codigo_ncm = p_codigo_ncm
      AND n.ativo = TRUE
    GROUP BY n.codigo_ncm, n.descricao_ncm, n.tem_substituicao_tributaria;

    -- Se não encontrou na tabela local, indicar que deve consultar BrasilAPI
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            p_codigo_ncm,
            'Consultar BrasilAPI'::TEXT,
            FALSE,
            'BRASILAPI'::VARCHAR(20),
            0::INTEGER;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: Adicionar NCM dinamicamente
-- =====================================================
CREATE OR REPLACE FUNCTION adicionar_ncm_dinamico(
    p_codigo_ncm VARCHAR(8),
    p_descricao_ncm TEXT,
    p_tem_st BOOLEAN DEFAULT FALSE,
    p_unidade_medida VARCHAR(10) DEFAULT 'UN'
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verificar se já existe
    IF EXISTS(SELECT 1 FROM ncm WHERE codigo_ncm = p_codigo_ncm) THEN
        RETURN FALSE; -- Já existe
    END IF;

    -- Inserir novo NCM
    INSERT INTO ncm (
        codigo_ncm,
        descricao_ncm,
        tem_substituicao_tributaria,
        unidade_medida,
        observacoes
    ) VALUES (
        p_codigo_ncm,
        p_descricao_ncm,
        p_tem_st,
        p_unidade_medida,
        'Adicionado dinamicamente via sistema'
    );

    RETURN TRUE; -- Sucesso
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: Remover formatação do CEST (remover pontos)
-- =====================================================
CREATE OR REPLACE FUNCTION limpar_cest(p_codigo_cest VARCHAR(9))
RETURNS VARCHAR(7) AS $$
BEGIN
    IF p_codigo_cest IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Remove pontos e espaços
    RETURN REPLACE(REPLACE(p_codigo_cest, '.', ''), ' ', '');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTÁRIOS NAS FUNÇÕES
-- =====================================================

COMMENT ON FUNCTION buscar_cest_por_ncm(VARCHAR) IS 'Retorna todos os CEST disponíveis para um NCM específico';
COMMENT ON FUNCTION ncm_tem_substituicao_tributaria(VARCHAR) IS 'Verifica se um NCM está sujeito à substituição tributária';
COMMENT ON FUNCTION validar_ncm_cest(VARCHAR, VARCHAR) IS 'Valida se a correspondência NCM-CEST é válida';
COMMENT ON FUNCTION buscar_ncm_por_descricao(TEXT) IS 'Busca NCM por termo na descrição (busca parcial)';
COMMENT ON FUNCTION obter_info_ncm(VARCHAR) IS 'Retorna informações completas de um NCM específico';
COMMENT ON FUNCTION listar_categorias_st() IS 'Lista todas as categorias de substituição tributária disponíveis';
COMMENT ON FUNCTION buscar_ncm_por_categoria_st(VARCHAR) IS 'Busca NCM por categoria de substituição tributária';
COMMENT ON FUNCTION formatar_cest(VARCHAR) IS 'Formata código CEST adicionando pontos (01.001.00)';
COMMENT ON FUNCTION limpar_cest(VARCHAR) IS 'Remove formatação do código CEST (pontos e espaços)';
