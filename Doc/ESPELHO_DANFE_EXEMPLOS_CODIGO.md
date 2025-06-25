# Espelho DANFE - Exemplos de Código

## 📋 Exemplos Práticos de Implementação

### **1. Frontend - Carregamento de Dados**

#### **Função Principal handleGerarEspelho()**

```typescript
const handleGerarEspelho = async () => {
  try {
    setIsGeneratingEspelho(true);
    addLog('🔍 Iniciando geração do espelho DANFE...');

    // Verificar se é rascunho salvo
    if (isEditingRascunho && nfeId) {
      // Buscar dados reais salvos no banco
      const { data: nfeSalva, error } = await supabase
        .from('pdv')
        .select('*')
        .eq('id', nfeId)
        .single();

      if (error) throw error;

      // ✅ CARREGAR DADOS REAIS DO JSON
      let chavesRefReais = [];
      let intermediadorReal = {};
      let transportadoraReal = {};
      
      if (nfeSalva.dados_nfe) {
        try {
          const dadosNfeJson = typeof nfeSalva.dados_nfe === 'string' 
            ? JSON.parse(nfeSalva.dados_nfe) 
            : nfeSalva.dados_nfe;
          
          chavesRefReais = dadosNfeJson?.chaves_ref || [];
          intermediadorReal = dadosNfeJson?.intermediador || {};
          transportadoraReal = dadosNfeJson?.transportadora || {};
        } catch (error) {
          console.error('Erro ao carregar dados do JSON:', error);
        }
      }

      // Montar dados reais da NFe
      const dadosReaisNfe = {
        identificacao: {
          modelo: nfeSalva.modelo_documento || 55,
          serie: nfeSalva.serie_documento,
          numero: nfeSalva.numero_documento,
          natureza_operacao: nfeSalva.natureza_operacao,
          data_emissao: nfeSalva.data_emissao_nfe || nfeSalva.created_at,
          chave_nfe: nfeSalva.chave_nfe,
          protocolo: nfeSalva.protocolo_nfe,
          informacao_adicional: nfeSalva.informacao_adicional || nfeSalva.informacoes_adicionais
        },
        produtos: produtosReais,
        totais: {
          valor_produtos: nfeSalva.valor_subtotal || nfeSalva.valor_total,
          valor_total: nfeSalva.valor_total,
          valor_desconto: nfeSalva.valor_desconto || 0
        },
        chaves_ref: chavesRefReais,
        intermediador: intermediadorReal,
        transportadora: transportadoraReal,
        empresa: nfeData.empresa
      };

      // Enviar para backend
      const response = await fetch('/backend/public/gerar-espelho-danfe-real.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa_id: usuarioData.empresa_id,
          dados_nfe: dadosReaisNfe
        })
      });

      const result = await response.json();
      
      if (result.sucesso) {
        addLog('✅ Espelho DANFE gerado com sucesso!');
        // Abrir PDF em nova aba
        window.open(`/backend/${result.caminho}`, '_blank');
      } else {
        throw new Error(result.erro || 'Erro ao gerar espelho');
      }
    }
  } catch (error) {
    console.error('Erro ao gerar espelho:', error);
    addLog(`❌ Erro: ${error.message}`);
  } finally {
    setIsGeneratingEspelho(false);
  }
};
```

#### **Função para Carregar Produtos Reais**

```typescript
const carregarProdutosReais = (nfeSalva: any) => {
  if (!nfeSalva.dados_nfe) return [];

  try {
    const dadosNfeJson = typeof nfeSalva.dados_nfe === 'string' 
      ? JSON.parse(nfeSalva.dados_nfe) 
      : nfeSalva.dados_nfe;

    const produtos = dadosNfeJson?.produtos || [];
    
    return produtos.map((item: any) => ({
      codigo: item.codigo,
      descricao: item.descricao,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      valor_total: item.valor_total,
      ncm: item.ncm,
      cfop: item.cfop,
      unidade: item.unidade,
      ean: item.ean || 'SEM GTIN',
      origem_produto: item.origem_produto || 0,
      situacao_tributaria: item.situacao_tributaria,
      cst_icms: item.cst_icms,
      csosn_icms: item.csosn_icms,
      aliquota_icms: item.aliquota_icms || 18,
      cst_pis: item.cst_pis || '01',
      cst_cofins: item.cst_cofins || '01',
      aliquota_pis: item.aliquota_pis || 1.65,
      aliquota_cofins: item.aliquota_cofins || 7.6,
      valor_icms: item.valor_icms || 0,
      base_calculo_icms: item.base_calculo_icms || 0
    }));
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    return [];
  }
};
```

