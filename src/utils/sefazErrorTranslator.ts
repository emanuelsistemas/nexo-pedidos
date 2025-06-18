/**
 * Utilitário para traduzir códigos de erro da SEFAZ em mensagens amigáveis
 * Baseado na documentação oficial da SEFAZ: https://www.mjailton.com.br/manualnfe/erronfe
 */

export interface SefazError {
  codigo: string;
  titulo: string;
  descricao: string;
  solucao: string;
  categoria: 'duplicidade' | 'documento' | 'data' | 'chave' | 'ambiente' | 'localizacao' | 'certificado' | 'produto' | 'processamento' | 'outros';
}

/**
 * Mapeamento completo dos códigos de erro da SEFAZ
 */
export const SEFAZ_ERRORS: Record<string, SefazError> = {
  // Erros de Duplicidade e Numeração
  '206': {
    codigo: '206',
    titulo: 'NFe Duplicada',
    descricao: 'Esta NFe já foi inutilizada na SEFAZ e não pode ser emitida.',
    solucao: 'Use um número diferente ou verifique se a numeração não foi inutilizada.',
    categoria: 'duplicidade'
  },
  '539': {
    codigo: '539',
    titulo: 'NFe Duplicada',
    descricao: 'Já existe uma NFe autorizada com este número e série.',
    solucao: 'Use um número sequencial diferente para esta NFe.',
    categoria: 'duplicidade'
  },

  // Erros de Documentos
  '204': {
    codigo: '204',
    titulo: 'CNPJ Inválido',
    descricao: 'O CNPJ da empresa está incorreto ou inválido.',
    solucao: 'Verifique e corrija o CNPJ da empresa nas configurações.',
    categoria: 'documento'
  },
  '207': {
    codigo: '207',
    titulo: 'CNPJ Inválido',
    descricao: 'O CNPJ do emitente está incorreto ou inválido.',
    solucao: 'Verifique e corrija o CNPJ da empresa nas configurações.',
    categoria: 'documento'
  },
  '209': {
    codigo: '209',
    titulo: 'Inscrição Estadual Inválida',
    descricao: 'A Inscrição Estadual da empresa está incorreta ou inválida.',
    solucao: 'Verifique e corrija a Inscrição Estadual da empresa nas configurações.',
    categoria: 'documento'
  },
  '215': {
    codigo: '215',
    titulo: 'CNPJ/CPF do Destinatário Inválido',
    descricao: 'O CNPJ/CPF do destinatário está incorreto.',
    solucao: 'Verifique e corrija o documento do destinatário.',
    categoria: 'documento'
  },
  '401': {
    codigo: '401',
    titulo: 'CPF Inválido',
    descricao: 'O CPF do emitente está incorreto ou inválido.',
    solucao: 'Verifique e corrija o CPF nas configurações.',
    categoria: 'documento'
  },

  // Erros de Data e Horário
  '228': {
    codigo: '228',
    titulo: 'Data de Emissão Atrasada',
    descricao: 'A data de emissão está muito atrasada (mais de 30 dias).',
    solucao: 'Ajuste a data de emissão para uma data mais recente.',
    categoria: 'data'
  },
  '703': {
    codigo: '703',
    titulo: 'Data de Emissão Futura',
    descricao: 'A data de emissão está no futuro.',
    solucao: 'Ajuste a data de emissão para a data atual ou anterior.',
    categoria: 'data'
  },
  '315': {
    codigo: '315',
    titulo: 'Data de Emissão Anterior ao Início da NFe',
    descricao: 'A data de emissão é anterior ao início da autorização de NFe na UF.',
    solucao: 'Ajuste a data de emissão para uma data válida.',
    categoria: 'data'
  },

  // Erros de Chave de Acesso
  '502': {
    codigo: '502',
    titulo: 'Chave de Acesso Inválida',
    descricao: 'A chave de acesso não corresponde aos dados da NFe.',
    solucao: 'Regenere a NFe para criar uma nova chave de acesso válida.',
    categoria: 'chave'
  },
  '253': {
    codigo: '253',
    titulo: 'Dígito Verificador Inválido',
    descricao: 'O dígito verificador da chave de acesso está incorreto.',
    solucao: 'Regenere a NFe para corrigir o dígito verificador.',
    categoria: 'chave'
  },

  // Erros de Ambiente
  '252': {
    codigo: '252',
    titulo: 'Ambiente Incorreto',
    descricao: 'O ambiente da NFe não corresponde ao ambiente do servidor.',
    solucao: 'Verifique se está emitindo no ambiente correto (produção/homologação).',
    categoria: 'ambiente'
  },

  // Erros de UF e Localização
  '226': {
    codigo: '226',
    titulo: 'UF Incorreta',
    descricao: 'A UF do emitente não corresponde à UF autorizadora.',
    solucao: 'Verifique se a UF da empresa está configurada corretamente.',
    categoria: 'localizacao'
  },
  '247': {
    codigo: '247',
    titulo: 'UF Divergente',
    descricao: 'A sigla da UF do emitente diverge da UF autorizadora.',
    solucao: 'Verifique se a UF da empresa está configurada corretamente.',
    categoria: 'localizacao'
  },
  '270': {
    codigo: '270',
    titulo: 'Município Inexistente',
    descricao: 'O código do município não existe na tabela do IBGE.',
    solucao: 'Verifique e corrija o código do município da empresa.',
    categoria: 'localizacao'
  },
  '272': {
    codigo: '272',
    titulo: 'Município Inexistente',
    descricao: 'O código do município do emitente não existe.',
    solucao: 'Verifique e corrija o código do município da empresa.',
    categoria: 'localizacao'
  },
  '273': {
    codigo: '273',
    titulo: 'Município Divergente da UF',
    descricao: 'O código do município não corresponde à UF do emitente.',
    solucao: 'Verifique se o código do município está correto para a UF.',
    categoria: 'localizacao'
  },

  // Erros de Certificado
  '280': {
    codigo: '280',
    titulo: 'Certificado Digital Inválido',
    descricao: 'O certificado digital está vencido ou inválido.',
    solucao: 'Renove ou configure um certificado digital válido.',
    categoria: 'certificado'
  },

  // Erros de Produtos e Impostos
  '897': {
    codigo: '897',
    titulo: 'Código Numérico Inválido',
    descricao: 'O código numérico da NFe está em formato inválido.',
    solucao: 'Regenere a NFe para criar um novo código numérico válido.',
    categoria: 'produto'
  },
  '611': {
    codigo: '611',
    titulo: 'Código EAN/GTIN Inválido',
    descricao: 'O código de barras EAN/GTIN de um ou mais produtos está incorreto.',
    solucao: 'Verifique e corrija os códigos EAN/GTIN dos produtos ou deixe em branco se não possuir.',
    categoria: 'produto'
  },

  // Erros de Processamento
  '103': {
    codigo: '103',
    titulo: 'Lote em Processamento',
    descricao: 'A NFe foi enviada e está sendo processada pela SEFAZ.',
    solucao: 'Aguarde alguns segundos e consulte o status novamente.',
    categoria: 'processamento'
  },
  '104': {
    codigo: '104',
    titulo: 'Lote Processado',
    descricao: 'O lote foi processado com sucesso.',
    solucao: 'Consulte o resultado do processamento.',
    categoria: 'processamento'
  }
};

