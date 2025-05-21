/**
 * Utilitários para formatação de valores
 */

/**
 * Formata um valor numérico para o formato de moeda brasileira (R$)
 * @param valor Valor numérico a ser formatado
 * @returns String formatada no padrão de moeda brasileira
 */
export const formatarPreco = (valor: number): string => {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Converte uma string formatada como moeda para um valor numérico
 * @param valorFormatado String formatada como moeda (ex: "R$ 10,50")
 * @returns Valor numérico (ex: 10.5)
 */
export const desformatarPreco = (valorFormatado: string): number => {
  // Remove todos os caracteres não numéricos, exceto vírgula e ponto
  const valorLimpo = valorFormatado.replace(/[^\d,\.]/g, '');

  // Substitui vírgula por ponto para conversão correta
  const valorComPonto = valorLimpo.replace(',', '.');

  // Converte para número
  const valorNumerico = parseFloat(valorComPonto);

  // Retorna 0 se não for um número válido
  return isNaN(valorNumerico) ? 0 : valorNumerico;
};

/**
 * Formata um número de documento (CPF/CNPJ)
 * @param documento Número do documento (apenas dígitos)
 * @param tipo Tipo do documento ('cpf' ou 'cnpj')
 * @returns String formatada do documento
 */
export const formatarDocumento = (documento: string, tipo: 'cpf' | 'cnpj'): string => {
  // Remove caracteres não numéricos
  const apenasNumeros = documento.replace(/\D/g, '');

  if (tipo === 'cpf') {
    // Formato: 000.000.000-00
    return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else {
    // Formato: 00.000.000/0000-00
    return apenasNumeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
};

/**
 * Formata um número de telefone
 * @param telefone Número de telefone (apenas dígitos)
 * @returns String formatada do telefone
 */
export const formatarTelefone = (telefone: string): string => {
  // Remove caracteres não numéricos
  const apenasNumeros = telefone.replace(/\D/g, '');

  if (apenasNumeros.length === 11) {
    // Celular: (00) 0 0000-0000
    return apenasNumeros.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, '($1) $2 $3-$4');
  } else if (apenasNumeros.length === 10) {
    // Fixo: (00) 0000-0000
    return apenasNumeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  // Retorna o original se não se encaixar nos padrões
  return telefone;
};

/**
 * Formata um CEP
 * @param cep Número do CEP (apenas dígitos)
 * @returns String formatada do CEP
 */
export const formatarCEP = (cep: string): string => {
  // Remove caracteres não numéricos
  const apenasNumeros = cep.replace(/\D/g, '');

  // Formato: 00000-000
  return apenasNumeros.replace(/(\d{5})(\d{3})/, '$1-$2');
};

/**
 * Formata uma data para o formato brasileiro
 * @param data Data a ser formatada (string ISO ou objeto Date)
 * @returns String formatada da data (DD/MM/YYYY)
 */
export const formatarData = (data: Date | string | undefined | null): string => {
  if (!data) {
    return 'Data não disponível';
  }

  try {
    const dataObj = typeof data === 'string' ? new Date(data) : data;

    // Verificar se a data é válida
    if (isNaN(dataObj.getTime())) {
      return 'Data inválida';
    }

    return dataObj.toLocaleDateString('pt-BR');
  } catch (error) {
    console.error('Erro ao formatar data:', error, data);
    return 'Erro ao formatar data';
  }
};

/**
 * Formata uma data e hora para o formato brasileiro
 * @param data Data a ser formatada (string ISO ou objeto Date)
 * @returns String formatada da data e hora (DD/MM/YYYY HH:MM)
 */
export const formatarDataHora = (data: Date | string | undefined | null): string => {
  if (!data) {
    return 'Data não disponível';
  }

  try {
    const dataObj = typeof data === 'string' ? new Date(data) : data;

    // Verificar se a data é válida
    if (isNaN(dataObj.getTime())) {
      return 'Data inválida';
    }

    return dataObj.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Erro ao formatar data e hora:', error, data);
    return 'Erro ao formatar data';
  }
};
