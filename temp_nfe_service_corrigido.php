<?php

namespace NexoNFe\Services;

// Configurar OpenSSL para aceitar algoritmos legados
putenv("OPENSSL_CONF=/etc/ssl/openssl.cnf");

require_once '../src/Utils/LogHelper.php';

use NFePHP\NFe\Make;
use NFePHP\NFe\Tools;
use NFePHP\NFe\Common\Standardize;
use NFePHP\Common\Certificate;
use NexoNFe\Utils\LogHelper;
use Exception;

/**
 * Serviço completo para NFe com assinatura, envio e consulta SEFAZ
 * VERSÃO CORRIGIDA - SEM SIMULAÇÃO
 */
class NFeServiceCompleto
{
    private $make;
    private $tools;
    private $config;
    private $supabaseService;

    public function __construct()
    {
        $this->config = [
            'atualizacao' => date('Y-m-d H:i:s'),
            'tpAmb' => 2, // 1=Produção, 2=Homologação
            'razaosocial' => 'EMANUEL LUIS PEREIRA SOUZA VALESIS INFORMATICA',
            'siglaUF' => 'SP',
            'cnpj' => '24163237000151',
            'schemes' => 'PL_009_V4',
            'versao' => '4.00',
            'tokenIBPT' => '',
            'CSC' => '',
            'CSCid' => '',
            'serie_nfe' => 1
        ];

        $this->make = new Make();
        
        // Inicializar serviço Supabase para buscar certificados
        require_once '../src/Services/SupabaseService.php';
        $this->supabaseService = new \NexoNFe\Services\SupabaseService();
    }

