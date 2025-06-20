-- =====================================================
-- SCRIPT PARA POPULAR TABELA NCM NO SUPABASE
-- =====================================================
-- Execute este script diretamente no SQL Editor do Supabase
-- Popula a tabela NCM com dados das tabelas ncm.sql e cest.sql
-- =====================================================

-- 1. LIMPAR TABELA EXISTENTE
TRUNCATE TABLE ncm RESTART IDENTITY CASCADE;

-- 2. CRIAR TABELA TEMPORÁRIA PARA DADOS NCM
CREATE TEMP TABLE temp_ncm_data (
    codigo_ncm VARCHAR(8),
    descricao_ncm TEXT
);

-- 3. CRIAR TABELA TEMPORÁRIA PARA DADOS CEST
CREATE TEMP TABLE temp_cest_data (
    codigo_cest VARCHAR(7),
    codigo_ncm VARCHAR(8),
    descricao_cest TEXT
);

-- 4. INSERIR DADOS NCM (PRIMEIROS 50 REGISTROS COMO EXEMPLO)
INSERT INTO temp_ncm_data (codigo_ncm, descricao_ncm) VALUES
('99910000', 'ENCOMENDAS POSTAIS'),
('99920000', 'AMOSTRAS'),
('99970000', 'MERCADORIAS DOADAS'),
('99997101', 'PEDRAS EM BRUTO DO CAPITULO 71 DA NCM'),
('99997102', 'PEDRAS LAPIDADAS/TRABALHADAS DO CAPITULO 71 DA NCM'),
('99997103', 'JOALHERIA DE OURO DO CAPITULO 71 DA NCM'),
('99997104', 'OUTROS ARTIGOS DO CAPITULO 71 DA NCM'),
('99980101', 'CONSUMO DE BORDO - COMBUSTIVEIS E LUBRIFP/EMBARCAC'),
('99980102', 'CONSUMO DE BORDO - COMBUSTIVEIS E LUBRIFP/AERONAVE'),
('99980201', 'CONSUMO DE BORDO - QQOUTRA MERCADORIA P/EMBARCACOE'),
('99980202', 'CONSUMO DE BORDO - QQOUTRA MERCADORIA P/AERONAVES'),
('99999900', 'QQOUTRA MERCADORIA SEM COBERTURA CAMBIAL'),
('01011100', 'CAVALOS REPRODUTORES,DE RACA PURA'),
('01011900', 'OUTROS CAVALOS,VIVOS'),
('01012000', 'ASININOS E MUARES VIVOS'),
('01021090', 'OUTROS BOVINOS REPRODUTORES DE RACA PURA'),
('01021010', 'BOVINOS REPRODUTORES DE RACA PURA,PRENHE OU CRIA A'),
('01029011', 'OUTROS BOVINOS PARA REPRODUCAO,PRENHE OU COM CRIA'),
('01029019', 'OUTROS BOVINOS PARA REPRODUCAO'),
('01029090', 'OUTROS BOVINOS VIVOS'),
('22021000', 'Águas, incluindo as águas minerais e as águas gaseificadas, adicionadas de açúcar ou de outros edulcorantes ou aromatizadas'),
('22030000', 'Cerveja de malte'),
('22029000', 'Outras bebidas não alcoólicas, exceto sucos de frutas ou de produtos hortícolas da posição 20.09'),
('22071000', 'Álcool etílico não desnaturado, com um teor alcoólico em volume igual ou superior a 80% vol'),
('27102000', 'Óleos de petróleo ou de minerais betuminosos (exceto óleos brutos) e preparações'),
('38151210', 'Catalisadores em colmeia cerâmica ou metálica para conversão catalítica de gases de escape de veículos'),
('38151290', 'Outros catalisadores'),
('39170000', 'Tubos e seus acessórios de plásticos'),
('39181000', 'Protetores de caçamba'),
('39233000', 'Reservatórios de óleo'),
('39263000', 'Frisos, decalques, molduras e acabamentos'),
('40103000', 'Correias de transmissão de borracha vulcanizada'),
('59100000', 'Correias de transmissão de matérias têxteis'),
('40169300', 'Juntas, gaxetas e outros elementos com função semelhante de vedação'),
('48239090', 'Juntas, gaxetas e outros elementos com função semelhante de vedação de papel'),
('40161010', 'Partes de veículos automóveis, tratores e máquinas autopropulsadas'),
('40169990', 'Tapetes, revestimentos, mesmo confeccionados, batentes, buchas e coxins'),
('57050000', 'Tapetes, revestimentos de matérias têxteis'),
('59039000', 'Tecidos impregnados, revestidos, recobertos ou estratificados, com plástico'),
('59090000', 'Mangueiras e tubos semelhantes, de matérias têxteis'),
('63061000', 'Encerados e toldos'),
('65061000', 'Capacetes e artefatos de uso semelhante, de proteção'),
('68130000', 'Guarnições de fricção para freios, embreagens ou qualquer outro mecanismo de fricção'),
('70071100', 'Vidros de dimensões e formatos que permitam aplicação automotiva - temperados'),
('70072100', 'Vidros de dimensões e formatos que permitam aplicação automotiva - laminados'),
('70091000', 'Espelhos retrovisores'),
('70140000', 'Lentes de faróis, lanternas e outros utensílios'),
('73110000', 'Recipientes para gases comprimidos ou liquefeitos, de ferro fundido, ferro ou aço'),
('73200000', 'Molas e folhas de molas, de ferro ou aço'),
('73250000', 'Obras moldadas, de ferro fundido, ferro ou aço'),
('78060000', 'Peso de chumbo para balanceamento de roda'),
('80070090', 'Peso para balanceamento de roda e outros utensílios de estanho'),
('83012000', 'Fechaduras e partes de fechaduras'),
('83016000', 'Fechaduras e partes de fechaduras'),
('83017000', 'Chaves apresentadas isoladamente');

