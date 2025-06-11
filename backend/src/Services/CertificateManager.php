<?php

namespace Nexo\Services;

use Exception;

/**
 * Gerenciador de Certificados Digitais
 */
class CertificateManager
{
    private $certificatesPath;
    
    public function __construct($certificatesPath = null)
    {
        $this->certificatesPath = $certificatesPath ?? __DIR__ . '/../../storage/certificados';
        
        // Criar diretório se não existir
        if (!is_dir($this->certificatesPath)) {
            mkdir($this->certificatesPath, 0700, true);
        }
    }
    
    /**
     * Salva certificado no storage local (por CNPJ - método legado)
     */
    public function saveCertificate($cnpj, $certificateContent, $password, $metadata = [])
    {
        try {
            // Validar CNPJ
            $cnpj = preg_replace('/[^0-9]/', '', $cnpj);
            if (strlen($cnpj) !== 14) {
                throw new Exception("CNPJ inválido");
            }

            // Nome do arquivo baseado no CNPJ
            $filename = $cnpj . '.pfx';
            $filepath = $this->certificatesPath . '/' . $filename;

            // Salvar certificado
            if (file_put_contents($filepath, $certificateContent) === false) {
                throw new Exception("Erro ao salvar certificado");
            }

            // Definir permissões restritivas
            chmod($filepath, 0600);

            // Salvar metadados (senha, validade, etc.)
            $metadataFile = $this->certificatesPath . '/' . $cnpj . '.json';
            $metadata['password'] = $password;
            $metadata['created_at'] = date('Y-m-d H:i:s');
            $metadata['filename'] = $filename;

            file_put_contents($metadataFile, json_encode($metadata, JSON_PRETTY_PRINT));
            chmod($metadataFile, 0600);

            return [
                'success' => true,
                'cnpj' => $cnpj,
                'filename' => $filename,
                'path' => $filepath
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Salva certificado no storage local (por ID da empresa - recomendado)
     */
    public function saveCertificateByEmpresaId($empresaId, $certificateContent, $password, $metadata = [])
    {
        try {
            // Validar empresa ID
            if (empty($empresaId)) {
                throw new Exception("ID da empresa é obrigatório");
            }

            // Nome do arquivo baseado no ID da empresa
            $filename = 'empresa_' . $empresaId . '.pfx';
            $filepath = $this->certificatesPath . '/' . $filename;

            // Salvar certificado
            if (file_put_contents($filepath, $certificateContent) === false) {
                throw new Exception("Erro ao salvar certificado");
            }

            // Definir permissões restritivas
            chmod($filepath, 0600);

            // Salvar metadados (senha, validade, etc.)
            $metadataFile = $this->certificatesPath . '/empresa_' . $empresaId . '.json';
            $metadata['password'] = $password;
            $metadata['created_at'] = date('Y-m-d H:i:s');
            $metadata['filename'] = $filename;
            $metadata['empresa_id'] = $empresaId;

            file_put_contents($metadataFile, json_encode($metadata, JSON_PRETTY_PRINT));
            chmod($metadataFile, 0600);

            return [
                'success' => true,
                'empresa_id' => $empresaId,
                'filename' => $filename,
                'path' => $filepath
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Carrega certificado por CNPJ (método legado)
     */
    public function loadCertificate($cnpj)
    {
        try {
            $cnpj = preg_replace('/[^0-9]/', '', $cnpj);
            $filepath = $this->certificatesPath . '/' . $cnpj . '.pfx';
            $metadataFile = $this->certificatesPath . '/' . $cnpj . '.json';

            if (!file_exists($filepath)) {
                throw new Exception("Certificado não encontrado para CNPJ: " . $cnpj);
            }

            if (!file_exists($metadataFile)) {
                throw new Exception("Metadados do certificado não encontrados");
            }

            $content = file_get_contents($filepath);
            $metadata = json_decode(file_get_contents($metadataFile), true);

            return [
                'success' => true,
                'content' => $content,
                'password' => $metadata['password'],
                'metadata' => $metadata
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Carrega certificado por ID da empresa (recomendado)
     */
    public function loadCertificateByEmpresaId($empresaId)
    {
        try {
            if (empty($empresaId)) {
                throw new Exception("ID da empresa é obrigatório");
            }

            $filepath = $this->certificatesPath . '/empresa_' . $empresaId . '.pfx';
            $metadataFile = $this->certificatesPath . '/empresa_' . $empresaId . '.json';

            if (!file_exists($filepath)) {
                throw new Exception("Certificado não encontrado para empresa: " . $empresaId);
            }

            if (!file_exists($metadataFile)) {
                throw new Exception("Metadados do certificado não encontrados");
            }

            $content = file_get_contents($filepath);
            $metadata = json_decode(file_get_contents($metadataFile), true);

            return [
                'success' => true,
                'content' => $content,
                'password' => $metadata['password'],
                'metadata' => $metadata
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Lista certificados disponíveis
     */
    public function listCertificates()
    {
        try {
            $certificates = [];
            $files = glob($this->certificatesPath . '/*.pfx');
            
            foreach ($files as $file) {
                $cnpj = basename($file, '.pfx');
                $metadataFile = $this->certificatesPath . '/' . $cnpj . '.json';
                
                if (file_exists($metadataFile)) {
                    $metadata = json_decode(file_get_contents($metadataFile), true);
                    $certificates[] = [
                        'cnpj' => $cnpj,
                        'filename' => basename($file),
                        'created_at' => $metadata['created_at'] ?? null,
                        'size' => filesize($file)
                    ];
                }
            }
            
            return [
                'success' => true,
                'certificates' => $certificates
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Remove certificado (por CNPJ - método legado)
     */
    public function removeCertificate($cnpj)
    {
        try {
            $cnpj = preg_replace('/[^0-9]/', '', $cnpj);
            $filepath = $this->certificatesPath . '/' . $cnpj . '.pfx';
            $metadataFile = $this->certificatesPath . '/' . $cnpj . '.json';

            $removed = [];

            if (file_exists($filepath)) {
                unlink($filepath);
                $removed[] = 'certificado';
            }

            if (file_exists($metadataFile)) {
                unlink($metadataFile);
                $removed[] = 'metadados';
            }

            if (empty($removed)) {
                throw new Exception("Certificado não encontrado");
            }

            return [
                'success' => true,
                'removed' => $removed
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Remove certificado (por ID da empresa - recomendado)
     */
    public function removeCertificateByEmpresaId($empresaId)
    {
        try {
            if (empty($empresaId)) {
                throw new Exception("ID da empresa é obrigatório");
            }

            $filepath = $this->certificatesPath . '/empresa_' . $empresaId . '.pfx';
            $metadataFile = $this->certificatesPath . '/empresa_' . $empresaId . '.json';

            $removed = [];

            if (file_exists($filepath)) {
                unlink($filepath);
                $removed[] = 'certificado';
            }

            if (file_exists($metadataFile)) {
                unlink($metadataFile);
                $removed[] = 'metadados';
            }

            if (empty($removed)) {
                throw new Exception("Certificado não encontrado para empresa: " . $empresaId);
            }

            return [
                'success' => true,
                'removed' => $removed
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Valida certificado
     */
    public function validateCertificate($cnpj)
    {
        try {
            $result = $this->loadCertificate($cnpj);

            if (!$result['success']) {
                return $result;
            }

            // Aqui você pode adicionar validações específicas
            // como verificar se o certificado não expirou

            return [
                'success' => true,
                'valid' => true,
                'cnpj' => $cnpj
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Método unificado para obter certificado por empresa_id
     * Retorna path e password para uso direto na sped-nfe
     */
    public function getCertificateByEmpresaId($empresaId)
    {
        try {
            if (empty($empresaId)) {
                throw new Exception("ID da empresa é obrigatório");
            }

            $filepath = $this->certificatesPath . '/empresa_' . $empresaId . '.pfx';
            $metadataFile = $this->certificatesPath . '/empresa_' . $empresaId . '.json';

            if (!file_exists($filepath)) {
                throw new Exception("Certificado digital não encontrado para esta empresa. Faça o upload do certificado nas configurações da empresa.");
            }

            if (!file_exists($metadataFile)) {
                throw new Exception("Metadados do certificado não encontrados. Faça o upload do certificado novamente.");
            }

            $metadata = json_decode(file_get_contents($metadataFile), true);

            if (!isset($metadata['password'])) {
                throw new Exception("Senha do certificado não encontrada nos metadados.");
            }

            return [
                'success' => true,
                'path' => $filepath,
                'password' => $metadata['password'],
                'metadata' => $metadata
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}