### **2. Backend - Processamento Principal**

#### **Função criarXMLEspelho()**

```php
function criarXMLEspelho($nfeData, $empresa_id) {
    try {
        error_log("🔧 XML ESPELHO: Criando XML básico a partir dos dados");

        // Salvar dados para debug
        $debugFile = __DIR__ . "/../storage/debug_dados_nfe.json";
        file_put_contents($debugFile, json_encode($nfeData, JSON_PRETTY_PRINT));

        // Extrair seções dos dados
        $identificacao = $nfeData['identificacao'] ?? [];
        $destinatario = $nfeData['destinatario'] ?? [];
        $produtos = $nfeData['produtos'] ?? [];
        $totais = $nfeData['totais'] ?? [];
        $transportadora = $nfeData['transportadora'] ?? [];

        // ✅ BUSCAR DADOS REAIS DA EMPRESA
        $empresa = $nfeData['empresa'] ?? [];
        $cnpjEmitente = preg_replace('/[^0-9]/', '', $empresa['cnpj'] ?? '24163237000151');
        $razaoSocial = $empresa['name'] ?? 'EMANUEL LUIS PEREIRA SOUZA VALESIS INFORMATICA';
        $nomeFantasia = $empresa['nome_fantasia'] ?? 'DISTRIBUIDORA EXEMPLO';
        $inscricaoEstadual = $empresa['inscricao_estadual'] ?? '392188360119';

        // ✅ PROCESSAR INFORMAÇÕES ADICIONAIS
        $infoAdicional = $identificacao['informacao_adicional'] ?? 
                        $identificacao['informacoes_adicionais'] ?? 
                        'DOCUMENTO AUXILIAR PARA CONFERENCIA - NAO POSSUI VALOR FISCAL';

        // ✅ ADICIONAR CHAVES DE REFERÊNCIA
        $chavesRef = $nfeData['chaves_ref'] ?? [];
        if (!empty($chavesRef)) {
            $chavesTexto = "\n\nDOCUMENTOS FISCAIS REFERENCIADOS:";
            foreach ($chavesRef as $chaveRef) {
                $chave = $chaveRef['chave'] ?? '';
                $chaveFormatada = $chaveRef['chave_formatada'] ?? '';
                if (!empty($chave)) {
                    $chavesTexto .= "\nNFe: " . ($chaveFormatada ?: $chave);
                }
            }
            $infoAdicional .= $chavesTexto;
        }

        // ✅ ADICIONAR INTERMEDIADOR
        $intermediador = $nfeData['intermediador'] ?? [];
        if (!empty($intermediador['nome']) && !empty($intermediador['cnpj'])) {
            $cnpjFormatado = preg_replace('/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/', '$1.$2.$3/$4-$5', $intermediador['cnpj']);
            $intermediadorTexto = "\n\nINTERMEDIADOR DA TRANSACAO:";
            $intermediadorTexto .= "\nNome: " . $intermediador['nome'];
            $intermediadorTexto .= "\nCNPJ: " . $cnpjFormatado;
            $infoAdicional .= $intermediadorTexto;
        }

        // ✅ CRIAR XML COM DADOS REAIS
        $xml = '<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
    <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
        <infNFe Id="NFe35' . date('y') . '06' . $cnpjEmitente . '55001' . str_pad($identificacao['numero'] ?? '1', 9, '0', STR_PAD_LEFT) . '1448846933" versao="4.00">
            <ide>
                <cUF>35</cUF>
                <cNF>44884693</cNF>
                <natOp>' . htmlspecialchars($identificacao['natureza_operacao'] ?? 'Venda de Mercadoria') . '</natOp>
                <mod>55</mod>
                <serie>' . htmlspecialchars($identificacao['serie'] ?? '1') . '</serie>
                <nNF>' . htmlspecialchars($identificacao['numero'] ?? '1') . '</nNF>
                <dhEmi>' . ($identificacao['data_emissao'] ? date('c', strtotime($identificacao['data_emissao'])) : date('c')) . '</dhEmi>
                <tpNF>1</tpNF>
                <idDest>1</idDest>
                <cMunFG>' . htmlspecialchars($empresa['codigo_municipio'] ?? '3524402') . '</cMunFG>
                <tpImp>1</tpImp>
                <tpEmis>1</tpEmis>
                <cDV>3</cDV>
                <tpAmb>2</tpAmb>
                <finNFe>' . htmlspecialchars($identificacao['finalidade'] ?? '1') . '</finNFe>
                <indFinal>1</indFinal>
                <indPres>1</indPres>
            </ide>
            <emit>
                <CNPJ>' . $cnpjEmitente . '</CNPJ>
                <xNome>' . htmlspecialchars($razaoSocial) . '</xNome>
                <xFant>' . htmlspecialchars($nomeFantasia) . '</xFant>
                <enderEmit>
                    <xLgr>' . htmlspecialchars($empresa['address'] ?? 'SANTA TEREZINHA') . '</xLgr>
                    <nro>' . htmlspecialchars($empresa['numero_endereco'] ?? '531') . '</nro>
                    <xBairro>' . htmlspecialchars($empresa['bairro'] ?? 'JARDIM BELA VISTA') . '</xBairro>
                    <cMun>' . htmlspecialchars($empresa['codigo_municipio'] ?? '3524402') . '</cMun>
                    <xMun>' . htmlspecialchars($empresa['city'] ?? 'JACAREI') . '</xMun>
                    <UF>' . htmlspecialchars($empresa['uf'] ?? 'SP') . '</UF>
                    <CEP>' . preg_replace('/[^0-9]/', '', $empresa['zip_code'] ?? '12309010') . '</CEP>
                    <cPais>1058</cPais>
                    <xPais>BRASIL</xPais>
                </enderEmit>
                <IE>' . htmlspecialchars($inscricaoEstadual) . '</IE>
                <CRT>3</CRT>
            </emit>';

        // ✅ ADICIONAR DESTINATÁRIO
        if (!empty($destinatario['nome'])) {
            $xml .= '
            <dest>
                <CNPJ>' . preg_replace('/[^0-9]/', '', $destinatario['documento'] ?? '') . '</CNPJ>
                <xNome>' . htmlspecialchars($destinatario['nome']) . '</xNome>
                <enderDest>
                    <xLgr>' . htmlspecialchars($destinatario['endereco'] ?? '') . '</xLgr>
                    <nro>' . htmlspecialchars($destinatario['numero'] ?? 'S/N') . '</nro>
                    <xBairro>' . htmlspecialchars($destinatario['bairro'] ?? '') . '</xBairro>
                    <cMun>' . htmlspecialchars($destinatario['codigo_municipio'] ?? '') . '</cMun>
                    <xMun>' . htmlspecialchars($destinatario['cidade'] ?? '') . '</xMun>
                    <UF>' . htmlspecialchars($destinatario['uf'] ?? '') . '</UF>
                    <CEP>' . preg_replace('/[^0-9]/', '', $destinatario['cep'] ?? '') . '</CEP>
                    <cPais>1058</cPais>
                    <xPais>BRASIL</xPais>
                </enderDest>
                <indIEDest>9</indIEDest>
            </dest>';
        }

        // ✅ ADICIONAR PRODUTOS COM IMPOSTOS
        foreach ($produtos as $index => $produto) {
            $valorProduto = $produto['valor_total'] ?? 0;
            $aliquotaIcms = $produto['aliquota_icms'] ?? 18;
            
            $xml .= '
            <det nItem="' . ($index + 1) . '">
                <prod>
                    <cProd>' . htmlspecialchars($produto['codigo'] ?? '') . '</cProd>
                    <cEAN>' . htmlspecialchars($produto['ean'] ?? 'SEM GTIN') . '</cEAN>
                    <xProd>' . htmlspecialchars($produto['descricao'] ?? '') . '</xProd>
                    <NCM>' . htmlspecialchars($produto['ncm'] ?? '') . '</NCM>
                    <CFOP>' . htmlspecialchars($produto['cfop'] ?? '') . '</CFOP>
                    <uCom>' . htmlspecialchars($produto['unidade'] ?? 'UN') . '</uCom>
                    <qCom>' . number_format($produto['quantidade'] ?? 0, 4, '.', '') . '</qCom>
                    <vUnCom>' . number_format($produto['valor_unitario'] ?? 0, 2, '.', '') . '</vUnCom>
                    <vProd>' . number_format($valorProduto, 2, '.', '') . '</vProd>
                    <cEANTrib>' . htmlspecialchars($produto['ean'] ?? 'SEM GTIN') . '</cEANTrib>
                    <uTrib>' . htmlspecialchars($produto['unidade'] ?? 'UN') . '</uTrib>
                    <qTrib>' . number_format($produto['quantidade'] ?? 0, 4, '.', '') . '</qTrib>
                    <vUnTrib>' . number_format($produto['valor_unitario'] ?? 0, 2, '.', '') . '</vUnTrib>
                </prod>
                <imposto>
                    <ICMS>
                        <ICMS00>
                            <orig>' . ($produto['origem_produto'] ?? 0) . '</orig>
                            <CST>' . ($produto['cst_icms'] ?? '00') . '</CST>
                            <modBC>3</modBC>
                            <vBC>' . number_format($valorProduto, 2, '.', '') . '</vBC>
                            <pICMS>' . number_format($aliquotaIcms, 2, '.', '') . '</pICMS>
                            <vICMS>' . number_format(($valorProduto * $aliquotaIcms) / 100, 2, '.', '') . '</vICMS>
                        </ICMS00>
                    </ICMS>
                    <PIS>
                        <PISAliq>
                            <CST>' . ($produto['cst_pis'] ?? '01') . '</CST>
                            <vBC>' . number_format($valorProduto, 2, '.', '') . '</vBC>
                            <pPIS>1.65</pPIS>
                            <vPIS>' . number_format(($valorProduto * 1.65) / 100, 2, '.', '') . '</vPIS>
                        </PISAliq>
                    </PIS>
                    <COFINS>
                        <COFINSAliq>
                            <CST>' . ($produto['cst_cofins'] ?? '01') . '</CST>
                            <vBC>' . number_format($valorProduto, 2, '.', '') . '</vBC>
                            <pCOFINS>7.60</pCOFINS>
                            <vCOFINS>' . number_format(($valorProduto * 7.60) / 100, 2, '.', '') . '</vCOFINS>
                        </COFINSAliq>
                    </COFINS>
                </imposto>
            </det>';
        }

        // ✅ CALCULAR TOTAIS AUTOMATICAMENTE
        $valorProdutos = $totais['valor_produtos'] ?? 0;
        $valorTotal = $totais['valor_total'] ?? $valorProdutos;

        $totalBaseICMS = 0;
        $totalICMS = 0;
        $totalPIS = 0;
        $totalCOFINS = 0;

        foreach ($produtos as $produto) {
            $valorProduto = $produto['valor_total'] ?? 0;
            $aliquotaIcms = $produto['aliquota_icms'] ?? 18;

            $totalBaseICMS += $valorProduto;
            $totalICMS += ($valorProduto * $aliquotaIcms) / 100;
            $totalPIS += ($valorProduto * 1.65) / 100;
            $totalCOFINS += ($valorProduto * 7.60) / 100;
        }

        $xml .= '
            <total>
                <ICMSTot>
                    <vBC>' . number_format($totalBaseICMS, 2, '.', '') . '</vBC>
                    <vICMS>' . number_format($totalICMS, 2, '.', '') . '</vICMS>
                    <vICMSDeson>0.00</vICMSDeson>
                    <vFCP>0.00</vFCP>
                    <vBCST>0.00</vBCST>
                    <vST>0.00</vST>
                    <vFCPST>0.00</vFCPST>
                    <vFCPSTRet>0.00</vFCPSTRet>
                    <vProd>' . number_format($valorProdutos, 2, '.', '') . '</vProd>
                    <vFrete>0.00</vFrete>
                    <vSeg>0.00</vSeg>
                    <vDesc>0.00</vDesc>
                    <vII>0.00</vII>
                    <vIPI>0.00</vIPI>
                    <vIPIDevol>0.00</vIPIDevol>
                    <vPIS>' . number_format($totalPIS, 2, '.', '') . '</vPIS>
                    <vCOFINS>' . number_format($totalCOFINS, 2, '.', '') . '</vCOFINS>
                    <vOutro>0.00</vOutro>
                    <vNF>' . number_format($valorTotal, 2, '.', '') . '</vNF>
                </ICMSTot>
            </total>';

        // ✅ ADICIONAR TRANSPORTADORA
        $xml .= '
            <transp>
                <modFrete>' . htmlspecialchars($transportadora['modalidade_frete'] ?? '9') . '</modFrete>';
        
        // Dados da transportadora quando informada
        if (!empty($transportadora['transportadora_nome']) && ($transportadora['modalidade_frete'] ?? '9') !== '9') {
            $xml .= '
                <transporta>';
            
            $documento = preg_replace('/[^0-9]/', '', $transportadora['transportadora_documento'] ?? '');
            if (strlen($documento) == 14) {
                $xml .= '<CNPJ>' . $documento . '</CNPJ>';
            } elseif (strlen($documento) == 11) {
                $xml .= '<CPF>' . $documento . '</CPF>';
            }
            
            $xml .= '
                    <xNome>' . htmlspecialchars($transportadora['transportadora_nome']) . '</xNome>';
            
            if (!empty($transportadora['transportadora_ie'])) {
                $xml .= '<IE>' . htmlspecialchars($transportadora['transportadora_ie']) . '</IE>';
            }
            
            $xml .= '</transporta>';
        }
        
        $xml .= '
            </transp>
            <pag>
                <detPag>
                    <tPag>01</tPag>
                    <vPag>' . number_format($valorTotal, 2, '.', '') . '</vPag>
                </detPag>
            </pag>
            <infAdic>
                <infCpl>' . htmlspecialchars($infoAdicional) . '</infCpl>
            </infAdic>
        </infNFe>
    </NFe>
    <protNFe versao="4.00">
        <infProt>
            <tpAmb>2</tpAmb>
            <verAplic>SP_NFE_PL_009_V4</verAplic>
            <chNFe>35' . date('y') . '06' . $cnpjEmitente . '55001' . str_pad($identificacao['numero'] ?? '1', 9, '0', STR_PAD_LEFT) . '1448846933</chNFe>
            <dhRecbto>' . ($identificacao['data_emissao'] ? date('c', strtotime($identificacao['data_emissao'])) : date('c')) . '</dhRecbto>
            <nProt>135250000000001</nProt>
            <digVal>ESPELHO</digVal>
            <cStat>100</cStat>
            <xMotivo>Autorizado o uso da NF-e</xMotivo>
        </infProt>
    </protNFe>
</nfeProc>';

        error_log("✅ XML ESPELHO: XML criado com sucesso (" . strlen($xml) . " bytes)");
        return $xml;

    } catch (Exception $e) {
        error_log("❌ XML ESPELHO: Erro na criação: " . $e->getMessage());
        throw $e;
    }
}
```

