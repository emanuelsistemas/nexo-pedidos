/**
 * Utilitários de validação para campos NFe
 * Previne problemas de validação da SEFAZ na origem
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  cleanValue?: string;
}

/**
 * Caracteres especiais não permitidos pela SEFAZ
 */
const CARACTERES_NAO_PERMITIDOS = [
  // Caracteres de controle
  '\n', '\r', '\t', '\v', '\f',
  // Caracteres especiais problemáticos
  '<', '>', '&', '"', "'",
  // Caracteres Unicode problemáticos
  '\u0000', '\u0001', '\u0002', '\u0003', '\u0004', '\u0005', '\u0006', '\u0007',
  '\u0008', '\u000B', '\u000C', '\u000E', '\u000F', '\u0010', '\u0011', '\u0012',
  '\u0013', '\u0014', '\u0015', '\u0016', '\u0017', '\u0018', '\u0019', '\u001A',
  '\u001B', '\u001C', '\u001D', '\u001E', '\u001F', '\u007F'
];

/**
 * Caracteres permitidos para diferentes tipos de campos
 */
const CARACTERES_PERMITIDOS = {
  // Nome de produto, descrição, endereço
  TEXTO_GERAL: /^[a-zA-Z0-9\sÀ-ÿ\u00C0-\u017F.,;:()\-\/\+\*=@#$%&!?°ºª]+$/,
  
  // Informações adicionais (mais restritivo)
  INFO_ADICIONAL: /^[a-zA-Z0-9\sÀ-ÿ\u00C0-\u017F.,;:()\-\/\+\*=@#$%&!?°ºª]+$/,
  
  // Justificativa de cancelamento/CCe (mais restritivo ainda)
  JUSTIFICATIVA: /^[a-zA-Z0-9\sÀ-ÿ\u00C0-\u017F.,;:()\-\/\+\*=@#$%&!?°ºª]+$/,
  
  // Endereço (sem alguns caracteres especiais)
  ENDERECO: /^[a-zA-Z0-9\sÀ-ÿ\u00C0-\u017F.,;:()\-\/\+]+$/
};

/**
 * Valida um campo de texto para NFe
 */
export const validarCampoNFe = (
  valor: string,
  tipo: keyof typeof CARACTERES_PERMITIDOS = 'TEXTO_GERAL',
  maxLength?: number
): ValidationResult => {
  const errors: string[] = [];
  
  if (!valor || valor.trim() === '') {
    return { isValid: true, errors: [], cleanValue: '' };
  }

  // 1. Verificar espaços no início/fim
  if (valor !== valor.trim()) {
    errors.push('❌ Não são permitidos espaços no início ou fim do texto');
  }

  // 2. Verificar espaços duplicados
  if (/\s{2,}/.test(valor)) {
    errors.push('❌ Não são permitidos espaços duplicados (use apenas 1 espaço entre palavras)');
  }

  // 3. Verificar quebras de linha
  if (/[\n\r]/.test(valor)) {
    errors.push('❌ Não são permitidas quebras de linha');
  }

  // 4. Verificar caracteres especiais não permitidos
  const caracteresProblematicos = CARACTERES_NAO_PERMITIDOS.filter(char => valor.includes(char));
  if (caracteresProblematicos.length > 0) {
    errors.push(`❌ Caracteres não permitidos encontrados: ${caracteresProblematicos.map(c => `"${c}"`).join(', ')}`);
  }

  // 5. Verificar padrão de caracteres permitidos
  const regex = CARACTERES_PERMITIDOS[tipo];
  if (!regex.test(valor.trim())) {
    errors.push('❌ Contém caracteres especiais não permitidos pela SEFAZ');
  }

  // 6. Verificar tamanho máximo
  if (maxLength && valor.trim().length > maxLength) {
    errors.push(`❌ Texto muito longo (máximo ${maxLength} caracteres, atual: ${valor.trim().length})`);
  }

  // 7. Verificar se contém apenas espaços
  if (valor.trim().length === 0 && valor.length > 0) {
    errors.push('❌ Campo não pode conter apenas espaços');
  }

  const isValid = errors.length === 0;
  const cleanValue = isValid ? valor.trim() : undefined;

  return { isValid, errors, cleanValue };
};

/**
 * Valida especificamente nome de produto
 */
export const validarNomeProduto = (nome: string): ValidationResult => {
  return validarCampoNFe(nome, 'TEXTO_GERAL', 120);
};

/**
 * Valida descrição de produto
 */
export const validarDescricaoProduto = (descricao: string): ValidationResult => {
  return validarCampoNFe(descricao, 'TEXTO_GERAL', 500);
};

/**
 * Valida informações adicionais da NFe
 */
export const validarInformacoesAdicionais = (info: string): ValidationResult => {
  return validarCampoNFe(info, 'INFO_ADICIONAL', 2000);
};

/**
 * Valida justificativa de cancelamento
 */
export const validarJustificativaCancelamento = (justificativa: string): ValidationResult => {
  const result = validarCampoNFe(justificativa, 'JUSTIFICATIVA', 255);
  
  // Validação adicional: mínimo 15 caracteres para cancelamento
  if (result.isValid && justificativa.trim().length < 15) {
    result.errors.push('❌ Justificativa deve ter pelo menos 15 caracteres');
    result.isValid = false;
  }

  return result;
};

/**
 * Valida texto de carta de correção
 */
export const validarTextoCCe = (texto: string): ValidationResult => {
  const result = validarCampoNFe(texto, 'JUSTIFICATIVA', 1000);
  
  // Validação adicional: mínimo 15 caracteres para CCe
  if (result.isValid && texto.trim().length < 15) {
    result.errors.push('❌ Correção deve ter pelo menos 15 caracteres');
    result.isValid = false;
  }

  return result;
};

/**
 * Valida campos de endereço
 */
export const validarEndereco = (endereco: string, campo: string): ValidationResult => {
  const result = validarCampoNFe(endereco, 'ENDERECO', 60);

  if (!result.isValid) {
    result.errors = result.errors.map(error => error.replace('❌', `❌ ${campo}:`));
  }

  return result;
};

/**
 * Valida nome de cliente (pessoa física ou jurídica)
 */
export const validarNomeCliente = (nome: string): ValidationResult => {
  return validarCampoNFe(nome, 'TEXTO_GERAL', 60);
};

/**
 * Valida razão social de cliente
 */
export const validarRazaoSocial = (razaoSocial: string): ValidationResult => {
  return validarCampoNFe(razaoSocial, 'TEXTO_GERAL', 60);
};

/**
 * Valida nome fantasia de cliente
 */
export const validarNomeFantasia = (nomeFantasia: string): ValidationResult => {
  return validarCampoNFe(nomeFantasia, 'TEXTO_GERAL', 60);
};

/**
 * Valida observação NFe do cliente (vai para informações adicionais da NFe)
 */
export const validarObservacaoNFe = (observacao: string): ValidationResult => {
  return validarCampoNFe(observacao, 'INFO_ADICIONAL', 2000);
};

/**
 * Valida bairro do cliente
 */
export const validarBairro = (bairro: string): ValidationResult => {
  return validarCampoNFe(bairro, 'ENDERECO', 60);
};

/**
 * Valida cidade do cliente
 */
export const validarCidade = (cidade: string): ValidationResult => {
  return validarCampoNFe(cidade, 'ENDERECO', 60);
};

/**
 * Valida complemento do endereço
 */
export const validarComplemento = (complemento: string): ValidationResult => {
  return validarCampoNFe(complemento, 'ENDERECO', 60);
};

/**
 * Valida razão social da empresa (emitente da NFe)
 */
export const validarRazaoSocialEmpresa = (razaoSocial: string): ValidationResult => {
  return validarCampoNFe(razaoSocial, 'TEXTO_GERAL', 60);
};

/**
 * Valida nome fantasia da empresa (emitente da NFe)
 */
export const validarNomeFantasiaEmpresa = (nomeFantasia: string): ValidationResult => {
  return validarCampoNFe(nomeFantasia, 'TEXTO_GERAL', 60);
};

/**
 * Valida nome do proprietário da empresa
 */
export const validarNomeProprietario = (nome: string): ValidationResult => {
  return validarCampoNFe(nome, 'TEXTO_GERAL', 60);
};

/**
 * Limpa automaticamente um texto para NFe (uso com cuidado)
 */
export const limparTextoNFe = (texto: string): string => {
  if (!texto) return '';
  
  return texto
    .trim() // Remove espaços início/fim
    .replace(/\s+/g, ' ') // Remove espaços duplicados
    .replace(/[\n\r\t]/g, ' ') // Remove quebras de linha
    .replace(/[<>&"']/g, '') // Remove caracteres XML problemáticos
    .substring(0, 120); // Limita tamanho
};

/**
 * Gera mensagem de erro amigável para o usuário
 */
export const gerarMensagemErro = (campo: string, errors: string[]): string => {
  const titulo = `🚫 ERRO NO CAMPO "${campo.toUpperCase()}"`;
  const explicacao = '\n\n📋 A SEFAZ não aceita:';
  const listaErros = errors.map(error => `\n• ${error}`).join('');
  const instrucao = '\n\n✅ Por favor, corrija o texto e tente novamente.';
  
  return titulo + explicacao + listaErros + instrucao;
};

/**
 * Hook para validação em tempo real
 */
export const useNFeValidation = () => {
  const validarEMostrarErro = (
    valor: string,
    validador: (valor: string) => ValidationResult,
    campo: string,
    showMessage: (type: 'success' | 'error' | 'warning', message: string) => void
  ): boolean => {
    const resultado = validador(valor);
    
    if (!resultado.isValid) {
      const mensagem = gerarMensagemErro(campo, resultado.errors);
      showMessage('error', mensagem);
      return false;
    }
    
    return true;
  };

  return { validarEMostrarErro };
};

/**
 * Constantes para tamanhos máximos de campos NFe
 */
export const TAMANHOS_MAXIMOS_NFE = {
  NOME_PRODUTO: 120,
  DESCRICAO_PRODUTO: 500,
  INFORMACOES_ADICIONAIS: 2000,
  JUSTIFICATIVA_CANCELAMENTO: 255,
  TEXTO_CCE: 1000,
  ENDERECO: 60,
  BAIRRO: 60,
  CIDADE: 60,
  COMPLEMENTO: 60
} as const;
