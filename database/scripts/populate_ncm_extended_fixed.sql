-- =====================================================
-- SCRIPT ESTENDIDO CORRIGIDO PARA POPULAR MAIS NCM NO SUPABASE
-- =====================================================
-- Execute APÓS o script populate_ncm_supabase.sql
-- Versão corrigida que evita duplicatas
-- =====================================================

-- CRIAR TABELA TEMPORÁRIA COM OS NOVOS NCM
CREATE TEMP TABLE temp_novos_ncm (
    codigo_ncm VARCHAR(8),
    descricao_ncm TEXT,
    tem_substituicao_tributaria BOOLEAN,
    unidade_medida VARCHAR(10),
    observacoes TEXT
);

-- INSERIR DADOS NA TABELA TEMPORÁRIA
INSERT INTO temp_novos_ncm (codigo_ncm, descricao_ncm, tem_substituicao_tributaria, unidade_medida, observacoes) VALUES
-- ALIMENTOS BÁSICOS
('10019000', 'Trigo (exceto trigo duro), exceto para semeadura', FALSE, 'KG', 'Alimento básico'),
('10059000', 'Milho, exceto para semeadura', FALSE, 'KG', 'Alimento básico'),
('10063000', 'Arroz semibranqueado ou branqueado', FALSE, 'KG', 'Alimento básico'),
('15071000', 'Óleo de soja, em bruto', FALSE, 'L', 'Óleo alimentar'),
('15079000', 'Outros óleos de soja e suas frações', FALSE, 'L', 'Óleo alimentar'),
('17011100', 'Açúcar de cana, em bruto', FALSE, 'KG', 'Açúcar'),
('17019900', 'Outros açúcares de cana ou de beterraba', FALSE, 'KG', 'Açúcar'),
('04011010', 'Leite UHT, com teor de matérias gordas <= 1%', FALSE, 'L', 'Leite'),
('04012010', 'Leite UHT, 1% < matérias gordas <= 6%', FALSE, 'L', 'Leite'),
('04013010', 'Leite com teor de matérias gordas > 6%', FALSE, 'L', 'Leite'),

-- CARNES E DERIVADOS
('02013000', 'Carnes desossadas de bovino, frescas ou refrigeradas', FALSE, 'KG', 'Carne bovina'),
('02023000', 'Carnes desossadas de bovino, congeladas', FALSE, 'KG', 'Carne bovina'),
('02031900', 'Outras carnes de suíno, frescas ou refrigeradas', FALSE, 'KG', 'Carne suína'),
('02032900', 'Outras carnes de suíno, congeladas', FALSE, 'KG', 'Carne suína'),
('02071200', 'Carnes de galos/galinhas, não cortadas em pedaços, congeladas', FALSE, 'KG', 'Frango'),
('02071400', 'Pedaços e miudezas, comestíveis de galos/galinhas, congelados', FALSE, 'KG', 'Frango'),

-- FRUTAS E VEGETAIS
('08030000', 'Bananas frescas ou secas', FALSE, 'KG', 'Fruta'),
('08051000', 'Laranjas frescas ou secas', FALSE, 'KG', 'Fruta'),
('08081000', 'Maçãs frescas', FALSE, 'KG', 'Fruta'),
('07020000', 'Tomates, frescos ou refrigerados', FALSE, 'KG', 'Hortaliça'),
('07031019', 'Outras cebolas frescas ou refrigeradas', FALSE, 'KG', 'Hortaliça'),
('07019000', 'Outras batatas frescas ou refrigeradas', FALSE, 'KG', 'Hortaliça'),

-- PRODUTOS DE LIMPEZA E HIGIENE
('34022000', 'Detergentes', FALSE, 'UN', 'Produto de limpeza'),
('34011190', 'Sabões de toucador, em barras', FALSE, 'UN', 'Produto de higiene'),
('34013000', 'Produtos para lavagem da pele, líquidos ou creme', FALSE, 'UN', 'Produto de higiene'),
('33051000', 'Xampus para cabelo', FALSE, 'UN', 'Produto de higiene'),
('33072010', 'Desodorantes corporais e antiperspirantes, líquidos', FALSE, 'UN', 'Produto de higiene'),