-- 5. INSERIR DADOS CEST (PRINCIPAIS CORRESPONDÊNCIAS)
INSERT INTO temp_cest_data (codigo_cest, codigo_ncm, descricao_cest) VALUES
('0100100', '38151210', 'Catalisadores em colmeia cerâmica ou metálica para conversão catalítica de gases de escape de veículos e outros catalizadores'),
('0100100', '38151290', 'Catalisadores em colmeia cerâmica ou metálica para conversão catalítica de gases de escape de veículos e outros catalizadores'),
('0100200', '39170000', 'Tubos e seus acessórios (por exemplo, juntas, cotovelos, flanges, uniões), de plásticos'),
('0100300', '39181000', 'Protetores de caçamba'),
('0100400', '39233000', 'Reservatórios de óleo'),
('0100500', '39263000', 'Frisos, decalques, molduras e acabamentos'),
('0100600', '40103000', 'Correias de transmissão de borracha vulcanizada'),
('0100600', '59100000', 'Correias de transmissão de matérias têxteis'),
('0100700', '40169300', 'Juntas, gaxetas e outros elementos com função semelhante de vedação'),
('0100700', '48239090', 'Juntas, gaxetas e outros elementos com função semelhante de vedação'),
('0100800', '40161010', 'Partes de veículos automóveis, tratores e máquinas autopropulsadas'),
('0100900', '40169990', 'Tapetes, revestimentos, mesmo confeccionados, batentes, buchas e coxins'),
('0100900', '57050000', 'Tapetes, revestimentos de matérias têxteis'),
('0101000', '59039000', 'Tecidos impregnados, revestidos, recobertos ou estratificados, com plástico'),
('0101100', '59090000', 'Mangueiras e tubos semelhantes, de matérias têxteis'),
('0101200', '63061000', 'Encerados e toldos'),
('0101300', '65061000', 'Capacetes e artefatos de uso semelhante, de proteção'),
('0101400', '68130000', 'Guarnições de fricção para freios, embreagens'),
('0101500', '70071100', 'Vidros de dimensões e formatos que permitam aplicação automotiva'),
('0101500', '70072100', 'Vidros de dimensões e formatos que permitam aplicação automotiva'),
('0101600', '70091000', 'Espelhos retrovisores'),
('0101700', '70140000', 'Lentes de faróis, lanternas e outros utensílios'),
('0101800', '73110000', 'Cilindro de aço para GNV (gás natural veicular)'),
('0300100', '22021000', 'Água mineral, gasosa ou não, ou potável, naturais, em garrafa de vidro até 500ml'),
('0300200', '22021000', 'Água mineral, gasosa ou não, ou potável, naturais, em embalagem >= 5000ml'),
('0300300', '22021000', 'Água mineral, gasosa ou não, ou potável, naturais, em embalagem de vidro não retornável até 300ml'),
('0300400', '22021000', 'Água mineral, gasosa ou não, ou potável, naturais, em garrafa plástica de 1500ml'),
('0300500', '22021000', 'Água mineral, gasosa ou não, ou potável, naturais, em copos plásticos até 500ml'),
('0300600', '22021000', 'Outras águas minerais, gasosa ou não, ou potável, naturais'),
('0301200', '22030000', 'Cerveja'),
('0301300', '22029000', 'Cerveja sem álcool'),
('0301400', '22030000', 'Chope'),
('0600100', '22071000', 'Álcool etílico não desnaturado combustível'),
('0601200', '27102000', 'Óleos de petróleo que contenham biodiesel');

