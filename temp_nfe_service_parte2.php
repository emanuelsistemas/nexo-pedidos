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
