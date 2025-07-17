// API para processamento de certificados digitais
// Esta abordagem é mais segura que fazer parsing no frontend

import { supabase } from '../lib/supabase';

/**
 * Extrai informações do certificado digital usando Edge Function
 * Esta é a abordagem recomendada para segurança
 */
export const extractCertificateInfo = async (file, password) => {
  try {
    // Converter arquivo para base64 para envio seguro
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Chamar Edge Function do Supabase para processar o certificado
    const { data, error } = await supabase.functions.invoke('certificate-parser', {
      body: {
        certificateData: base64,
        password: password,
        filename: file.name
      }
    });

    if (error) {
      throw new Error(error.message || 'Erro ao processar certificado no servidor');
    }

    if (data && data.success) {
      return {
        nome: data.info.commonName || file.name.replace(/\.[^/.]+$/, ""),
        validade: data.info.validTo,
        status: data.info.isValid ? 'ativo' : 'vencido',
        emissor: data.info.issuer,
        validadeInicio: data.info.validFrom,
        cnpj: data.info.cnpj,
        metodoExtracao: 'backend_secure'
      };
    } else {
      throw new Error(data?.message || 'Falha ao extrair informações do certificado');
    }

  } catch (error) {
    // Fallback: tentar extração básica no frontend (menos seguro)
    return await extractCertificateInfoFallback(file, password);
  }
};

/**
 * Valida se a senha do certificado está correta
 */
export const validateCertificatePassword = async (file, password) => {
  try {
    // Importar node-forge dinamicamente
    const forge = await import('node-forge');

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Converter para string binária (formato que o forge espera)
    let binaryString = '';
    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }

    // Converter para ASN.1
    const asn1 = forge.asn1.fromDer(binaryString);

    // Tentar extrair PKCS#12 com a senha fornecida
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);

    // Verificar se conseguiu extrair certificados
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certificates = certBags[forge.pki.oids.certBag];

    if (!certificates || certificates.length === 0) {
      return { valid: false, error: 'Nenhum certificado encontrado no arquivo' };
    }

    // Verificar se conseguiu extrair chaves privadas
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keys = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];

    if (!keys || keys.length === 0) {
      return { valid: false, error: 'Nenhuma chave privada encontrada - senha pode estar incorreta' };
    }

    // Se chegou até aqui, a senha está correta
    return { valid: true };

  } catch (error) {
    // Erros comuns de senha incorreta
    if (error.message.includes('Invalid password') ||
        error.message.includes('PKCS#12 MAC could not be verified') ||
        error.message.includes('Unable to read PKCS#12') ||
        error.message.includes('Invalid PKCS#12')) {
      return { valid: false, error: 'Senha incorreta' };
    }

    // Outros erros
    return { valid: false, error: `Erro ao validar certificado: ${error.message}` };
  }
};

/**
 * Extração usando node-forge - biblioteca padrão para certificados
 */
const extractCertificateInfoFallback = async (file, password) => {
  try {
    // Primeiro validar a senha
    const passwordValidation = await validateCertificatePassword(file, password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.error);
    }

    // Importar node-forge dinamicamente
    const forge = await import('node-forge');

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Converter para string binária (formato que o forge espera)
    let binaryString = '';
    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }

    // Converter para ASN.1
    const asn1 = forge.asn1.fromDer(binaryString);

    // Extrair PKCS#12
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);

    // Extrair certificados
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certificates = certBags[forge.pki.oids.certBag];

    if (!certificates || certificates.length === 0) {
      throw new Error('Nenhum certificado encontrado no arquivo');
    }

    // Pegar o primeiro certificado
    const cert = certificates[0].cert;

    // Extrair informações
    const commonName = cert.subject.getField('CN')?.value || file.name.replace(/\.[^/.]+$/, "");
    const issuer = cert.issuer.getField('CN')?.value || 'Não extraído';
    const validFrom = cert.validity.notBefore;
    const validTo = cert.validity.notAfter;

    const now = new Date();
    const isValid = validTo > now && validFrom <= now;

    // Tentar extrair CNPJ do commonName
    let cnpjCertificado = null;
    if (commonName) {
      // Padrão comum: RAZAO SOCIAL:CNPJ ou NOME:CNPJ
      const cnpjMatch1 = commonName.match(/:(\d{14})/);
      if (cnpjMatch1) {
        cnpjCertificado = cnpjMatch1[1];
      } else {
        // Padrão alternativo: buscar 14 dígitos consecutivos
        const cnpjMatch2 = commonName.match(/(\d{14})/);
        if (cnpjMatch2) {
          cnpjCertificado = cnpjMatch2[1];
        }
      }
    }

    return {
      nome: commonName,
      validade: validTo.toISOString(),
      status: isValid ? 'ativo' : 'vencido',
      emissor: issuer,
      validadeInicio: validFrom.toISOString(),
      cnpj: cnpjCertificado,
      metodoExtracao: 'node_forge',
      senhaValidada: true
    };

  } catch (error) {
    // Se for erro de senha, propagar o erro
    if (error.message.includes('Senha incorreta') ||
        error.message.includes('senha pode estar incorreta')) {
      throw error;
    }

    // Outros erros - fallback básico
    return {
      nome: file.name.replace(/\.[^/.]+$/, ""),
      validade: null,
      status: 'ativo',
      emissor: 'Erro na extração',
      validadeInicio: null,
      metodoExtracao: 'basic_fallback',
      senhaValidada: false
    };
  }
};

