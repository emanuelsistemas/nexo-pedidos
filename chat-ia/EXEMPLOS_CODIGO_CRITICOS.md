# 🔧 EXEMPLOS DE CÓDIGO CRÍTICOS - NEXO PEDIDOS

## 📋 ÍNDICE
- [Configuração sped-nfe](#configuração-sped-nfe)
- [Emissão NFC-e](#emissão-nfc-e)
- [Numeração Sequencial](#numeração-sequencial)
- [Reprocessamento](#reprocessamento)
- [Validações Críticas](#validações-críticas)
- [Estrutura de Dados](#estrutura-de-dados)

---

## 📚 CONFIGURAÇÃO SPED-NFE

### **NFEService.php - Configuração Base:**
```php
<?php
class NFEService {
    private function getConfig($empresa, $ambiente) {
        // ⚠️ CONFIGURAÇÃO SAGRADA - NÃO MODIFICAR
        return [
            "atualizacao" => date('Y-m-d H:i:s'),
            "tpAmb" => $ambiente, // 1=Produção, 2=Homologação
            "razaosocial" => $empresa['razao_social'],
            "cnpj" => preg_replace('/[^0-9]/', '', $empresa['documento']),
            "ie" => preg_replace('/[^0-9]/', '', $empresa['inscricao_estadual']),
            "siglaUF" => $empresa['estado'],
            "schemes" => "PL_009_V4",
            "versao" => "4.00",
            "tokenIBPT" => "",
            "CSC" => $this->getCSC($empresa, $ambiente),
            "CSCid" => $this->getCSCId($empresa, $ambiente)
        ];
    }

    private function getCSC($empresa, $ambiente) {
        // ✅ SEMPRE buscar CSC dinamicamente
        return $ambiente == 1 
            ? $empresa['csc_producao'] 
            : $empresa['csc_homologacao'];
    }

    private function getCSCId($empresa, $ambiente) {
        // ✅ SEMPRE buscar CSC ID dinamicamente
        return $ambiente == 1 
            ? $empresa['csc_id_producao'] 
            : $empresa['csc_id_homologacao'];
    }
}
```

### **Inicialização da Biblioteca:**
```php
use NFePHP\NFe\Make;
use NFePHP\NFe\Tools;
use NFePHP\NFe\Common\Standardize;

// ⚠️ NUNCA MODIFICAR - Inicialização padrão
$config = json_encode($this->getConfig($empresa, $ambiente));
$tools = new Tools($config, Certificate::readPfx($certificado, $senha));
$make = new Make();
```

---

## 🧾 EMISSÃO NFC-E

### **Frontend - Reserva de Número:**
```typescript
// ✅ RESERVAR NÚMERO ANTES DE SALVAR
const finalizarVendaNfce = async (tipoFinalizacao: string) => {
    try {
        // 1. Gerar número ANTES de salvar
        setEtapaProcessamento('Reservando número da NFC-e...');
        const numeroReservado = await gerarProximoNumeroNFCe(usuarioData.empresa_id);
        setNumeroDocumentoReservado(numeroReservado);
        
        // 2. Salvar venda com número já definido
        const vendaData = {
            empresa_id: usuarioData.empresa_id,
            numero_venda: numeroVenda,
            // ✅ CAMPOS FISCAIS OBRIGATÓRIOS
            tentativa_nfce: true,
            status_fiscal: 'processando',
            modelo_documento: 65, // NFC-e
            numero_documento: numeroReservado,
            serie_documento: 1,
            // ... outros campos
        };

        const { data: vendaSalva, error } = await supabase
            .from('pdv')
            .insert(vendaData)
            .select()
            .single();

        if (error) throw new Error(`Erro ao salvar venda: ${error.message}`);

        // 3. Validar se número foi salvo
        if (!vendaSalva.numero_documento) {
            throw new Error('Número da NFC-e não foi reservado corretamente');
        }

        // 4. Prosseguir com transmissão
        await transmitirNfce(vendaSalva);
        
    } catch (error) {
        console.error('Erro na finalização:', error);
        throw error;
    }
};
```

### **Geração de Número Sequencial:**
```typescript
const gerarProximoNumeroNFCe = async (empresaId: string): Promise<number> => {
    try {
        // ✅ BUSCAR ÚLTIMO NÚMERO DA EMPRESA (MODELO 65)
        const { data, error } = await supabase
            .from('pdv')
            .select('numero_documento')
            .eq('empresa_id', empresaId)
            .eq('modelo_documento', 65) // NFC-e
            .not('numero_documento', 'is', null)
            .order('numero_documento', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Erro ao buscar último número:', error);
            throw new Error('Erro ao gerar número da NFC-e');
        }

        // ✅ INCREMENTAR SEQUENCIAL
        let proximoNumero = 1;
        if (data && data.length > 0 && data[0].numero_documento) {
            proximoNumero = data[0].numero_documento + 1;
        }

        console.log(`✅ Próximo número NFC-e: ${proximoNumero}`);
        return proximoNumero;
        
    } catch (error) {
        console.error('Erro ao gerar número NFC-e:', error);
        throw error;
    }
};
```

### **Backend - Emissão NFC-e:**
```php
// emitir-nfce.php
<?php
require_once '../includes/cors.php';
require_once '../src/NFEService.php';
require_once '../src/SupabaseService.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // ✅ VALIDAÇÕES OBRIGATÓRIAS
    if (!isset($input['empresa_id'])) {
        throw new Exception('empresa_id é obrigatório');
    }
    
    if (!isset($input['nfce_data'])) {
        throw new Exception('nfce_data é obrigatório');
    }

    $empresaId = $input['empresa_id'];
    $nfceData = $input['nfce_data'];

    // ✅ BUSCAR DADOS REAIS (LEI DOS DADOS REAIS)
    $supabase = new SupabaseService();
    
    $empresa = $supabase->buscarEmpresa($empresaId);
    if (!$empresa) {
        throw new Exception("Empresa não encontrada: {$empresaId}");
    }

    $nfeConfig = $supabase->buscarNfeConfig($empresaId);
    if (!$nfeConfig) {
        throw new Exception("Configuração NFe não encontrada para empresa: {$empresaId}");
    }

    // ✅ EMITIR NFC-E
    $nfeService = new NFEService();
    $resultado = $nfeService->emitirNFCe($empresa, $nfeConfig, $nfceData);

    // ✅ RESPOSTA PADRONIZADA
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'data' => $resultado
    ]);

} catch (Exception $e) {
    error_log("Erro na emissão NFC-e: " . $e->getMessage());
    
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
```

---

## 🔄 REPROCESSAMENTO

### **Modal de Edição NFC-e:**
```typescript
const reprocessarNfce = async () => {
    if (!vendaParaEditarNfce) return;

    try {
        setReprocessandoNfce(true);

        // ✅ 1. SALVAR MODIFICAÇÕES ANTES DE RETRANSMITIR
        console.log('💾 Salvando modificações dos itens...');
        for (const item of itensNfceEdicao) {
            const { error: updateError } = await supabase
                .from('pdv_itens')
                .update({
                    cfop: item.cfop_editavel,
                    cst_icms: item.regime_tributario === 1 ? item.cst_editavel : null,
                    csosn: item.regime_tributario === 1 ? null : item.csosn_editavel
                })
                .eq('id', item.id);

            if (updateError) {
                throw new Error(`Erro ao salvar item ${item.nome_produto}: ${updateError.message}`);
            }
        }

        // ✅ 2. SALVAR NÚMERO EDITADO (SE HOUVER)
        if (vendaParaEditarNfce.numero_documento) {
            const { error: updateNumeroError } = await supabase
                .from('pdv')
                .update({
                    numero_documento: vendaParaEditarNfce.numero_documento
                })
                .eq('id', vendaParaEditarNfce.id);

            if (updateNumeroError) {
                throw new Error('Erro ao salvar número da NFC-e editado');
            }
        }

        // ✅ 3. RETRANSMITIR COM DADOS ATUALIZADOS
        const response = await fetch('/backend/public/emitir-nfce.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                empresa_id: usuarioData.empresa_id,
                nfce_data: prepararDadosNfce()
            })
        });

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Erro no reprocessamento');
        }

        // ✅ 4. ATUALIZAR VENDA COM SUCESSO
        await supabase.from('pdv').update({
            chave_nfe: result.data.chave,
            protocolo_nfe: result.data.protocolo,
            xml_path: result.data.xml_path,
            pdf_path: result.data.pdf_path,
            status_fiscal: 'autorizada',
            erro_fiscal: null,
            data_autorizacao: result.data.data_autorizacao
        }).eq('id', vendaParaEditarNfce.id);

        toast.success('NFC-e reprocessada e autorizada com sucesso!');
        setShowEditarNfceModal(false);
        loadVendas();

    } catch (error: any) {
        console.error('Erro no reprocessamento:', error);
        toast.error(`Erro no reprocessamento: ${error.message}`);
    } finally {
        setReprocessandoNfce(false);
    }
};
```

---

## ✅ VALIDAÇÕES CRÍTICAS

### **Validação de Empresa:**
```php
private function validarEmpresa($empresa) {
    $camposObrigatorios = [
        'razao_social' => 'Razão Social',
        'documento' => 'CNPJ',
        'inscricao_estadual' => 'Inscrição Estadual',
        'estado' => 'Estado',
        'codigo_municipio' => 'Código do Município'
    ];

    foreach ($camposObrigatorios as $campo => $nome) {
        if (empty($empresa[$campo])) {
            throw new Exception("Campo obrigatório não preenchido: {$nome}");
        }
    }

    // ✅ VALIDAR CNPJ
    $cnpj = preg_replace('/[^0-9]/', '', $empresa['documento']);
    if (strlen($cnpj) !== 14) {
        throw new Exception('CNPJ deve ter 14 dígitos');
    }

    // ✅ VALIDAR IE
    $ie = preg_replace('/[^0-9]/', '', $empresa['inscricao_estadual']);
    if (strlen($ie) !== 12) {
        throw new Exception('Inscrição Estadual deve ter 12 dígitos');
    }
}
```

### **Validação de Certificado:**
```php
private function validarCertificado($empresaId) {
    $certificadoPath = $this->getCertificadoPath($empresaId);
    
    if (!file_exists($certificadoPath)) {
        throw new Exception("Certificado não encontrado para empresa {$empresaId}");
    }

    $certificadoContent = file_get_contents($certificadoPath);
    if (empty($certificadoContent)) {
        throw new Exception("Certificado vazio ou corrompido");
    }

    // ✅ TESTAR LEITURA DO CERTIFICADO
    $senha = $this->getSenhaCertificado($empresaId);
    if (!openssl_pkcs12_read($certificadoContent, $certs, $senha)) {
        throw new Exception("Certificado inválido ou senha incorreta");
    }

    return $certificadoPath;
}
```

### **Validação de Produtos:**
```php
private function validarProdutos($produtos) {
    if (empty($produtos)) {
        throw new Exception('Lista de produtos não pode estar vazia');
    }

    foreach ($produtos as $index => $produto) {
        $item = $index + 1;
        
        if (empty($produto['descricao'])) {
            throw new Exception("Descrição do produto {$item} é obrigatória");
        }

        if (!isset($produto['quantidade']) || $produto['quantidade'] <= 0) {
            throw new Exception("Quantidade do produto {$item} deve ser maior que zero");
        }

        if (!isset($produto['valor_unitario']) || $produto['valor_unitario'] <= 0) {
            throw new Exception("Valor unitário do produto {$item} deve ser maior que zero");
        }

        // ✅ VALIDAR CFOP
        if (empty($produto['cfop'])) {
            throw new Exception("CFOP do produto {$item} é obrigatório");
        }

        // ✅ VALIDAR CST/CSOSN
        $regimeTributario = $this->getRegimeTributario();
        if ($regimeTributario == 1) { // Simples Nacional
            if (empty($produto['csosn'])) {
                throw new Exception("CSOSN do produto {$item} é obrigatório para Simples Nacional");
            }
        } else {
            if (empty($produto['cst_icms'])) {
                throw new Exception("CST ICMS do produto {$item} é obrigatório para Regime Normal");
            }
        }
    }
}
```

---

## 📊 ESTRUTURA DE DADOS

### **Payload NFC-e Completo:**
```json
{
    "empresa": {
        "razao_social": "EMPRESA TESTE LTDA",
        "cnpj": "12345678000195",
        "nome_fantasia": "Empresa Teste",
        "inscricao_estadual": "123456789012",
        "regime_tributario": 1,
        "uf": "SP",
        "codigo_municipio": 3550308,
        "codigo_uf": 35,
        "endereco": {
            "logradouro": "RUA TESTE",
            "numero": "123",
            "bairro": "CENTRO",
            "cidade": "SAO PAULO",
            "cep": "01234567"
        },
        "csc_homologacao": "123456",
        "csc_id_homologacao": 1,
        "csc_producao": "654321",
        "csc_id_producao": 1
    },
    "ambiente": 2,
    "identificacao": {
        "numero": 123,
        "serie": 1,
        "codigo_numerico": "12345678",
        "natureza_operacao": "Venda de mercadoria"
    },
    "destinatario": {
        "documento": "12345678901",
        "nome": "CLIENTE TESTE"
    },
    "produtos": [
        {
            "codigo": "001",
            "descricao": "PRODUTO TESTE",
            "quantidade": 1.000,
            "valor_unitario": 10.00,
            "unidade": "UN",
            "cfop": "5102",
            "csosn": "102",
            "codigo_barras": "1234567890123"
        }
    ]
}
```

### **Resposta de Sucesso:**
```json
{
    "success": true,
    "data": {
        "numero": 123,
        "serie": 1,
        "chave": "35240212345678000195650010000001231234567890",
        "protocolo": "135240000000123",
        "xml_path": "/storage/xml/empresa_id/homologacao/65/2024/12/Autorizados/NFCe_123.xml",
        "pdf_path": "/storage/pdf/empresa_id/homologacao/65/2024/12/Autorizados/NFCe_123.pdf",
        "data_autorizacao": "2024-12-13T10:30:00Z"
    }
}
```

### **Resposta de Erro:**
```json
{
    "success": false,
    "error": "Certificado não encontrado para empresa abc-123-def"
}
```

---

## 🎯 PONTOS CRÍTICOS DE ATENÇÃO

### **⚠️ NUNCA ESQUECER:**
1. **Validar dados** antes de usar sped-nfe
2. **Buscar dados dinamicamente** (empresa, config, certificado)
3. **Reservar número** antes de transmitir
4. **Salvar modificações** antes de reprocessar
5. **Logar erros** detalhadamente
6. **Seguir estrutura** de armazenamento
7. **Respeitar permissões** de arquivos
8. **Não modificar** biblioteca sped-nfe

### **✅ SEMPRE FAZER:**
1. **try/catch** em todas as operações
2. **Validação de entrada** rigorosa
3. **Logs detalhados** para debug
4. **Resposta padronizada** (success/error)
5. **Headers CORS** corretos
6. **Limpeza de dados** (remover caracteres especiais)
7. **Verificação de certificado** antes de usar
8. **Backup de dados** importantes

---

**🎯 Estes exemplos garantem implementação correta e robusta do sistema NFC-e seguindo todas as leis fundamentais do projeto.**