-- 6. FUNÇÃO PARA DETERMINAR CATEGORIA ST
CREATE OR REPLACE FUNCTION determinar_categoria_st(segmento TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE segmento
        WHEN '01' THEN 'AUTOPEÇAS'
        WHEN '02' THEN 'BEBIDAS ALCOÓLICAS'
        WHEN '03' THEN 'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS'
        WHEN '04' THEN 'CIGARROS E OUTROS PRODUTOS DERIVADOS DO FUMO'
        WHEN '05' THEN 'CIMENTO'
        WHEN '06' THEN 'COMBUSTÍVEIS E LUBRIFICANTES'
        WHEN '07' THEN 'ENERGIA ELÉTRICA'
        WHEN '08' THEN 'FERRAMENTAS'
        WHEN '09' THEN 'LÂMPADAS, REATORES E STARTER'
        WHEN '10' THEN 'MATERIAIS DE CONSTRUÇÃO E CONGÊNERES'
        WHEN '11' THEN 'MATERIAIS DE LIMPEZA'
        WHEN '12' THEN 'MATERIAIS ELÉTRICOS'
        WHEN '13' THEN 'MEDICAMENTOS DE USO HUMANO E OUTROS PRODUTOS FARMACÊUTICOS'
        WHEN '14' THEN 'MEDICAMENTOS DE USO VETERINÁRIO'
        WHEN '15' THEN 'PAPÉIS, PLÁSTICOS, PRODUTOS CERÂMICOS E VIDROS'
        WHEN '16' THEN 'PNEUMÁTICOS, CÂMARAS DE AR E PROTETORES DE BORRACHA'
        WHEN '17' THEN 'PRODUTOS ALIMENTÍCIOS'
        WHEN '18' THEN 'PRODUTOS DE PAPELARIA'
        WHEN '19' THEN 'PRODUTOS ELETRÔNICOS, ELETROELETRÔNICOS E ELETRODOMÉSTICOS'
        WHEN '20' THEN 'PRODUTOS DE PERFUMARIA E DE HIGIENE PESSOAL E COSMÉTICOS'
        WHEN '21' THEN 'PRODUTOS ELETRÔNICOS, ELETROELETRÔNICOS E ELETRODOMÉSTICOS'
        WHEN '22' THEN 'RAÇÕES PARA ANIMAIS DOMÉSTICOS'
        WHEN '23' THEN 'SORVETES E PREPARADOS PARA FABRICAÇÃO DE SORVETES EM MÁQUINAS'
        WHEN '24' THEN 'TINTAS E VERNIZES'
        WHEN '25' THEN 'VEÍCULOS AUTOMOTORES'
        WHEN '26' THEN 'MOTOCICLETAS'
        WHEN '27' THEN 'PRODUTOS DE VIDRO'
        WHEN '28' THEN 'PRODUTOS DE PERFUMARIA, DE HIGIENE PESSOAL E COSMÉTICOS'
        ELSE 'OUTROS PRODUTOS'
    END;
END;
$$ LANGUAGE plpgsql;

-- 7. INSERIR NCM SEM CEST (PRODUTOS SEM SUBSTITUIÇÃO TRIBUTÁRIA)
INSERT INTO ncm (
    codigo_ncm, descricao_ncm, tem_substituicao_tributaria,
    unidade_medida, observacoes
)
SELECT
    n.codigo_ncm,
    n.descricao_ncm,
    FALSE,
    'UN',
    'NCM sem substituição tributária - importado automaticamente'
FROM temp_ncm_data n
WHERE NOT EXISTS (
    SELECT 1 FROM temp_cest_data c
    WHERE c.codigo_ncm = n.codigo_ncm
);

-- 8. INSERIR NCM COM CEST (PRODUTOS COM SUBSTITUIÇÃO TRIBUTÁRIA)
INSERT INTO ncm (
    codigo_ncm, descricao_ncm, codigo_cest, descricao_cest,
    segmento_cest, item_cest, especificacao_item,
    tem_substituicao_tributaria, categoria_st, unidade_medida, observacoes
)
SELECT
    COALESCE(n.codigo_ncm, c.codigo_ncm) as codigo_ncm,
    COALESCE(n.descricao_ncm, 'Descrição não disponível - NCM encontrado apenas na tabela CEST') as descricao_ncm,
    c.codigo_cest,
    c.descricao_cest,
    SUBSTRING(c.codigo_cest, 1, 2) as segmento_cest,
    SUBSTRING(c.codigo_cest, 3, 3) as item_cest,
    SUBSTRING(c.codigo_cest, 6, 2) as especificacao_item,
    TRUE as tem_substituicao_tributaria,
    determinar_categoria_st(SUBSTRING(c.codigo_cest, 1, 2)) as categoria_st,
    'UN' as unidade_medida,
    'NCM com substituição tributária - importado automaticamente'
FROM temp_cest_data c
LEFT JOIN temp_ncm_data n ON n.codigo_ncm = c.codigo_ncm;

-- 9. LIMPAR TABELAS TEMPORÁRIAS
DROP TABLE temp_ncm_data;
DROP TABLE temp_cest_data;
DROP FUNCTION determinar_categoria_st(TEXT);

-- 10. MOSTRAR ESTATÍSTICAS
SELECT
    'ESTATÍSTICAS FINAIS' as info,
    COUNT(*) as total_registros,
    COUNT(DISTINCT codigo_ncm) as ncm_unicos,
    COUNT(CASE WHEN codigo_cest IS NOT NULL THEN 1 END) as com_cest,
    COUNT(CASE WHEN tem_substituicao_tributaria = true THEN 1 END) as com_st
FROM ncm;

-- 11. MOSTRAR TOP 5 CATEGORIAS
SELECT
    'TOP 5 CATEGORIAS' as info,
    categoria_st,
    COUNT(*) as total
FROM ncm
WHERE categoria_st IS NOT NULL
GROUP BY categoria_st
ORDER BY total DESC
LIMIT 5;

-- 12. MOSTRAR EXEMPLOS DE CORRESPONDÊNCIAS
SELECT
    'EXEMPLOS DE CORRESPONDÊNCIAS' as info,
    codigo_ncm,
    LEFT(descricao_ncm, 50) || '...' as descricao_ncm,
    codigo_cest,
    LEFT(descricao_cest, 50) || '...' as descricao_cest,
    categoria_st
FROM ncm
WHERE codigo_cest IS NOT NULL
ORDER BY codigo_ncm
LIMIT 5;

-- =====================================================
-- SCRIPT CONCLUÍDO!
-- =====================================================
-- ✅ Tabela NCM populada com dados das tabelas ncm.sql e cest.sql
-- ✅ Correspondências NCM-CEST criadas automaticamente
-- ✅ Categorias de ST definidas por segmento CEST
-- ✅ Produtos sem ST marcados corretamente
--
-- PRÓXIMOS PASSOS:
-- 1. Verificar os dados inseridos
-- 2. Testar consultas de validação NCM-CEST
-- 3. Implementar no formulário de produtos
-- =====================================================