// Função auxiliar para fazer parse de strings de data ASN.1
const parseASN1DateString = (dateStr, isGeneralizedTime) => {
  try {
    const numbersOnly = dateStr.replace(/[^0-9]/g, '');

    if (numbersOnly.length < 6) return null;

    let year, month, day, hour = 0, minute = 0, second = 0;

    if (isGeneralizedTime) {
      if (numbersOnly.length < 8) return null;
      year = parseInt(numbersOnly.substring(0, 4));
      month = parseInt(numbersOnly.substring(4, 6)) - 1;
      day = parseInt(numbersOnly.substring(6, 8));
      if (numbersOnly.length >= 10) hour = parseInt(numbersOnly.substring(8, 10));
      if (numbersOnly.length >= 12) minute = parseInt(numbersOnly.substring(10, 12));
      if (numbersOnly.length >= 14) second = parseInt(numbersOnly.substring(12, 14));
    } else {
      const yy = parseInt(numbersOnly.substring(0, 2));
      year = yy < 50 ? 2000 + yy : 1900 + yy;
      month = parseInt(numbersOnly.substring(2, 4)) - 1;
      day = parseInt(numbersOnly.substring(4, 6));
      if (numbersOnly.length >= 8) hour = parseInt(numbersOnly.substring(6, 8));
      if (numbersOnly.length >= 10) minute = parseInt(numbersOnly.substring(8, 10));
      if (numbersOnly.length >= 12) second = parseInt(numbersOnly.substring(10, 12));
    }

    if (year < 1970 || year > 2050 || month < 0 || month > 11 ||
        day < 1 || day > 31 || hour < 0 || hour > 23 ||
        minute < 0 || minute > 59 || second < 0 || second > 59) {
      return null;
    }

    return new Date(year, month, day, hour, minute, second);
  } catch (error) {
    return null;
  }
};



/**
 * Valida se um certificado está próximo do vencimento
 */
export const checkCertificateExpiry = (validityDate) => {
  if (!validityDate) return {
    status: 'unknown',
    message: 'Data de validade não disponível',
    color: 'red',
    daysRemaining: null
  };

  const now = new Date();
  const validity = new Date(validityDate);
  const daysRemaining = Math.ceil((validity.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      status: 'expired',
      message: 'VENCIDO',
      daysRemaining: daysRemaining,
      color: 'red'
    };
  } else if (daysRemaining <= 30) {
    return {
      status: 'expiring',
      message: `Vence em ${daysRemaining} dias`,
      daysRemaining: daysRemaining,
      color: 'yellow'
    };
  } else {
    return {
      status: 'valid',
      message: `${daysRemaining} dias restantes`,
      daysRemaining: daysRemaining,
      color: 'green'
    };
  }
};

/**
 * Verifica o status do certificado no backend local
 */
export const checkCertificateStatus = async (empresaId) => {
  try {
    // Configuração da URL do backend
    const getBackendUrl = () => {
      const origin = window.location.origin;
      return `${origin}/backend/public`;
    };

    const response = await fetch(`${getBackendUrl()}/check-certificado.php?empresa_id=${empresaId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Erro ao verificar status do certificado:', error);
    return {
      success: false,
      exists: false,
      error: error.message
    };
  }
};
