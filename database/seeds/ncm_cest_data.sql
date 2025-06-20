-- =====================================================
-- DADOS DE EXEMPLO NCM-CEST
-- =====================================================
-- Dados baseados no Convênio ICMS 92/15 e atualizações
-- Exemplos das principais categorias de substituição tributária
-- =====================================================

-- Limpar dados existentes (opcional)
-- DELETE FROM ncm;

-- =====================================================
-- BEBIDAS - ÁGUAS MINERAIS (NCM 2202.10.00)
-- =====================================================

INSERT INTO ncm (
    codigo_ncm, descricao_ncm, codigo_cest, descricao_cest, especificacao_cest,
    segmento_cest, item_cest, especificacao_item, tem_substituicao_tributaria,
    categoria_st, unidade_medida, observacoes
) VALUES 
(
    '22021000',
    'Águas, incluindo as águas minerais e as águas gaseificadas, adicionadas de açúcar ou de outros edulcorantes ou aromatizadas',
    '03.001.00',
    'Água mineral, gasosa ou não, ou potável, naturais',
    'em garrafa de vidro, retornável ou não, com capacidade de até 500 ml',
    '03', '001', '00', TRUE,
    'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS',
    'UN', 'Embalagem de vidro até 500ml'
),
(
    '22021000',
    'Águas, incluindo as águas minerais e as águas gaseificadas, adicionadas de açúcar ou de outros edulcorantes ou aromatizadas',
    '03.002.00',
    'Água mineral, gasosa ou não, ou potável, naturais',
    'em embalagem com capacidade igual ou superior a 5.000 ml',
    '03', '002', '00', TRUE,
    'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS',
    'UN', 'Embalagem igual ou superior a 5 litros'
),
(
    '22021000',
    'Águas, incluindo as águas minerais e as águas gaseificadas, adicionadas de açúcar ou de outros edulcorantes ou aromatizadas',
    '03.003.00',
    'Água mineral, gasosa ou não, ou potável, naturais',
    'em embalagem de vidro, não retornável, com capacidade de até 300 ml',
    '03', '003', '00', TRUE,
    'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS',
    'UN', 'Embalagem de vidro não retornável até 300ml'
),
(
    '22021000',
    'Águas, incluindo as águas minerais e as águas gaseificadas, adicionadas de açúcar ou de outros edulcorantes ou aromatizadas',
    '03.004.00',
    'Água mineral, gasosa ou não, ou potável, naturais',
    'em garrafa plástica de 1.500 ml',
    '03', '004', '00', TRUE,
    'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS',
    'UN', 'Garrafa plástica de 1,5 litro'
),
(
    '22021000',
    'Águas, incluindo as águas minerais e as águas gaseificadas, adicionadas de açúcar ou de outros edulcorantes ou aromatizadas',
    '03.005.00',
    'Água mineral, gasosa ou não, ou potável, naturais',
    'em copos plásticos e embalagem plástica com capacidade de até 500 ml',
    '03', '005', '00', TRUE,
    'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS',
    'UN', 'Copos plásticos até 500ml'
),
(
    '22021000',
    'Águas, incluindo as águas minerais e as águas gaseificadas, adicionadas de açúcar ou de outros edulcorantes ou aromatizadas',
    '03.006.00',
    'Outras águas minerais, potáveis ou naturais, gasosas ou não',
    'inclusive gaseificadas',
    '03', '006', '00', TRUE,
    'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS',
    'UN', 'Outras águas minerais não especificadas'
),
(
    '22021000',
    'Águas, incluindo as águas minerais e as águas gaseificadas, adicionadas de açúcar ou de outros edulcorantes ou aromatizadas',
    '03.007.00',
    'Águas minerais, potáveis ou naturais, gasosas ou não',
    'inclusive gaseificadas ou aromatizadas artificialmente, refrescos',
    '03', '007', '00', TRUE,
    'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS',
    'UN', 'Águas aromatizadas e refrescos'
);

-- =====================================================
-- REFRIGERANTES (NCM 2202.90.00)
-- =====================================================

INSERT INTO ncm (
    codigo_ncm, descricao_ncm, codigo_cest, descricao_cest, especificacao_cest,
    segmento_cest, item_cest, especificacao_item, tem_substituicao_tributaria,
    categoria_st, unidade_medida, observacoes
) VALUES 
(
    '22029000',
    'Outras bebidas não alcoólicas, exceto sucos de fruta ou de produtos hortícolas',
    '03.008.00',
    'Refrigerantes',
    'em embalagem de vidro, retornável ou não, com capacidade de até 500 ml',
    '03', '008', '00', TRUE,
    'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS',
    'UN', 'Refrigerante em vidro até 500ml'
),
(
    '22029000',
    'Outras bebidas não alcoólicas, exceto sucos de fruta ou de produtos hortícolas',
    '03.009.00',
    'Refrigerantes',
    'em embalagem com capacidade igual ou superior a 600 ml',
    '03', '009', '00', TRUE,
    'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS',
    'UN', 'Refrigerante 600ml ou mais'
),
(
    '22029000',
    'Outras bebidas não alcoólicas, exceto sucos de fruta ou de produtos hortícolas',
    '03.010.00',
    'Refrigerantes',
    'em embalagem de vidro, não retornável, com capacidade de até 300 ml',
    '03', '010', '00', TRUE,
    'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS',
    'UN', 'Refrigerante vidro não retornável até 300ml'
),
(
    '22029000',
    'Outras bebidas não alcoólicas, exceto sucos de fruta ou de produtos hortícolas',
    '03.011.00',
    'Demais refrigerantes',
    'não relacionados nos itens anteriores',
    '03', '011', '00', TRUE,
    'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS',
    'UN', 'Outros refrigerantes não especificados'
);

