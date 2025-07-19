# 🔧 Taxa de Entrega - Guia de Troubleshooting

## 🚨 Problemas Comuns e Soluções

### 1. Taxa de Entrega Não Aparece

#### **Sintomas**
- Seção "Taxa de Entrega" não aparece no modal de finalização
- Usuário validou CEP mas taxa não é exibida
- Modal de finalização mostra apenas produtos

#### **Possíveis Causas e Soluções**

##### Causa 1: Configuração Desabilitada
```sql
-- Verificar se taxa está habilitada
SELECT habilitado FROM taxa_entrega_config WHERE empresa_id = 'uuid-empresa';
```
**Solução**: Habilitar no Dashboard > Taxa de Entrega

##### Causa 2: Estados React Não Sincronizados
```javascript
// Verificar no console do navegador
console.log('taxaEntregaConfig:', taxaEntregaConfig);
console.log('areaValidada:', areaValidada);
console.log('calculoTaxa:', calculoTaxa);
```
**Solução**: Recarregar página ou limpar localStorage

##### Causa 3: Dados Corrompidos no localStorage
```javascript
// Limpar dados da empresa específica
const empresaId = 'uuid-empresa';
localStorage.removeItem(`area_validada_${empresaId}`);
localStorage.removeItem(`cep_cliente_${empresaId}`);
localStorage.removeItem(`endereco_encontrado_${empresaId}`);
localStorage.removeItem(`taxa_entrega_${empresaId}`);
```

---

### 2. CEP Não Valida

#### **Sintomas**
- Mensagem "CEP não encontrado"
- Botão "Validar" permanece desabilitado
- Erro ao consultar ViaCEP

#### **Diagnóstico**

##### Verificar Formato do CEP
```javascript
const cepLimpo = cep.replace(/\D/g, '');
console.log('CEP limpo:', cepLimpo);
console.log('Tamanho:', cepLimpo.length); // Deve ser 8
```

##### Testar API ViaCEP Manualmente
```bash
curl https://viacep.com.br/ws/12345678/json/
```

##### Verificar Conectividade
```javascript
// No console do navegador
fetch('https://viacep.com.br/ws/01310100/json/')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

#### **Soluções**
1. **CEP Inválido**: Verificar se CEP existe
2. **Problema de Rede**: Verificar conexão com internet
3. **API Indisponível**: Aguardar ou implementar fallback

---

### 3. Cálculo de Taxa Incorreto

#### **Sintomas**
- Taxa calculada não confere com configuração
- Distância calculada incorreta
- Tempo estimado inconsistente

#### **Diagnóstico**

##### Verificar Configuração da Empresa
```sql
SELECT * FROM taxa_entrega_config WHERE empresa_id = 'uuid-empresa';
```

##### Verificar Coordenadas
```javascript
// No taxaEntregaService.ts
console.log('Coordenadas origem:', config.latitude_origem, config.longitude_origem);
console.log('Coordenadas destino:', destLat, destLng);
console.log('Distância calculada:', distancia, 'km');
```

##### Testar Cálculo Manual
```javascript
// Fórmula de Haversine
const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};
```

---

### 4. Modal Não Abre ou Trava

#### **Sintomas**
- Modal de validação não aparece
- Modal abre mas não responde
- Botões não funcionam

#### **Diagnóstico**

##### Verificar Estados do Modal
```javascript
// No console do navegador
console.log('modalAreaEntregaAberto:', modalAreaEntregaAberto);
console.log('taxaEntregaConfig:', taxaEntregaConfig);
```

##### Verificar Erros JavaScript
```javascript
// Abrir DevTools > Console
// Procurar por erros em vermelho
```

#### **Soluções**
1. **Recarregar página**: Ctrl+F5
2. **Limpar cache**: DevTools > Application > Storage > Clear
3. **Verificar console**: Corrigir erros JavaScript

---

## 🔍 Ferramentas de Debug

### 1. Console Logs Úteis

```javascript
// Adicionar no CardapioPublicoPage.tsx para debug
useEffect(() => {
  console.log('🔍 DEBUG - Estados atuais:');
  console.log('- taxaEntregaConfig:', taxaEntregaConfig);
  console.log('- areaValidada:', areaValidada);
  console.log('- calculoTaxa:', calculoTaxa);
  console.log('- cepCliente:', cepCliente);
  console.log('- modalAreaEntregaAberto:', modalAreaEntregaAberto);
}, [taxaEntregaConfig, areaValidada, calculoTaxa, cepCliente, modalAreaEntregaAberto]);
```

### 2. Verificação de localStorage

```javascript
// Função para debug do localStorage
const debugLocalStorage = (empresaId) => {
  const keys = [
    'area_validada',
    'cep_cliente', 
    'endereco_encontrado',
    'taxa_entrega',
    'bairro_selecionado'
  ];
  
  console.log('📦 localStorage Debug:');
  keys.forEach(key => {
    const fullKey = `${key}_${empresaId}`;
    const value = localStorage.getItem(fullKey);
    console.log(`- ${key}:`, value);
  });
};

// Usar no console
debugLocalStorage('uuid-da-empresa');
```

### 3. Teste de API

```javascript
// Função para testar taxaEntregaService
const testarTaxaService = async (empresaId, cep) => {
  try {
    console.log('🧪 Testando taxaEntregaService...');
    
    const config = await taxaEntregaService.buscarConfiguracao(empresaId);
    console.log('Configuração:', config);
    
    const taxa = await taxaEntregaService.calcularTaxa(empresaId, cep);
    console.log('Taxa calculada:', taxa);
    
    return { config, taxa };
  } catch (error) {
    console.error('Erro no teste:', error);
    return { error };
  }
};

