export interface Produto {
  id: string;
  nome: string;
  preco: number;
  descricao?: string;
  codigo: string;
  codigo_barras?: string;
  grupo_id: string;
  promocao?: boolean;
  tipo_desconto?: string;
  valor_desconto?: number;
  ativo?: boolean;
  estoque_inicial?: number;
  estoque_atual?: number;
  estoque_minimo?: number;
  estoque_minimo_ativo?: boolean;
  desconto_quantidade?: boolean;
  quantidade_minima?: number;
  tipo_desconto_quantidade?: 'percentual' | 'valor';
  valor_desconto_quantidade?: number;
  percentual_desconto_quantidade?: number;
  unidade_medida_id?: string;
  created_at?: string;
  opcoes_adicionais?: OpcaoAdicional[];
  // Campos fiscais NFe
  ncm?: string;
  cfop?: string;
  origem_produto?: number;
  situacao_tributaria?: string;
  cst_icms?: string;
  csosn_icms?: string;
  cst_pis?: string;
  cst_cofins?: string;
  aliquota_icms?: number;
  aliquota_pis?: number;
  aliquota_cofins?: number;
  cest?: string;
  peso_liquido?: number;
}

export interface Grupo {
  id: string;
  nome: string;
  empresa_id: string;
  created_at?: string;
  produtos: Produto[];
}

export interface OpcaoAdicional {
  id: string;
  nome: string;
  created_at?: string;
  itens: OpcaoAdicionalItem[];
}

export interface OpcaoAdicionalItem {
  id: string;
  nome: string;
  preco: number;
  opcao_id: string;
  created_at?: string;
}

export interface ProdutoOpcao {
  id: string;
  produto_id: string;
  opcao_id: string;
  opcao?: OpcaoAdicional;
}

export interface TipoControleEstoqueConfig {
  id: string;
  empresa_id: string;
  tipo_controle: 'faturamento' | 'pedidos';
  bloqueia_sem_estoque?: boolean;
  created_at?: string;
}

export interface TaxaEntregaConfig {
  id: string;
  empresa_id: string;
  habilitado: boolean;
  tipo: 'bairro' | 'distancia';
  created_at?: string;
  updated_at?: string;
}

export interface TipoUserConfig {
  id: string;
  tipo: 'admin' | 'user' | 'vendedor' | 'caixa' | 'socio';
  descricao?: string;
  ativo?: boolean;
  created_at?: string;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: 'admin' | 'user';
  empresa_id: string;
  tipo_user_config_id?: string;
  tipo_user_config?: TipoUserConfig;
  ativo?: boolean;
  serie_nfce?: number; // ✅ NOVO: Série individual da NFC-e para este usuário
  created_at?: string;
}

export interface PDVConfig {
  id?: string;
  empresa_id?: string;
  comandas?: boolean;
  mesas?: boolean;
  vendedor?: boolean;
  exibe_foto_item?: boolean;
  seleciona_clientes?: boolean;
  controla_caixa?: boolean;
  agrupa_itens?: boolean;
  delivery?: boolean;
  cardapio_digital?: boolean;
  delivery_chat_ia?: boolean;
  baixa_estoque_pdv?: boolean;
  venda_codigo_barras?: boolean;
  forca_venda_fiscal_cartao?: boolean;
  observacao_no_item?: boolean;
  desconto_no_item?: boolean;
  editar_nome_produto?: boolean;
  fiado?: boolean;
  vendas_itens_multiplicacao?: boolean;
  ocultar_finalizar_com_impressao?: boolean;
  ocultar_finalizar_sem_impressao?: boolean;
  ocultar_nfce_com_impressao?: boolean;
  ocultar_nfce_sem_impressao?: boolean;
  ocultar_nfce_producao?: boolean;
  ocultar_producao?: boolean;
  rodape_personalizado?: string;
  created_at?: string;
  updated_at?: string;
}