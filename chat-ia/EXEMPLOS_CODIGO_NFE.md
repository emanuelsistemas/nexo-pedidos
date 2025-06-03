# 💻 Exemplos de Código - Implementação NFe

## 🚨 **ALERTAS CRÍTICOS ANTES DE COMEÇAR**

### **⚠️ BIBLIOTECA SPED-NFE - HOMOLOGADA FISCALMENTE:**
```
🔴 EMERGÊNCIA: NÃO MODIFICAR A BIBLIOTECA sped-nfe
🔴 Está em vendor/nfephp-org/sped-nfe/ - NÃO TOCAR
🔴 Usar APENAS os métodos nativos da biblioteca
🔴 Seguir EXATAMENTE a documentação oficial
🔴 Qualquer alteração pode invalidar homologação fiscal
```

### **🏢 SISTEMA MULTI-TENANT - SEMPRE FILTRAR POR EMPRESA_ID:**
```php
// ✅ SEMPRE fazer isso em TODOS os endpoints NFe:
$empresaId = $_GET['empresa_id'] ?? $_POST['empresa_id'] ?? null;

if (!$empresaId) {
    throw new Exception('empresa_id é obrigatório');
}

// Carregar dados específicos desta empresa
$certificadoPath = "../storage/certificados/empresa_{$empresaId}.pfx";
$dadosEmpresa = carregarDadosEmpresa($empresaId);
$proximoNumero = getProximoNumeroNFe($empresaId, $serie);
```

### **🚀 INICIALIZAÇÃO - SEMPRE USAR BUILD:**
```bash
# ❌ NÃO USAR MAIS:
npm run dev

# ✅ SEMPRE USAR:
npm run build
# Depois acessar: http://localhost/
```

## 🔧 **TEMPLATE PARA EMISSÃO NFe**

### **1. Endpoint emitir-nfe.php (Estrutura Base):**
```php
<?php
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../vendor/autoload.php';

use NFePHP\NFe\Tools;
use NFePHP\NFe\Make;
use NFePHP\NFe\Complements;

try {
    // 1. Validar dados de entrada (MULTI-TENANT)
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['empresa_id']) || !isset($input['pedido_id'])) {
        throw new Exception('Dados obrigatórios não informados');
    }

    $empresaId = $input['empresa_id'];
    $pedidoId = $input['pedido_id'];

    // 1.1. Validar se empresa_id é um UUID válido
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $empresaId)) {
        throw new Exception('empresa_id inválido');
    }

    // 1.2. Verificar se usuário tem acesso a esta empresa (SEGURANÇA)
    // TODO: Implementar verificação de acesso via token/sessão
    
    // 2. Carregar certificado da empresa
    $certificadoPath = "../storage/certificados/empresa_{$empresaId}.pfx";
    $metadataPath = "../storage/certificados/empresa_{$empresaId}.json";
    
    if (!file_exists($certificadoPath) || !file_exists($metadataPath)) {
        throw new Exception('Certificado não encontrado para esta empresa');
    }
    
    $metadata = json_decode(file_get_contents($metadataPath), true);
    $certificado = file_get_contents($certificadoPath);
    
    // 3. Configurar ambiente NFe
    $config = [
        "atualizacao" => date('Y-m-d H:i:s'),
        "tpAmb" => 2, // 1=Produção, 2=Homologação
        "razaosocial" => "RAZAO SOCIAL DA EMPRESA",
        "cnpj" => "CNPJ_DA_EMPRESA",
        "siglaUF" => "SP",
        "schemes" => "PL_009_V4",
        "versao" => '4.00'
    ];
    
    // 4. Inicializar Tools
    $tools = new Tools(json_encode($config), $certificado, $metadata['senha'] ?? '');
    $tools->model('55'); // Modelo NFe
    
    // 5. Criar Make para gerar XML
    $make = new Make();
    
    // 6. Dados da NFe (exemplo básico)
    $std = new stdClass();
    $std->versao = '4.00';
    $std->Id = 'NFe35200714200166000187550010000000046550010000';
    $std->pk_nItem = '';
    
    // Identificação da NFe
    $std->cUF = 35; // São Paulo
    $std->cNF = '55001000';
    $std->natOp = 'Venda de mercadoria';
    $std->mod = 55;
    $std->serie = 1;
    $std->nNF = 46;
    $std->dhEmi = date('Y-m-d\TH:i:sP');
    $std->tpNF = 1; // 0=Entrada, 1=Saída
    $std->idDest = 1; // 1=Operação interna
    $std->cMunFG = 3550308; // São Paulo
    $std->tpImp = 1; // 1=DANFE normal
    $std->tpEmis = 1; // 1=Emissão normal
    $std->cDV = 0;
    $std->tpAmb = 2; // 2=Homologação
    $std->finNFe = 1; // 1=Normal
    $std->indFinal = 1; // 1=Consumidor final
    $std->indPres = 1; // 1=Presencial
    $std->procEmi = 0; // 0=Aplicativo do contribuinte
    $std->verProc = '1.0.0';
    
    $make->taginfNFe($std);
    
    // 7. Emitente (empresa)
    $std = new stdClass();
    $std->xNome = "RAZAO SOCIAL DA EMPRESA";
    $std->CNPJ = "CNPJ_DA_EMPRESA";
    $std->xFant = "NOME FANTASIA";
    $std->IE = "INSCRICAO_ESTADUAL";
    $std->CRT = 3; // Regime tributário
    
    $make->tagemit($std);
    
    // 8. Endereço do emitente
    $std = new stdClass();
    $std->xLgr = "RUA DO EMITENTE";
    $std->nro = "123";
    $std->xBairro = "BAIRRO";
    $std->cMun = 3550308;
    $std->xMun = "SAO PAULO";
    $std->UF = "SP";
    $std->CEP = "01234567";
    $std->cPais = 1058;
    $std->xPais = "BRASIL";
    
    $make->tagenderEmit($std);
    
    // 9. Destinatário (cliente)
    $std = new stdClass();
    $std->xNome = "NOME DO CLIENTE";
    $std->CPF = "CPF_DO_CLIENTE"; // ou CNPJ
    
    $make->tagdest($std);
    
    // 10. Produtos/Serviços (exemplo)
    $std = new stdClass();
    $std->item = 1;
    $std->cProd = "PROD001";
    $std->cEAN = "";
    $std->xProd = "PRODUTO EXEMPLO";
    $std->NCM = "12345678";
    $std->CFOP = "5102";
    $std->uCom = "UN";
    $std->qCom = 1;
    $std->vUnCom = 10.00;
    $std->vProd = 10.00;
    $std->cEANTrib = "";
    $std->uTrib = "UN";
    $std->qTrib = 1;
    $std->vUnTrib = 10.00;
    $std->indTot = 1;
    
    $make->tagprod($std);
    
    // 11. Impostos (ICMS, PIS, COFINS)
    $std = new stdClass();
    $std->item = 1;
    $std->orig = 0;
    $std->CST = '00';
    $std->modBC = 0;
    $std->vBC = 10.00;
    $std->pICMS = 18.00;
    $std->vICMS = 1.80;
    
    $make->tagICMS($std);
    
    // 12. Totais
    $std = new stdClass();
    $std->vBC = 10.00;
    $std->vICMS = 1.80;
    $std->vICMSDeson = 0.00;
    $std->vBCST = 0.00;
    $std->vST = 0.00;
    $std->vProd = 10.00;
    $std->vFrete = 0.00;
    $std->vSeg = 0.00;
    $std->vDesc = 0.00;
    $std->vII = 0.00;
    $std->vIPI = 0.00;
    $std->vPIS = 0.00;
    $std->vCOFINS = 0.00;
    $std->vOutro = 0.00;
    $std->vNF = 10.00;
    
    $make->tagICMSTot($std);
    
    // 13. Forma de pagamento
    $std = new stdClass();
    $std->indPag = 0; // 0=À vista
    $std->tPag = '01'; // 01=Dinheiro
    $std->vPag = 10.00;
    
    $make->tagdetPag($std);
    
    // 14. Gerar XML
    $xml = $make->getXML();
    
    // 15. Assinar XML
    $xmlAssinado = $tools->signNFe($xml);
    
    // 16. Enviar para SEFAZ
    $response = $tools->sefazEnviaLote([$xmlAssinado], 1);
    
    // 17. Processar resposta
    $st = new Complements($response);
    
    echo json_encode([
        'success' => true,
        'message' => 'NFe enviada com sucesso',
        'protocolo' => $st->toArray(),
        'xml' => base64_encode($xmlAssinado)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
```

