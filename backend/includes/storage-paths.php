<?php
/**
 * Funções helper para gerar caminhos de storage organizados por modelo de documento
 * 
 * ESTRUTURA:
 * storage/{tipo}/empresa_{id}/{ambiente}/{modelo}/{status}/{ano}/{mes}/
 * 
 * Modelos:
 * - 55: NFe (Nota Fiscal Eletrônica)
 * - 65: NFCe (Nota Fiscal de Consumidor Eletrônica)
 */

/**
 * Gera caminho para armazenamento de XMLs
 * 
 * @param string $empresaId ID da empresa
 * @param string $ambiente 'homologacao' ou 'producao'
 * @param string $modelo '55' (NFe) ou '65' (NFCe)
 * @param string $status 'Autorizados', 'Cancelados' ou 'CCe'
 * @param string|null $ano Ano (YYYY) - se null, usa ano atual
 * @param string|null $mes Mês (MM) - se null, usa mês atual
 * @return string Caminho completo para XMLs
 */
function getXmlPath($empresaId, $ambiente, $modelo, $status, $ano = null, $mes = null) {
    $ano = $ano ?: date('Y');
    $mes = $mes ?: date('m');

    // ✅ CORRIGIDO: Usar caminho correto onde os arquivos são realmente salvos
    return "/root/nexo/nexo-pedidos/backend/storage/xml/empresa_{$empresaId}/{$ambiente}/{$modelo}/{$status}/{$ano}/{$mes}";
}

/**
 * Gera caminho para armazenamento de PDFs
 * 
 * @param string $empresaId ID da empresa
 * @param string $ambiente 'homologacao' ou 'producao'
 * @param string $modelo '55' (NFe) ou '65' (NFCe)
 * @param string $status 'Autorizados' ou 'CCe' (Cancelados não geram PDF)
 * @param string|null $ano Ano (YYYY) - se null, usa ano atual
 * @param string|null $mes Mês (MM) - se null, usa mês atual
 * @return string Caminho completo para PDFs
 */
function getPdfPath($empresaId, $ambiente, $modelo, $status, $ano = null, $mes = null) {
    $ano = $ano ?: date('Y');
    $mes = $mes ?: date('m');

    // ✅ CORRIGIDO: Usar caminho correto onde os arquivos são realmente salvos
    return "/root/nexo/nexo-pedidos/backend/storage/pdf/empresa_{$empresaId}/{$ambiente}/{$modelo}/{$status}/{$ano}/{$mes}";
}

/**
 * Gera caminho para armazenamento de Espelhos
 * 
 * @param string $empresaId ID da empresa
 * @param string $ambiente 'homologacao' ou 'producao'
 * @param string $modelo '55' (NFe) ou '65' (NFCe)
 * @return string Caminho completo para Espelhos
 */
function getEspelhoPath($empresaId, $ambiente, $modelo) {
    return "/root/nexo/nexo-pedidos/backend/storage/espelhos/{$empresaId}/{$ambiente}/{$modelo}";
}

/**
 * Gera caminho relativo para download público
 * 
 * @param string $tipo 'xml', 'pdf' ou 'espelhos'
 * @param string $empresaId ID da empresa
 * @param string $ambiente 'homologacao' ou 'producao'
 * @param string $modelo '55' (NFe) ou '65' (NFCe)
 * @param string|null $status Status do documento (não usado para espelhos)
 * @param string|null $ano Ano (YYYY)
 * @param string|null $mes Mês (MM)
 * @return string Caminho relativo para download
 */
function getDownloadPath($tipo, $empresaId, $ambiente, $modelo, $status = null, $ano = null, $mes = null) {
    $basePath = "../storage/{$tipo}/empresa_{$empresaId}/{$ambiente}/{$modelo}";
    
    if ($tipo === 'espelhos') {
        return $basePath;
    }
    
    $ano = $ano ?: date('Y');
    $mes = $mes ?: date('m');
    
    return "{$basePath}/{$status}/{$ano}/{$mes}";
}