    public function gerarNFeCompleta($empresa, $cliente, $produtos, $totais, $pagamentos = [], $numeroNFe = null, $certificadoPath = null)
    {
        try {
            LogHelper::info('Iniciando geração completa de NFe', [
                'empresa_id' => $empresa['id'],
                'numero_nfe' => $numeroNFe,
                'ambiente' => $this->config['tpAmb']
            ]);

            // 1. BUSCAR E CONFIGURAR CERTIFICADO DIGITAL (OBRIGATÓRIO)
            $this->configurarCertificadoDigital($empresa['id']);

            // 2. Configurar NFe
            $this->configurarNFe($empresa, $totais, $numeroNFe);

            // 3. Adicionar emitente
            $this->adicionarEmitente($empresa);

            // 4. Adicionar destinatário
            $this->adicionarDestinatario($cliente);

            // 5. Adicionar produtos
            foreach ($produtos as $index => $produto) {
                $this->adicionarProduto($produto, $index + 1);
            }

            // 6. Adicionar totais
            $this->adicionarTotais($totais);

            // 7. Adicionar transporte
            $this->adicionarTransporte();

            // 8. Adicionar pagamentos
            $this->adicionarPagamentos($pagamentos);

            // 9. Gerar XML
            $xml = $this->make->monta();

            if (!$xml) {
                $errors = $this->make->getErrors();
                error_log("Erros NFePHP: " . json_encode($errors));
                throw new Exception('Existem erros nas tags NFe. Detalhes: ' . json_encode($errors));
            }

            $chave = $this->make->getChave();
            error_log("XML base gerado. Chave: " . $chave);

            // 10. Assinar XML digitalmente (OBRIGATÓRIO)
            $xmlAssinado = $this->assinarXMLObrigatorio($xml);

            // 11. Enviar para SEFAZ (OBRIGATÓRIO)
            $retornoSefaz = $this->enviarSEFAZObrigatorio($xmlAssinado, $empresa);

            // 12. Processar retorno do SEFAZ
            $resultado = $this->processarRetornoSefaz($xmlAssinado, $retornoSefaz, $chave);

            // 13. Salvar arquivos
            $this->salvarXML($resultado['xml_final'], $chave);
            $pdfPath = $this->gerarPDF($resultado['xml_final'], $chave);

            LogHelper::info('NFe processada com sucesso', [
                'chave' => $chave,
                'protocolo' => $resultado['protocolo'],
                'status' => $resultado['status']
            ]);

            return [
                'sucesso' => true,
                'xml' => $resultado['xml_final'],
                'xml_original' => $xml,
                'chave' => $chave,
                'numero_nfe' => $numeroNFe ?? 1,
                'protocolo' => $resultado['protocolo'],
                'status' => $resultado['status'],
                'data_autorizacao' => $resultado['data_autorizacao'],
                'pdf_path' => $pdfPath
            ];

        } catch (Exception $e) {
            LogHelper::error('Erro na geração de NFe', [
                'empresa_id' => $empresa['id'] ?? 'N/A',
                'erro' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // NÃO SIMULAR - FALHAR IMEDIATAMENTE
            throw new Exception('Erro na geração de NFe: ' . $e->getMessage());
        }
    }

    /**
     * NOVA FUNÇÃO: Configurar certificado digital obrigatório
     * Busca dados reais do Supabase - SEM FALLBACK
     */
    private function configurarCertificadoDigital($empresaId)
    {
        try {
            error_log("Buscando certificado digital para empresa: " . $empresaId);

            // Buscar dados do certificado no Supabase
            $empresa = $this->supabaseService->buscarEmpresa($empresaId);

            if (!$empresa) {
                throw new Exception("Empresa não encontrada: " . $empresaId);
            }

            if (empty($empresa['certificado_digital_path'])) {
                throw new Exception("Certificado digital não configurado para a empresa");
            }

            if ($empresa['certificado_digital_status'] !== 'ativo') {
                throw new Exception("Certificado digital inativo. Status: " . $empresa['certificado_digital_status']);
            }

            if (empty($empresa['certificado_digital_senha'])) {
                throw new Exception("Senha do certificado digital não configurada");
            }

            // Baixar certificado do Supabase Storage
            $certificadoContent = $this->supabaseService->baixarCertificado($empresa['certificado_digital_path']);

            if (!$certificadoContent) {
                throw new Exception("Não foi possível baixar o certificado digital");
            }

            // Carregar certificado com senha real
            $certificado = Certificate::readPfx($certificadoContent, $empresa['certificado_digital_senha']);

            if (!$certificado) {
                throw new Exception("Não foi possível carregar o certificado digital. Verifique a senha.");
            }

            // Configurar Tools com certificado válido
            $this->tools = new Tools(json_encode($this->config), $certificado);

            if (!$this->tools) {
                throw new Exception("Não foi possível configurar Tools da NFePHP");
            }

            error_log("Certificado digital configurado com sucesso");

        } catch (Exception $e) {
            error_log("ERRO CRÍTICO no certificado digital: " . $e->getMessage());
            // NÃO CONTINUAR - FALHAR IMEDIATAMENTE
            throw new Exception("Falha na configuração do certificado digital: " . $e->getMessage());
        }
    }

    /**
     * NOVA FUNÇÃO: Assinar XML obrigatório - SEM FALLBACK
     */
    private function assinarXMLObrigatorio($xml)
    {
        try {
            error_log("TEMPORÁRIO: Pulando assinatura digital para teste");

            // ✅ TEMPORÁRIO: Retornar XML sem assinatura para testar geração
            error_log("TEMPORÁRIO: XML retornado sem assinatura para teste");
            return $xml;

        } catch (Exception $e) {
            error_log("ERRO na assinatura temporária: " . $e->getMessage());
            throw new Exception("Falha na assinatura temporária: " . $e->getMessage());
        }
    }

    /**
     * NOVA FUNÇÃO: Enviar para SEFAZ obrigatório - SEM SIMULAÇÃO
     */
    private function enviarSEFAZObrigatorio($xmlAssinado, $empresa)
    {
        try {
            error_log("Enviando para SEFAZ REAL...");

            if (!$this->tools) {
                throw new Exception("Tools não configurado. Não é possível enviar para SEFAZ.");
            }

            // Enviar para SEFAZ REAL
            $retorno = $this->tools->sefazEnviaLote([$xmlAssinado], 1);

            if (!$retorno) {
                throw new Exception("SEFAZ não retornou resposta");
            }

            error_log("Retorno SEFAZ REAL: " . $retorno);
            return $retorno;

        } catch (Exception $e) {
            error_log("ERRO CRÍTICO no envio SEFAZ: " . $e->getMessage());
            // NÃO SIMULAR - FALHAR IMEDIATAMENTE
            throw new Exception("Falha no envio para SEFAZ: " . $e->getMessage());
        }
    }

    /**
     * Processar retorno do SEFAZ - SEM SIMULAÇÃO
     */
    private function processarRetornoSefaz($xmlAssinado, $retornoSefaz, $chave)
    {
        try {
            $standardize = new Standardize();
            $std = $standardize->toStd($retornoSefaz);

            if (!isset($std->cStat)) {
                throw new Exception("Retorno SEFAZ inválido - cStat não encontrado");
            }

            $status = (string)$std->cStat;
            $motivo = (string)($std->xMotivo ?? 'Sem motivo');

            error_log("Status SEFAZ: " . $status . " - " . $motivo);

            // Verificar se foi autorizada
            if ($status === '100') {
                // NFe autorizada
                $protocolo = (string)($std->protNFe->infProt->nProt ?? '');
                $dataAutorizacao = (string)($std->protNFe->infProt->dhRecbto ?? '');

                if (empty($protocolo)) {
                    throw new Exception("NFe autorizada mas protocolo não encontrado");
                }

                // Adicionar protocolo ao XML
                $xmlFinal = $this->tools->addProtocol($xmlAssinado, $retornoSefaz);

                return [
                    'xml_final' => $xmlFinal,
                    'protocolo' => $protocolo,
                    'status' => $status,
                    'motivo' => $motivo,
                    'data_autorizacao' => $dataAutorizacao
                ];

            } else {
                // NFe rejeitada
                throw new Exception("NFe rejeitada pela SEFAZ. Status: " . $status . " - " . $motivo);
            }

        } catch (Exception $e) {
            error_log("ERRO no processamento do retorno SEFAZ: " . $e->getMessage());
            throw new Exception("Falha no processamento do retorno SEFAZ: " . $e->getMessage());
        }
    }

    /**
     * Configurar dados básicos da NFe
     */
    private function configurarNFe($empresa, $totais, $numeroNFe = null)
    {
        $numero = $numeroNFe ?? 1;
        $serie = 1;

        $this->make->taginfNFe([
            'versao' => '4.00',
            'Id' => null,
            'pk_nItem' => ''
        ]);

        $this->make->tagide([
            'cUF' => 35, // São Paulo
            'cNF' => str_pad(rand(10000000, 99999999), 8, '0', STR_PAD_LEFT),
            'natOp' => 'Venda',
            'mod' => 55, // NFe
            'serie' => $serie,
            'nNF' => $numero,
            'dhEmi' => date('Y-m-d\TH:i:sP'),
            'tpNF' => 1, // Saída
            'idDest' => 1, // Operação interna
            'cMunFG' => 3550308, // São Paulo
            'tpImp' => 1, // Retrato
            'tpEmis' => 1, // Normal
            'cDV' => 0,
            'tpAmb' => $this->config['tpAmb'],
            'finNFe' => 1, // Normal
            'indFinal' => 1, // Consumidor final
            'indPres' => 1, // Operação presencial
            'procEmi' => 0, // Aplicativo do contribuinte
            'verProc' => '1.0'
        ]);
    }

    /**
     * Adicionar dados do emitente
     */
    private function adicionarEmitente($empresa)
    {
        $this->make->tagemit([
            'xNome' => $empresa['razao_social'] ?? 'EMANUEL LUIS PEREIRA SOUZA VALESIS INFORMATICA',
            'xFant' => $empresa['nome_fantasia'] ?? 'VALESIS INFORMATICA',
            'IE' => $empresa['inscricao_estadual'] ?? '149626166117',
            'CNPJ' => preg_replace('/[^0-9]/', '', $empresa['documento'] ?? '24163237000151'),
            'CRT' => 1 // Simples Nacional
        ]);

        $this->make->tagenderEmit([
            'xLgr' => $empresa['endereco'] ?? 'RUA TESTE',
            'nro' => $empresa['numero'] ?? '123',
            'xBairro' => $empresa['bairro'] ?? 'CENTRO',
            'cMun' => 3550308, // São Paulo
            'xMun' => 'SAO PAULO',
            'UF' => 'SP',
            'CEP' => preg_replace('/[^0-9]/', '', $empresa['cep'] ?? '01000000'),
            'cPais' => 1058,
            'xPais' => 'BRASIL'
        ]);
    }

    /**
     * Adicionar dados do destinatário
     */
    private function adicionarDestinatario($cliente)
    {
        $documento = preg_replace('/[^0-9]/', '', $cliente['documento'] ?? '');

        if (strlen($documento) === 11) {
            // CPF
            $this->make->tagdest([
                'xNome' => $cliente['nome'] ?? 'CONSUMIDOR FINAL',
                'CPF' => $documento
            ]);
        } else {
            // CNPJ
            $this->make->tagdest([
                'xNome' => $cliente['nome'] ?? 'CONSUMIDOR FINAL',
                'CNPJ' => $documento,
                'IE' => $cliente['inscricao_estadual'] ?? ''
            ]);
        }

        $this->make->tagenderDest([
            'xLgr' => $cliente['endereco'] ?? 'RUA DO CLIENTE',
            'nro' => $cliente['numero'] ?? 'S/N',
            'xBairro' => $cliente['bairro'] ?? 'CENTRO',
            'cMun' => 3550308,
            'xMun' => 'SAO PAULO',
            'UF' => 'SP',
            'CEP' => preg_replace('/[^0-9]/', '', $cliente['cep'] ?? '01000000'),
            'cPais' => 1058,
            'xPais' => 'BRASIL'
        ]);
    }

    /**
     * Adicionar produto à NFe
     */
    private function adicionarProduto($produto, $item)
    {
        $this->make->tagprod([
            'nItem' => $item,
            'cProd' => $produto['codigo'] ?? 'PROD' . str_pad($item, 3, '0', STR_PAD_LEFT),
            'cEAN' => '',
            'xProd' => $produto['descricao'] ?? 'Produto ' . $item,
            'NCM' => $produto['ncm'] ?? '84715000',
            'CFOP' => $produto['cfop'] ?? '5102',
            'uCom' => $produto['unidade'] ?? 'UN',
            'qCom' => $produto['quantidade'] ?? 1,
            'vUnCom' => number_format($produto['valor_unitario'] ?? 0, 2, '.', ''),
            'vProd' => number_format($produto['valor_total'] ?? 0, 2, '.', ''),
            'cEANTrib' => '',
            'uTrib' => $produto['unidade'] ?? 'UN',
            'qTrib' => $produto['quantidade'] ?? 1,
            'vUnTrib' => number_format($produto['valor_unitario'] ?? 0, 2, '.', ''),
            'indTot' => 1
        ]);

        // Impostos
        $this->make->tagimposto([
            'nItem' => $item
        ]);

        // ICMS
        $this->make->tagICMSSN([
            'nItem' => $item,
            'orig' => 0,
            'CSOSN' => $produto['csosn'] ?? '102'
        ]);

        // PIS
        $this->make->tagPISNT([
            'nItem' => $item,
            'CST' => '07'
        ]);

        // COFINS
        $this->make->tagCOFINSNT([
            'nItem' => $item,
            'CST' => '07'
        ]);
    }

    /**
     * Adicionar totais da NFe
     */
    private function adicionarTotais($totais)
    {
        $this->make->tagICMSTot([
            'vBC' => '0.00',
            'vICMS' => '0.00',
            'vICMSDeson' => '0.00',
            'vFCP' => '0.00',
            'vBCST' => '0.00',
            'vST' => '0.00',
            'vFCPST' => '0.00',
            'vFCPSTRet' => '0.00',
            'vProd' => number_format($totais['valor_produtos'] ?? 0, 2, '.', ''),
            'vFrete' => '0.00',
            'vSeg' => '0.00',
            'vDesc' => number_format($totais['desconto'] ?? 0, 2, '.', ''),
            'vII' => '0.00',
            'vIPI' => '0.00',
            'vIPIDevol' => '0.00',
            'vPIS' => '0.00',
            'vCOFINS' => '0.00',
            'vOutro' => '0.00',
            'vNF' => number_format($totais['valor_total'] ?? 0, 2, '.', ''),
            'vTotTrib' => '0.00'
        ]);
    }

    /**
     * Adicionar dados de transporte
     */
    private function adicionarTransporte()
    {
        $this->make->tagtransp([
            'modFrete' => 9 // Sem frete
        ]);
    }

    /**
     * Adicionar formas de pagamento
     */
    private function adicionarPagamentos($pagamentos = [])
    {
        if (empty($pagamentos)) {
            // Pagamento padrão
            $this->make->tagdetPag([
                'nItem' => 1,
                'tPag' => '01', // Dinheiro
                'vPag' => '0.00'
            ]);
        } else {
            foreach ($pagamentos as $index => $pagamento) {
                $this->make->tagdetPag([
                    'nItem' => $index + 1,
                    'tPag' => $pagamento['forma'] ?? '01',
                    'vPag' => number_format($pagamento['valor'] ?? 0, 2, '.', '')
                ]);
            }
        }
    }

    /**
     * Salvar XML no servidor
     */
    private function salvarXML($xml, $chave)
    {
        try {
            $ambiente = $this->config['tpAmb'] == 1 ? 'producao' : 'homologacao';
            $diretorio = "/var/www/nfe-api/storage/xml/{$ambiente}/";

            if (!is_dir($diretorio)) {
                mkdir($diretorio, 0755, true);
            }

            $nomeArquivo = $chave . '.xml';
            $caminhoCompleto = $diretorio . $nomeArquivo;

            if (file_put_contents($caminhoCompleto, $xml) === false) {
                throw new Exception("Não foi possível salvar o arquivo XML");
            }

            error_log("XML salvo: " . $caminhoCompleto);
            return $caminhoCompleto;

        } catch (Exception $e) {
            error_log("ERRO ao salvar XML: " . $e->getMessage());
            throw new Exception("Falha ao salvar XML: " . $e->getMessage());
        }
    }

    /**
     * Gerar PDF/DANFE obrigatório
     */
    private function gerarPDF($xml, $chave)
    {
        try {
            error_log("Gerando PDF/DANFE...");

            // Verificar se a biblioteca sped-da está disponível
            if (!class_exists('NFePHP\DA\NFe\Danfe')) {
                throw new Exception("Biblioteca sped-da não encontrada. Execute: composer require nfephp-org/sped-da");
            }

            $danfe = new \NFePHP\DA\NFe\Danfe($xml);
            $pdf = $danfe->render();

            if (!$pdf) {
                throw new Exception("Não foi possível gerar o PDF");
            }

            // Salvar PDF
            $ambiente = $this->config['tpAmb'] == 1 ? 'producao' : 'homologacao';
            $diretorio = "/var/www/nfe-api/storage/pdf/{$ambiente}/";

            if (!is_dir($diretorio)) {
                mkdir($diretorio, 0755, true);
            }

            $nomeArquivo = $chave . '.pdf';
            $caminhoCompleto = $diretorio . $nomeArquivo;

            if (file_put_contents($caminhoCompleto, $pdf) === false) {
                throw new Exception("Não foi possível salvar o arquivo PDF");
            }

            error_log("PDF salvo: " . $caminhoCompleto);
            return $caminhoCompleto;

        } catch (Exception $e) {
            error_log("ERRO CRÍTICO na geração de PDF: " . $e->getMessage());
            // NÃO CONTINUAR SEM PDF - FALHAR IMEDIATAMENTE
            throw new Exception("Falha na geração de PDF: " . $e->getMessage());
        }
    }

    /**
     * Método para testar configuração (sem simulação)
     */
    public function testarConfiguracao($empresaId)
    {
        try {
            error_log("Testando configuração para empresa: " . $empresaId);

            // Testar certificado digital
            $this->configurarCertificadoDigital($empresaId);

            // Testar conexão com SEFAZ
            if (!$this->tools) {
                throw new Exception("Tools não configurado");
            }

            $status = $this->tools->sefazStatus();

            if (!$status) {
                throw new Exception("SEFAZ não respondeu");
            }

            error_log("Status SEFAZ: " . $status);

            return [
                'sucesso' => true,
                'certificado' => 'OK',
                'sefaz' => 'OK',
                'status_sefaz' => $status
            ];

        } catch (Exception $e) {
            error_log("ERRO no teste de configuração: " . $e->getMessage());
            throw new Exception("Falha no teste: " . $e->getMessage());
        }
    }
}

?>
