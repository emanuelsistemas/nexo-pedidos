# 📋 Taxa de Entrega - Exemplos e Casos de Uso

## 🎯 Casos de Uso Práticos

### 1. Pizzaria com Entrega por Distância

**Configuração**:
- Tipo: Distância
- Endereço origem: "Rua das Flores, 123, Centro, São José dos Campos, SP"
- Raio máximo: 15 km
- Taxa base: R$ 3,00
- Taxa por km: R$ 0,50
- Tempo base: 20 min
- Tempo por km: 2 min

**Exemplos de Cálculo**:

| CEP Cliente | Distância | Taxa | Tempo | Status |
|-------------|-----------|------|-------|--------|
| 12345-678 | 5 km | R$ 5,50 | 30 min | ✅ Atende |
| 12567-890 | 10 km | R$ 8,00 | 40 min | ✅ Atende |
| 12789-012 | 20 km | - | - | ❌ Fora da área |

**Fórmulas**:
- Taxa: `3,00 + (5 × 0,50) = R$ 5,50`
- Tempo: `20 + (5 × 2) = 30 min`

### 2. Restaurante com Taxa por Bairro

**Configuração**:
- Tipo: Bairro
- Bairros cadastrados:

| Bairro | Taxa | Tempo |
|--------|------|-------|
| Centro | R$ 4,00 | 25 min |
| Jardim das Flores | R$ 6,00 | 35 min |
| Vila Nova | R$ 5,00 | 30 min |
| Bosque dos Eucaliptos | R$ 8,00 | 45 min |

**Fluxo do Cliente**:
1. Cliente informa CEP: 12345-678
2. Sistema consulta ViaCEP: "Centro, São José dos Campos"
3. Sistema localiza bairro "Centro" na tabela
4. Retorna: Taxa R$ 4,00, Tempo 25 min

---

## 🔧 Exemplos de Código

### 1. Configuração Inicial da Empresa

```typescript
// Inserir configuração no banco
const configuracao = {
  empresa_id: "uuid-da-empresa",
  habilitado: true,
  tipo: "distancia",
  endereco_origem: "Rua Example, 123, Centro, São José dos Campos, SP",
  latitude_origem: -23.1794,
  longitude_origem: -45.8869,
  raio_maximo_km: 15.0,
  taxa_base: 3.00,
  taxa_por_km: 0.50,
  tempo_base_minutos: 20,
  tempo_por_km_minutos: 2.0
};

await supabase
  .from('taxa_entrega_config')
  .insert(configuracao);
```

### 2. Cadastro de Bairros

```typescript
const bairros = [
  {
    empresa_id: "uuid-da-empresa",
    bairro: "Centro",
    valor: 4.00,
    tempo_entrega: 25
  },
  {
    empresa_id: "uuid-da-empresa", 
    bairro: "Jardim das Flores",
    valor: 6.00,
    tempo_entrega: 35
  }
];

await supabase
  .from('taxa_entrega_bairros')
  .insert(bairros);
```

### 3. Validação de CEP no Frontend

```typescript
const validarCEP = async (cep: string) => {
  try {
    setValidandoCep(true);
    
    // 1. Validar formato
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
      throw new Error('CEP inválido');
    }
    
    // 2. Consultar ViaCEP
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const endereco = await response.json();
    
    if (endereco.erro) {
      throw new Error('CEP não encontrado');
    }
    
    // 3. Calcular taxa
    const taxa = await taxaEntregaService.calcularTaxa(empresaId, cep);
    
    if (taxa?.fora_area) {
      setCepForaArea(true);
      showMessage('error', 'CEP fora da área de entrega');
    } else {
      setCalculoTaxa(taxa);
      showMessage('success', `Taxa: R$ ${taxa.valor.toFixed(2)}`);
    }
    
  } catch (error) {
    showMessage('error', error.message);
  } finally {
    setValidandoCep(false);
  }
};
```

---

## 🧪 Testes e Validação

### 1. Testes de CEP

**CEPs para Teste (São José dos Campos)**:
- `12227-010` - Jardim da Granja (válido)
- `12315-331` - Centro (válido)
- `12345-678` - Exemplo genérico
- `99999-999` - Inválido
- `00000-000` - Inválido

### 2. Cenários de Teste

#### Cenário 1: Primeira Validação
```
1. Usuário acessa cardápio
2. Adiciona produtos ao carrinho
3. Clica "Finalizar Pedido"
4. Modal de validação abre automaticamente
5. Digita CEP válido
6. Sistema calcula taxa
7. Confirma área
8. Taxa aparece no pedido
```

#### Cenário 2: Alteração de Endereço
```
1. Usuário com endereço já validado
2. Clica "Alterar" na taxa de entrega
3. Modal abre com CEP atual
4. Testa novo CEP
5. Confirma ou cancela
6. Taxa atualizada ou mantida
```