/**
 * Cria diretório se não existir
 * 
 * @param string $caminho Caminho do diretório
 * @param int $permissoes Permissões do diretório (padrão: 0755)
 * @return bool True se criado com sucesso ou já existe
 */
function criarDiretorio($caminho, $permissoes = 0755) {
    if (is_dir($caminho)) {
        return true;
    }
    
    return mkdir($caminho, $permissoes, true);
}

/**
 * Determina o modelo baseado no tipo de documento
 * 
 * @param string $tipoDocumento Tipo do documento ('nfe', 'nfce', etc.)
 * @return string Código do modelo ('55' ou '65')
 */
function getModeloPorTipo($tipoDocumento) {
    switch (strtolower($tipoDocumento)) {
        case 'nfe':
        case 'nota_fiscal':
            return '55';
        case 'nfce':
        case 'nota_consumidor':
            return '65';
        default:
            return '55'; // Padrão NFe
    }
}

/**
 * Gera nome de arquivo baseado no modelo e tipo
 * 
 * @param string $chave Chave da NFe/NFCe
 * @param string $modelo '55' ou '65'
 * @param string $tipo 'xml', 'pdf'
 * @param string|null $sufixo Sufixo adicional (ex: '_cce_001')
 * @return string Nome do arquivo
 */
function gerarNomeArquivo($chave, $modelo, $tipo, $sufixo = '') {
    $prefixo = $modelo === '65' ? 'nfce_' : 'nfe_';
    return $prefixo . $chave . $sufixo . '.' . $tipo;
}

/**
 * Valida se o ambiente é válido
 * 
 * @param string $ambiente Ambiente a validar
 * @return bool True se válido
 */
function validarAmbiente($ambiente) {
    return in_array($ambiente, ['homologacao', 'producao']);
}

/**
 * Valida se o modelo é válido
 * 
 * @param string $modelo Modelo a validar
 * @return bool True se válido
 */
function validarModelo($modelo) {
    return in_array($modelo, ['55', '65']);
}

/**
 * Valida se o status é válido para o tipo
 * 
 * @param string $status Status a validar
 * @param string $tipo Tipo de arquivo ('xml' ou 'pdf')
 * @return bool True se válido
 */
function validarStatus($status, $tipo) {
    $statusValidos = ['Autorizados', 'CCe'];
    
    // XML também permite Cancelados
    if ($tipo === 'xml') {
        $statusValidos[] = 'Cancelados';
    }
    
    return in_array($status, $statusValidos);
}

/**
 * Exemplo de uso das funções
 */
function exemploUso() {
    $empresaId = 'acd26a4f-7220-405e-9c96-faffb7e6480e';
    $ambiente = 'homologacao';
    $modelo = '55'; // NFe
    
    // Caminhos para NFe
    echo "📁 EXEMPLOS DE CAMINHOS:\n";
    echo "XML Autorizado: " . getXmlPath($empresaId, $ambiente, $modelo, 'Autorizados') . "\n";
    echo "PDF Autorizado: " . getPdfPath($empresaId, $ambiente, $modelo, 'Autorizados') . "\n";
    echo "XML CCe: " . getXmlPath($empresaId, $ambiente, $modelo, 'CCe') . "\n";
    echo "PDF CCe: " . getPdfPath($empresaId, $ambiente, $modelo, 'CCe') . "\n";
    echo "Espelho: " . getEspelhoPath($empresaId, $ambiente, $modelo) . "\n";
    
    // Caminhos para NFCe (futuro)
    $modeloNFCe = '65';
    echo "\n📱 CAMINHOS PARA NFCe (FUTURO):\n";
    echo "XML NFCe: " . getXmlPath($empresaId, $ambiente, $modeloNFCe, 'Autorizados') . "\n";
    echo "PDF NFCe: " . getPdfPath($empresaId, $ambiente, $modeloNFCe, 'Autorizados') . "\n";
    echo "Espelho NFCe: " . getEspelhoPath($empresaId, $ambiente, $modeloNFCe) . "\n";
}

// Executar exemplo se chamado diretamente
if (basename(__FILE__) === basename($_SERVER['SCRIPT_NAME'])) {
    exemploUso();
}
?>
