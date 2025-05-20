export interface Produto {
  id: string;
  nome: string;
  preco: number;
  descricao?: string;
  codigo: string;
  grupo_id: string;
  promocao?: boolean;
  ativo?: boolean;
  estoque_inicial?: number;
  created_at?: string;
  opcoes_adicionais?: OpcaoAdicional[];
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