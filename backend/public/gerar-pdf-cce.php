<?php
/**
 * Endpoint para gerar PDF da Carta de Correção Eletrônica (CCe)
 * 
 * ESTRUTURA ORGANIZADA:
 * - XML: backend/storage/xml/empresa_id/CCe/2025/06/chave_cce_001.xml
 * - PDF: backend/storage/pdf/empresa_id/CCe/2025/06/chave_cce_001.pdf
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../vendor/autoload.php';
use NFePHP\DA\CCe\Dace;

try {
    
    // 1. Validar método HTTP
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método não permitido. Use POST.');
    }
    
    // 2. Receber e validar dados JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Dados JSON inválidos');
    }
    
    // 3. Validar parâmetros obrigatórios
    $chave = $input['chave'] ?? null;
    $empresaId = $input['empresa_id'] ?? null;
    $sequencia = $input['sequencia'] ?? 1;
    
    // 4. Validações específicas
    if (!$chave || strlen($chave) !== 44) {
        throw new Exception('Chave NFe inválida');
    }
    
    if (!$empresaId) {
        throw new Exception('empresa_id é obrigatório');
    }
    
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $empresaId)) {
        throw new Exception('empresa_id inválido');
    }
    
    if (!is_numeric($sequencia) || $sequencia < 1 || $sequencia > 20) {
        throw new Exception('Sequência deve ser um número entre 1 e 20');
    }
    
    error_log("📄 PDF CCe - Chave: {$chave}, Empresa: {$empresaId}, Sequência: {$sequencia}");
    
    // 5. Buscar XML da CCe na estrutura organizada
    $xmlCceDir = "../storage/xml/empresa_{$empresaId}/CCe";
    $nomeArquivoCce = $chave . '_cce_' . str_pad($sequencia, 3, '0', STR_PAD_LEFT) . '.xml';
    $xmlEncontrado = null;
    
    // Função para buscar XML recursivamente
    function buscarXMLCce($dir, $nomeArquivo) {
        if (!is_dir($dir)) {
            return null;
        }
        
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS)
        );
        
        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getFilename() === $nomeArquivo) {
                return $file->getPathname();
            }
        }
        
        return null;
    }
    
    $xmlEncontrado = buscarXMLCce($xmlCceDir, $nomeArquivoCce);
    
    if (!$xmlEncontrado || !file_exists($xmlEncontrado)) {
        throw new Exception('XML da Carta de Correção não encontrado');
    }
    
    error_log("📄 PDF CCe - XML encontrado: {$xmlEncontrado}");
    
    // 6. Ler conteúdo do XML
    $xmlContent = file_get_contents($xmlEncontrado);
    
    if (!$xmlContent) {
        throw new Exception('Erro ao ler XML da Carta de Correção');
    }
    
    // 7. Buscar XML da NFe original (necessário para o DACE)
    $xmlNfeDir = "../storage/xml/empresa_{$empresaId}/Autorizados";
    $nomeArquivoNfe = $chave . '.xml';
    
    function buscarXMLNfe($dir, $nomeArquivo) {
        if (!is_dir($dir)) {
            return null;
        }
        
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS)
        );
        
        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getFilename() === $nomeArquivo) {
                return $file->getPathname();
            }
        }
        
        return null;
    }
    
    $xmlNfeEncontrado = buscarXMLNfe($xmlNfeDir, $nomeArquivoNfe);
    
    if (!$xmlNfeEncontrado || !file_exists($xmlNfeEncontrado)) {
        throw new Exception('XML da NFe original não encontrado');
    }
    
    $xmlNfeContent = file_get_contents($xmlNfeEncontrado);
    
    if (!$xmlNfeContent) {
        throw new Exception('Erro ao ler XML da NFe original');
    }
    
    error_log("📄 PDF CCe - XML NFe original encontrado: {$xmlNfeEncontrado}");
    
    // 8. Gerar PDF da CCe usando método nativo da biblioteca
    $dace = new Dace($xmlNfeContent, $xmlContent);
    $dace->debugMode(false);
    $dace->creditsIntegratorFooter('Sistema Nexo PDV');
    
    // 9. Configurações opcionais do DACE
    if (isset($input['logo_path']) && file_exists($input['logo_path'])) {
        $dace->logoParameters($input['logo_path'], 'C', true);
    }
    
    // 10. Gerar PDF
    $pdfContent = $dace->render();
    
    if (!$pdfContent) {
        throw new Exception('Erro ao gerar PDF da Carta de Correção');
    }
    
    error_log("📄 PDF CCe - PDF gerado com sucesso - " . strlen($pdfContent) . " bytes");
    
    // 11. Salvar PDF na estrutura organizada
    $pdfCceDir = "../storage/pdf/empresa_{$empresaId}/CCe/" . date('Y/m');
    if (!is_dir($pdfCceDir)) {
        mkdir($pdfCceDir, 0755, true);
        error_log("📁 PDF CCe - Diretório criado: {$pdfCceDir}");
    }
    
    $nomeArquivoPdf = $chave . '_cce_' . str_pad($sequencia, 3, '0', STR_PAD_LEFT) . '.pdf';
    $pdfPath = "{$pdfCceDir}/{$nomeArquivoPdf}";
    $result = file_put_contents($pdfPath, $pdfContent);
    
    if ($result === false) {
        throw new Exception('Falha ao salvar arquivo PDF da CCe');
    }
    
    // 12. Verificar se arquivo foi salvo corretamente
    if (!file_exists($pdfPath) || filesize($pdfPath) < 1000) {
        throw new Exception('PDF da CCe salvo mas arquivo inválido ou muito pequeno');
    }
    
    error_log("📄 PDF CCe - PDF salvo com sucesso em: {$pdfPath}");
    error_log("📄 PDF CCe - Tamanho do arquivo: " . filesize($pdfPath) . " bytes");
    
    // 13. Retornar sucesso
    echo json_encode([
        'success' => true,
        'message' => 'PDF da Carta de Correção gerado com sucesso',
        'data' => [
            'chave' => $chave,
            'sequencia' => $sequencia,
            'pdf_path' => $pdfPath,
            'pdf_nome' => $nomeArquivoPdf,
            'tamanho' => filesize($pdfPath),
            'url_download' => "/backend/public/download-arquivo.php?type=pdf_cce&chave={$chave}&empresa_id={$empresaId}&sequencia={$sequencia}",
            'url_visualizar' => "/backend/public/download-arquivo.php?type=pdf_cce&chave={$chave}&empresa_id={$empresaId}&sequencia={$sequencia}&action=view"
        ]
    ]);
    
} catch (Exception $e) {
    error_log("❌ ERRO PDF CCe: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
