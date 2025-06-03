import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { showMessage } from '../utils/toast';

interface CertificateUploadResult {
  success: boolean;
  data?: {
    empresa_id: string;
    filename: string;
    validade: string;
    nome_certificado: string;
    path: string;
  };
  error?: string;
}

// Configuração da URL do backend
const getBackendUrl = () => {
  // Agora sempre usar o mesmo domínio (produção com Nginx)
  const origin = window.location.origin;
  return `${origin}/backend/public`;
};

export const useCertificateUpload = () => {
  const [isUploading, setIsUploading] = useState(false);

  const uploadCertificateLocal = async (
    file: File, 
    password: string, 
    empresaId: string
  ): Promise<CertificateUploadResult> => {
    setIsUploading(true);

    try {
      // Validações básicas
      if (!file || !password.trim() || !empresaId) {
        throw new Error('Arquivo, senha e ID da empresa são obrigatórios');
      }

      // Validar tipo de arquivo
      const allowedExtensions = ['pfx', 'p12'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        throw new Error('Arquivo deve ser .pfx ou .p12');
      }

      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Arquivo muito grande. Máximo 5MB');
      }

      // Preparar FormData para envio
      const formData = new FormData();
      formData.append('certificado', file);
      formData.append('senha', password);
      formData.append('empresa_id', empresaId);

      // Fazer upload para o backend local
      const backendUrl = `${getBackendUrl()}/upload-certificado.php`;
      console.log('🔗 Fazendo upload para:', backendUrl);
      console.log('🌐 Origin atual:', window.location.origin);

      const response = await fetch(backendUrl, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar certificado');
      }

      // Atualizar metadados no Supabase
      const { error: updateError } = await supabase
        .from('empresas')
        .update({
          certificado_digital_path: result.data.path,
          certificado_digital_senha: password, // Em produção, considere criptografar
          certificado_digital_validade: result.data.validade,
          certificado_digital_status: 'ativo',
          certificado_digital_nome: result.data.nome_certificado,
          certificado_digital_uploaded_at: new Date().toISOString(),
          certificado_digital_local: true // Flag para indicar que está no storage local
        })
        .eq('id', empresaId);

      if (updateError) {
        console.warn('Erro ao atualizar metadados no Supabase:', updateError);
        // Não falhar aqui, pois o certificado já foi salvo localmente
      }

      showMessage('success', 'Certificado digital enviado com sucesso!');

      return {
        success: true,
        data: result.data
      };

    } catch (error: any) {
      console.error('❌ Erro no upload do certificado:', error);
      
      // Mensagens de erro específicas
      let errorMessage = error.message;
      
      if (error.message.includes('Senha') || error.message.includes('senha')) {
        errorMessage = '🔐 Senha do certificado incorreta. Verifique e tente novamente.';
      } else if (error.message.includes('arquivo')) {
        errorMessage = '📄 Erro no arquivo do certificado. Verifique se é um arquivo .pfx ou .p12 válido.';
      }

      showMessage('error', errorMessage);

      return {
        success: false,
        error: errorMessage
      };

    } finally {
      setIsUploading(false);
    }
  };

  const removeCertificateLocal = async (empresaId: string): Promise<boolean> => {
    try {
      // Remover do storage local
      const backendUrl = `${getBackendUrl()}/remove-certificado.php`;
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empresa_id: empresaId
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao remover certificado');
      }

      // Limpar metadados no Supabase
      const { error: updateError } = await supabase
        .from('empresas')
        .update({
          certificado_digital_path: null,
          certificado_digital_senha: null,
          certificado_digital_validade: null,
          certificado_digital_status: null,
          certificado_digital_nome: null,
          certificado_digital_uploaded_at: null,
          certificado_digital_local: null
        })
        .eq('id', empresaId);

      if (updateError) {
        console.warn('Erro ao limpar metadados no Supabase:', updateError);
      }

      showMessage('success', 'Certificado removido com sucesso!');
      return true;

    } catch (error: any) {
      console.error('❌ Erro ao remover certificado:', error);
      showMessage('error', 'Erro ao remover certificado: ' + error.message);
      return false;
    }
  };

  const checkCertificateStatus = async (empresaId: string) => {
    try {
      const backendUrl = `${getBackendUrl()}/check-certificado.php?empresa_id=${empresaId}`;
      const response = await fetch(backendUrl);
      const result = await response.json();

      return result;
    } catch (error) {
      console.error('❌ Erro ao verificar status do certificado:', error);
      return { success: false, error: 'Erro ao verificar certificado' };
    }
  };

  return {
    uploadCertificateLocal,
    removeCertificateLocal,
    checkCertificateStatus,
    isUploading
  };
};