/**
 * Traduz um código de erro da SEFAZ para uma mensagem amigável
 */
export function traduzirErroSefaz(codigo: string, motivoOriginal?: string): SefazError {
  const erro = SEFAZ_ERRORS[codigo];
  
  if (erro) {
    return erro;
  }

  // Fallback para códigos não mapeados
  return {
    codigo,
    titulo: 'Erro na Validação da NFe',
    descricao: motivoOriginal || 'Erro não identificado na validação da SEFAZ.',
    solucao: 'Verifique os dados da NFe e tente novamente.',
    categoria: 'outros'
  };
}

/**
 * Extrai o código de status SEFAZ de uma mensagem de erro
 */
export function extrairCodigoSefaz(mensagem: string): string | null {
  const patterns = [
    /Status SEFAZ:\s*(\d+)/i,
    /código\s*(\d+)/i,
    /status\s*(\d+)/i,
    /rejeição:\s*(\d+)/i,
    /erro\s*(\d+)/i
  ];

  for (const pattern of patterns) {
    const match = mensagem.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Gera uma mensagem de erro amigável para exibição no console/logs
 */
export function gerarMensagemAmigavel(codigo: string, motivoOriginal?: string): string {
  const erro = traduzirErroSefaz(codigo, motivoOriginal);
  
  return `❌ ${erro.titulo}
📋 ${erro.descricao}
💡 ${erro.solucao}`;
}

/**
 * Categoriza erros por tipo para melhor organização
 */
export function categorizarErro(codigo: string): string {
  const erro = SEFAZ_ERRORS[codigo];
  
  if (!erro) return 'outros';
  
  const categorias = {
    'duplicidade': '🔄 Duplicidade',
    'documento': '📄 Documento',
    'data': '📅 Data/Horário',
    'chave': '🔑 Chave de Acesso',
    'ambiente': '🌐 Ambiente',
    'localizacao': '📍 Localização',
    'certificado': '🔒 Certificado',
    'produto': '📦 Produto',
    'processamento': '⚙️ Processamento',
    'outros': '❓ Outros'
  };
  
  return categorias[erro.categoria] || categorias.outros;
}