#### Cenário 3: CEP Fora da Área
```
1. Digita CEP muito distante
2. Sistema calcula distância
3. Verifica se está dentro do raio
4. Mostra mensagem "fora da área"
5. Permite tentar outro CEP
```

### 3. Validações de Dados

```typescript
// Validar configuração da empresa
const validarConfiguracao = (config: TaxaEntregaConfig) => {
  const erros = [];
  
  if (!config.endereco_origem) {
    erros.push('Endereço de origem é obrigatório');
  }
  
  if (config.tipo === 'distancia') {
    if (!config.latitude_origem || !config.longitude_origem) {
      erros.push('Coordenadas de origem são obrigatórias');
    }
    if (config.raio_maximo_km <= 0) {
      erros.push('Raio máximo deve ser maior que zero');
    }
  }
  
  if (config.taxa_base < 0) {
    erros.push('Taxa base não pode ser negativa');
  }
  
  return erros;
};
```

---

## 🚨 Tratamento de Erros

### 1. Erros Comuns e Soluções

| Erro | Causa | Solução |
|------|-------|---------|
| "CEP não encontrado" | CEP inválido ou inexistente | Verificar formato e tentar outro |
| "Fora da área de entrega" | Distância > raio máximo | Configurar raio maior ou informar limitação |
| "Erro ao calcular taxa" | Problema na API ou config | Verificar configuração da empresa |
| "Coordenadas não encontradas" | Endereço origem inválido | Reconfigurar endereço da empresa |

### 2. Logs para Debug

```typescript
// No taxaEntregaService.ts
console.log('🚚 Iniciando cálculo de taxa');
console.log('📍 Empresa:', empresaId);
console.log('📮 CEP:', cep);
console.log('⚙️ Configuração:', config);
console.log('📏 Distância:', distancia, 'km');
console.log('💰 Taxa calculada:', taxa);
console.log('⏱️ Tempo estimado:', tempo);
```

### 3. Fallbacks e Recuperação

```typescript
// Fallback para coordenadas
const obterCoordenadas = async (endereco: string) => {
  try {
    // Tentar geocoding API
    return await geocodingAPI(endereco);
  } catch (error) {
    // Fallback para coordenadas padrão
    console.warn('Usando coordenadas padrão');
    return { lat: -23.1794, lng: -45.8869 };
  }
};

// Fallback para taxa
const calcularTaxaFallback = (distancia: number) => {
  return {
    valor: 5.00, // Taxa padrão
    tempo_estimado: "30-45 min",
    fora_area: distancia > 20
  };
};
```

---

## 📊 Métricas e Monitoramento

### 1. KPIs Importantes

- **Taxa de Conversão**: % de usuários que validam endereço
- **Abandono**: % que fecha modal sem validar
- **Tempo Médio**: Tempo para validar endereço
- **Erros de CEP**: % de CEPs inválidos
- **Área de Cobertura**: % de CEPs dentro da área

### 2. Logs de Analytics

```typescript
// Tracking de eventos
const trackValidacaoEndereco = (evento: string, dados: any) => {
  // Google Analytics, Mixpanel, etc.
  analytics.track('Taxa_Entrega_' + evento, {
    empresa_id: empresaId,
    cep: dados.cep,
    taxa_calculada: dados.taxa,
    tempo_validacao: dados.tempo,
    sucesso: dados.sucesso
  });
};

// Exemplos de uso
trackValidacaoEndereco('CEP_Validado', { cep, taxa, sucesso: true });
trackValidacaoEndereco('CEP_Fora_Area', { cep, sucesso: false });
trackValidacaoEndereco('Modal_Fechado_Sem_Validar', { sucesso: false });
```

---

## 🔄 Migração e Atualizações

### 1. Migração de Dados Existentes

```sql
-- Migrar empresas existentes para nova estrutura
INSERT INTO taxa_entrega_config (empresa_id, habilitado, tipo)
SELECT id, false, 'distancia' 
FROM empresas 
WHERE id NOT IN (SELECT empresa_id FROM taxa_entrega_config);

-- Atualizar configurações padrão
UPDATE taxa_entrega_config 
SET 
  taxa_base = 3.00,
  taxa_por_km = 0.50,
  tempo_base_minutos = 20,
  tempo_por_km_minutos = 2.0,
  raio_maximo_km = 10.0
WHERE taxa_base IS NULL;
```

### 2. Versionamento de API

```typescript
// Compatibilidade com versões antigas
interface TaxaEntregaV1 {
  valor: number;
  tempo: string;
}

interface TaxaEntregaV2 extends TaxaEntregaV1 {
  distancia_km: number;
  fora_area: boolean;
  endereco_origem: string;
  endereco_destino: string;
}

// Adapter para compatibilidade
const adaptarResposta = (versao: string, dados: any) => {
  if (versao === 'v1') {
    return {
      valor: dados.valor,
      tempo: dados.tempo_estimado
    };
  }
  return dados; // v2 completa
};
```

---

*Exemplos criados em: 19/07/2025*  
*Última atualização: 19/07/2025*  
*Versão: 1.0*