// Usar no console
testarTaxaService('uuid-empresa', '12345678');
```

---

## 🛠️ Comandos de Manutenção

### 1. Limpeza de Dados

```sql
-- Limpar configurações inválidas
DELETE FROM taxa_entrega_config 
WHERE latitude_origem IS NULL 
   OR longitude_origem IS NULL 
   OR endereco_origem IS NULL;

-- Limpar bairros órfãos
DELETE FROM taxa_entrega_bairros 
WHERE empresa_id NOT IN (SELECT id FROM empresas);

-- Resetar configuração de empresa específica
UPDATE taxa_entrega_config 
SET habilitado = false 
WHERE empresa_id = 'uuid-empresa';
```

### 2. Verificação de Integridade

```sql
-- Empresas sem configuração de taxa
SELECT e.id, e.nome 
FROM empresas e 
LEFT JOIN taxa_entrega_config t ON e.id = t.empresa_id 
WHERE t.id IS NULL;

-- Configurações incompletas
SELECT empresa_id, tipo, 
       CASE 
         WHEN tipo = 'distancia' AND (latitude_origem IS NULL OR raio_maximo_km IS NULL) THEN 'Incompleta'
         WHEN tipo = 'bairro' AND empresa_id NOT IN (SELECT DISTINCT empresa_id FROM taxa_entrega_bairros) THEN 'Sem bairros'
         ELSE 'OK'
       END as status
FROM taxa_entrega_config;
```

### 3. Migração de Dados

```sql
-- Migrar empresas para nova estrutura
INSERT INTO taxa_entrega_config (empresa_id, habilitado, tipo, taxa_base, raio_maximo_km)
SELECT id, false, 'distancia', 3.00, 10.0
FROM empresas 
WHERE id NOT IN (SELECT empresa_id FROM taxa_entrega_config);
```

---

## 📊 Monitoramento e Alertas

### 1. Métricas Importantes

```javascript
// Tracking de erros
const trackError = (tipo, erro, contexto) => {
  console.error(`[TAXA_ENTREGA_${tipo}]`, erro, contexto);
  
  // Enviar para serviço de monitoramento
  if (window.analytics) {
    window.analytics.track('Taxa_Entrega_Erro', {
      tipo,
      erro: erro.message,
      contexto,
      timestamp: new Date().toISOString()
    });
  }
};

// Usar nas funções
try {
  const taxa = await calcularTaxa(empresaId, cep);
} catch (error) {
  trackError('CALCULO_TAXA', error, { empresaId, cep });
}
```

### 2. Health Check

```javascript
// Verificação de saúde do sistema
const healthCheck = async () => {
  const checks = {
    viacep: false,
    supabase: false,
    configuracao: false
  };
  
  try {
    // Testar ViaCEP
    const response = await fetch('https://viacep.com.br/ws/01310100/json/');
    checks.viacep = response.ok;
    
    // Testar Supabase
    const { data } = await supabase.from('taxa_entrega_config').select('id').limit(1);
    checks.supabase = !!data;
    
    // Testar configuração
    const config = await taxaEntregaService.buscarConfiguracao(empresaId);
    checks.configuracao = !!config;
    
  } catch (error) {
    console.error('Health check failed:', error);
  }
  
  return checks;
};
```

---

## 🚀 Performance e Otimização

### 1. Cache de CEPs

```javascript
// Implementar cache simples
const cepCache = new Map();

const validarCEPComCache = async (cep) => {
  if (cepCache.has(cep)) {
    console.log('📦 CEP encontrado no cache');
    return cepCache.get(cep);
  }
  
  const resultado = await validarCEP(cep);
  cepCache.set(cep, resultado);
  
  // Limpar cache após 1 hora
  setTimeout(() => cepCache.delete(cep), 3600000);
  
  return resultado;
};
```

### 2. Debounce para Validação

```javascript
// Evitar muitas chamadas durante digitação
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};

// Usar no componente
const debouncedCep = useDebounce(cepClienteTemp, 500);
useEffect(() => {
  if (debouncedCep.length === 9) {
    validarCEP(debouncedCep);
  }
}, [debouncedCep]);
```

---

## 📞 Suporte e Escalação

### 1. Níveis de Suporte

**Nível 1 - Usuário Final**:
- Recarregar página
- Limpar cache do navegador
- Tentar CEP diferente

**Nível 2 - Suporte Técnico**:
- Verificar configuração da empresa
- Limpar localStorage específico
- Verificar logs de erro

**Nível 3 - Desenvolvimento**:
- Analisar logs do servidor
- Verificar integridade do banco
- Implementar correções

### 2. Informações para Coleta

Ao reportar problemas, coletar:
- ID da empresa
- CEP que está falhando
- Mensagem de erro exata
- Passos para reproduzir
- Screenshot do console
- Configuração da taxa de entrega

### 3. Contatos de Escalação

```
Nível 1: suporte@empresa.com
Nível 2: suporte-tecnico@empresa.com  
Nível 3: dev@empresa.com
Emergência: +55 11 99999-9999
```

---

*Guia criado em: 19/07/2025*  
*Última atualização: 19/07/2025*  
*Versão: 1.0*