### **2. Frontend - Hook useNFeEmission.ts:**
```typescript
import { useState } from 'react';
import { showMessage } from '../utils/toast';

export const useNFeEmission = () => {
  const [isEmitting, setIsEmitting] = useState(false);

  const emitirNFe = async (pedidoId: string, empresaId: string) => {
    setIsEmitting(true);
    
    try {
      const response = await fetch('/backend/public/emitir-nfe.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pedido_id: pedidoId,
          empresa_id: empresaId
        })
      });

      const result = await response.json();

      if (result.success) {
        showMessage('success', 'NFe emitida com sucesso!');
        return result;
      } else {
        throw new Error(result.error || 'Erro ao emitir NFe');
      }
    } catch (error: any) {
      showMessage('error', `Erro ao emitir NFe: ${error.message}`);
      throw error;
    } finally {
      setIsEmitting(false);
    }
  };

  return {
    emitirNFe,
    isEmitting
  };
};
```

### **3. Componente NFe no Frontend:**
```typescript
// Adicionar na página de pedidos
const { emitirNFe, isEmitting } = useNFeEmission();

const handleEmitirNFe = async (pedidoId: string) => {
  try {
    const result = await emitirNFe(pedidoId, empresaId);
    // Atualizar estado do pedido
    // Mostrar link para download do XML/PDF
  } catch (error) {
    // Erro já tratado no hook
  }
};

// Botão na interface
<Button
  onClick={() => handleEmitirNFe(pedido.id)}
  disabled={isEmitting}
  variant="primary"
>
  {isEmitting ? 'Emitindo...' : 'Emitir NFe'}
</Button>
```

## 📋 **PRÓXIMOS ARQUIVOS A CRIAR**

### **1. backend/public/consultar-nfe.php**
- Consultar status na SEFAZ
- Verificar se foi autorizada
- Retornar protocolo atualizado

### **2. backend/public/cancelar-nfe.php**
- Cancelamento de NFe
- Validar prazo (24h)
- Gerar evento de cancelamento

### **3. backend/public/gerar-danfe.php**
- Gerar PDF da NFe
- Template personalizado
- Download direto

### **4. src/pages/dashboard/NfePage.tsx**
- Listagem de NFe emitidas
- Filtros e busca
- Ações (consultar, cancelar, download)

---

**🎯 Templates prontos para implementação**  
**📝 Seguir estrutura dos exemplos**  
**🔧 Adaptar conforme necessidades específicas**