### **3. Função de Debug**

```php
function debugInformacoesAdicionais($identificacao, $chavesRef, $intermediador) {
    $debugContent = "=== DEBUG INFORMAÇÕES ADICIONAIS ===\n";
    $debugContent .= "Campo informacao_adicional: '" . ($identificacao['informacao_adicional'] ?? 'VAZIO') . "'\n";
    $debugContent .= "Campo informacoes_adicionais: '" . ($identificacao['informacoes_adicionais'] ?? 'VAZIO') . "'\n";
    $debugContent .= "Chaves de Referência: " . count($chavesRef) . " encontrada(s)\n";
    
    if (!empty($chavesRef)) {
        foreach ($chavesRef as $index => $chave) {
            $debugContent .= "  Chave " . ($index + 1) . ": " . ($chave['chave'] ?? 'VAZIO') . "\n";
            $debugContent .= "  Formatada: " . ($chave['chave_formatada'] ?? 'VAZIO') . "\n";
        }
    }
    
    $debugContent .= "Intermediador: " . (!empty($intermediador['nome']) ? $intermediador['nome'] : 'VAZIO') . "\n";
    $debugContent .= "=== FIM DEBUG ===\n";
    
    file_put_contents(__DIR__ . "/../storage/debug_info_adicional.txt", $debugContent);
}
```

### **4. Validação de Dados**

```typescript
const validarDadosEspelho = (nfeData: any): string[] => {
  const erros: string[] = [];

  // Validar dados essenciais
  if (!nfeData.identificacao?.numero) {
    erros.push('Número da NFe é obrigatório');
  }

  if (!nfeData.produtos || nfeData.produtos.length === 0) {
    erros.push('Pelo menos um produto é obrigatório');
  }

  if (!nfeData.empresa?.cnpj) {
    erros.push('CNPJ da empresa é obrigatório');
  }

  // Validar chaves de referência se finalidade for 2, 3 ou 4
  const finalidade = nfeData.identificacao?.finalidade;
  if (['2', '3', '4'].includes(finalidade)) {
    if (!nfeData.chaves_ref || nfeData.chaves_ref.length === 0) {
      erros.push('Chaves de referência são obrigatórias para esta finalidade');
    }
  }

  return erros;
};
```

---

**Última atualização:** 25/06/2025  
**Versão:** 1.0