-- =====================================================
-- CERVEJAS (NCM 2203.00.00)
-- =====================================================

INSERT INTO ncm (
    codigo_ncm, descricao_ncm, codigo_cest, descricao_cest, especificacao_cest,
    segmento_cest, item_cest, especificacao_item, tem_substituicao_tributaria,
    categoria_st, unidade_medida, observacoes
) VALUES 
(
    '22030000',
    'Cerveja de malte',
    '03.012.00',
    'Cerveja',
    'em garrafa de vidro com capacidade de até 600 ml',
    '03', '012', '00', TRUE,
    'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS',
    'UN', 'Cerveja em garrafa até 600ml'
),
(
    '22030000',
    'Cerveja de malte',
    '03.013.00',
    'Cerveja',
    'em lata com capacidade de até 350 ml',
    '03', '013', '00', TRUE,
    'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS',
    'UN', 'Cerveja em lata até 350ml'
),
(
    '22030000',
    'Cerveja de malte',
    '03.014.00',
    'Cerveja',
    'em embalagem com capacidade superior a 600 ml',
    '03', '014', '00', TRUE,
    'CERVEJAS, CHOPES, REFRIGERANTES, ÁGUAS E OUTRAS BEBIDAS',
    'UN', 'Cerveja em embalagem superior a 600ml'
);

-- =====================================================
-- EXEMPLO DE NCM SEM SUBSTITUIÇÃO TRIBUTÁRIA
-- =====================================================

INSERT INTO ncm (
    codigo_ncm, descricao_ncm, codigo_cest, descricao_cest, especificacao_cest,
    segmento_cest, item_cest, especificacao_item, tem_substituicao_tributaria,
    categoria_st, unidade_medida, observacoes
) VALUES 
(
    '20089900',
    'Outras frutas e outras partes de plantas, preparadas ou conservadas',
    NULL, NULL, NULL,
    NULL, NULL, NULL, FALSE,
    NULL, 'KG', 'Produto sem substituição tributária'
);

-- =====================================================
-- AUTOPEÇAS - EXEMPLOS
-- =====================================================

INSERT INTO ncm (
    codigo_ncm, descricao_ncm, codigo_cest, descricao_cest, especificacao_cest,
    segmento_cest, item_cest, especificacao_item, tem_substituicao_tributaria,
    categoria_st, unidade_medida, observacoes
) VALUES 
(
    '38151210',
    'Catalisadores em colmeia cerâmica ou metálica para conversão catalítica de gases de escape de veículos',
    '01.001.00',
    'Catalisadores em colmeia cerâmica ou metálica',
    'para conversão catalítica de gases de escape de veículos e outros catalisadores',
    '01', '001', '00', TRUE,
    'AUTOPEÇAS',
    'UN', 'Catalisador automotivo'
),
(
    '40103100',
    'Correias de transmissão de borracha vulcanizada',
    '01.006.00',
    'Correias de transmissão',
    'de borracha vulcanizada, de matérias têxteis',
    '01', '006', '00', TRUE,
    'AUTOPEÇAS',
    'UN', 'Correia de transmissão'
);

-- =====================================================
-- MEDICAMENTOS - EXEMPLOS
-- =====================================================

INSERT INTO ncm (
    codigo_ncm, descricao_ncm, codigo_cest, descricao_cest, especificacao_cest,
    segmento_cest, item_cest, especificacao_item, tem_substituicao_tributaria,
    categoria_st, unidade_medida, observacoes
) VALUES 
(
    '30049099',
    'Outros medicamentos para uso humano',
    '17.001.00',
    'Medicamentos de referência',
    'constantes na lista de medicamentos de referência publicada pela ANVISA',
    '17', '001', '00', TRUE,
    'MEDICAMENTOS DE USO HUMANO E OUTROS PRODUTOS FARMACÊUTICOS',
    'UN', 'Medicamento de referência ANVISA'
),
(
    '30049099',
    'Outros medicamentos para uso humano',
    '17.002.00',
    'Medicamentos genéricos',
    'constantes na lista de medicamentos genéricos publicada pela ANVISA',
    '17', '002', '00', TRUE,
    'MEDICAMENTOS DE USO HUMANO E OUTROS PRODUTOS FARMACÊUTICOS',
    'UN', 'Medicamento genérico ANVISA'
);