-- MATERIAIS DE ESCRITÓRIO
('48201000', 'Livros de registro e de contabilidade', FALSE, 'UN', 'Material de escritório'),
('48202000', 'Cadernos', FALSE, 'UN', 'Material de escritório'),
('48239000', 'Outros papéis para correspondência', FALSE, 'UN', 'Material de escritório'),
('96081000', 'Canetas esferográficas', FALSE, 'UN', 'Material de escritório'),
('96082000', 'Marcadores e canetas com ponta de feltro', FALSE, 'UN', 'Material de escritório'),

-- ROUPAS E CALÇADOS
('61051000', 'Camisas de malha, de algodão, para homens', FALSE, 'UN', 'Vestuário'),
('61091000', 'Camisetas de malha, de algodão', FALSE, 'UN', 'Vestuário'),
('62034200', 'Calças de algodão, para homens', FALSE, 'UN', 'Vestuário'),
('64039900', 'Outros calçados', FALSE, 'PAR', 'Calçado'),
('64041900', 'Outros calçados com sola de borracha ou plástico', FALSE, 'PAR', 'Calçado'),

-- ELETRÔNICOS BÁSICOS (SEM ST)
('85171300', 'Telefones, incluídos os celulares', FALSE, 'UN', 'Eletrônico'),
('85287200', 'Outros aparelhos receptores de televisão', FALSE, 'UN', 'Eletrônico'),
('84713000', 'Máquinas automáticas para processamento de dados, portáteis', FALSE, 'UN', 'Informática'),
('84714100', 'Outras máquinas automáticas para processamento de dados', FALSE, 'UN', 'Informática'),

-- MÓVEIS
('94013000', 'Assentos giratórios de altura ajustável', FALSE, 'UN', 'Móvel'),
('94016900', 'Outros assentos com armação de madeira', FALSE, 'UN', 'Móvel'),
('94035000', 'Móveis de madeira para quartos de dormir', FALSE, 'UN', 'Móvel'),
('94036000', 'Outros móveis de madeira', FALSE, 'UN', 'Móvel'),

-- BRINQUEDOS
('95030000', 'Outros brinquedos, modelos reduzidos e modelos similares', FALSE, 'UN', 'Brinquedo'),
('95049000', 'Outros jogos', FALSE, 'UN', 'Brinquedo'),
('95059000', 'Outros artigos para festas', FALSE, 'UN', 'Brinquedo'),

-- LIVROS E MATERIAIS EDUCATIVOS
('49019900', 'Outros livros, brochuras e impressos similares', FALSE, 'UN', 'Livro'),
('49030000', 'Álbuns ou livros de imagens e cadernos de desenhar', FALSE, 'UN', 'Material educativo'),
('49111000', 'Impressos publicitários, catálogos comerciais e similares', FALSE, 'UN', 'Material publicitário'),

-- FERRAMENTAS BÁSICAS (SEM ST)
('82011000', 'Pás', FALSE, 'UN', 'Ferramenta'),
('82013000', 'Picaretas, enxadas, sachos e ancinhos', FALSE, 'UN', 'Ferramenta'),
('82019000', 'Outras ferramentas manuais para agricultura', FALSE, 'UN', 'Ferramenta'),
('82032000', 'Alicates, mesmo cortantes', FALSE, 'UN', 'Ferramenta'),
('82041100', 'Chaves de fenda', FALSE, 'UN', 'Ferramenta'),

-- PRODUTOS FARMACÊUTICOS BÁSICOS (SEM ST)
('30049099', 'Outros medicamentos para uso humano', FALSE, 'UN', 'Medicamento'),
('30051000', 'Curativos adesivos e outros artigos com adesivo', FALSE, 'UN', 'Material médico'),
('30059000', 'Outros artigos farmacêuticos', FALSE, 'UN', 'Material médico'),

-- PRODUTOS DE BELEZA BÁSICOS (SEM ST)
('33030010', 'Perfumes (extratos)', FALSE, 'UN', 'Cosmético'),
('33030020', 'Águas-de-colônia', FALSE, 'UN', 'Cosmético'),
('33041000', 'Produtos de maquiagem para os lábios', FALSE, 'UN', 'Cosmético'),
('33049100', 'Pós para maquiagem, incluindo os compactos', FALSE, 'UN', 'Cosmético'),

-- ARTIGOS ESPORTIVOS
('95066100', 'Bolas de tênis', FALSE, 'UN', 'Artigo esportivo'),
('95066200', 'Bolas infláveis', FALSE, 'UN', 'Artigo esportivo'),
('95067000', 'Patins para gelo e patins de rodas', FALSE, 'PAR', 'Artigo esportivo'),
('95069100', 'Artigos e equipamentos para cultura física', FALSE, 'UN', 'Artigo esportivo'),

-- INSTRUMENTOS MUSICAIS
('92051000', 'Instrumentos musicais de sopro', FALSE, 'UN', 'Instrumento musical'),
('92060000', 'Instrumentos musicais de percussão', FALSE, 'UN', 'Instrumento musical'),
('92071000', 'Instrumentos musicais de teclado', FALSE, 'UN', 'Instrumento musical'),

-- PRODUTOS DIVERSOS
('96032100', 'Escovas de dentes', FALSE, 'UN', 'Produto de higiene'),
('96091000', 'Lápis', FALSE, 'UN', 'Material de escritório'),
('96100000', 'Lousas e quadros para escrever ou desenhar', FALSE, 'UN', 'Material educativo');

-- INSERIR APENAS OS NCM QUE NÃO EXISTEM
INSERT INTO ncm (codigo_ncm, descricao_ncm, tem_substituicao_tributaria, unidade_medida, observacoes)
SELECT 
    t.codigo_ncm,
    t.descricao_ncm,
    t.tem_substituicao_tributaria,
    t.unidade_medida,
    t.observacoes
FROM temp_novos_ncm t
WHERE NOT EXISTS (
    SELECT 1 FROM ncm n 
    WHERE n.codigo_ncm = t.codigo_ncm
);

-- MOSTRAR QUANTOS FORAM INSERIDOS
SELECT 
    'NOVOS NCM INSERIDOS' as info,
    COUNT(*) as total_inseridos
FROM temp_novos_ncm t
WHERE NOT EXISTS (
    SELECT 1 FROM ncm n 
    WHERE n.codigo_ncm = t.codigo_ncm
);

-- LIMPAR TABELA TEMPORÁRIA
DROP TABLE temp_novos_ncm;

-- MOSTRAR ESTATÍSTICAS ATUALIZADAS
SELECT 
    'ESTATÍSTICAS APÓS EXTENSÃO' as info,
    COUNT(*) as total_registros,
    COUNT(DISTINCT codigo_ncm) as ncm_unicos,
    COUNT(CASE WHEN codigo_cest IS NOT NULL THEN 1 END) as com_cest,
    COUNT(CASE WHEN tem_substituicao_tributaria = true THEN 1 END) as com_st,
    COUNT(CASE WHEN tem_substituicao_tributaria = false THEN 1 END) as sem_st
FROM ncm;

-- =====================================================
-- SCRIPT ESTENDIDO CORRIGIDO CONCLUÍDO!
-- =====================================================
-- ✅ Evita duplicatas verificando se NCM já existe
-- ✅ Adiciona apenas NCM novos
-- ✅ Mostra quantos foram inseridos
-- ✅ Base mais completa para validação de produtos
-- =====================================================
