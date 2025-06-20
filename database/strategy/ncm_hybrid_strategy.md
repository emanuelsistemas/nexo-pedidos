# 🎯 Estratégia Híbrida NCM-CEST - Sistema Nexo Pedidos

## 📋 Resumo da Análise

### ✅ Conclusões Importantes

1. **CEST é padronizado nacionalmente** - Não há diferenças entre SP, RJ, MG
2. **Não existe tabela pública completa** facilmente acessível
3. **BrasilAPI valida NCM** mas não fornece CEST
4. **Tabela local é a melhor opção** para controle e performance

## 🚀 Estratégia Recomendada: HÍBRIDA

### Fase 1: Base Local + Validação Externa
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Usuário       │    │   Tabela Local  │    │   BrasilAPI     │
│   informa NCM   │───▶│   Consulta      │───▶│   Validação     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   CEST          │    │   Descrição     │
                       │   Disponível    │    │   Oficial       │
                       └─────────────────┘    └─────────────────┘
```

### Fluxo de Funcionamento

#### 1. **Consulta Inicial**
```typescript
async function consultarNCM(codigo: string) {
  // 1. Buscar na tabela local primeiro
  const local = await buscarNCMLocal(codigo);
  
  if (local.found) {
    return {
      ncm: codigo,
      descricao: local.descricao,
      cestOpcoes: local.cestOpcoes,
      fonte: 'LOCAL'
    };
  }
  
  // 2. Se não encontrou, validar via BrasilAPI
  const brasilAPI = await validarNCMBrasilAPI(codigo);
  
  if (brasilAPI.valid) {
    // 3. Salvar na tabela local para próximas consultas
    await salvarNCMLocal(codigo, brasilAPI.descricao);
    
    return {
      ncm: codigo,
      descricao: brasilAPI.descricao,
      cestOpcoes: [],
      fonte: 'BRASILAPI'
    };
  }
  
  return { error: 'NCM inválido' };
}
```

#### 2. **Adição de CEST**
```typescript
async function adicionarCEST(ncm: string, cest: string, descricao: string) {
  // Validar se NCM existe
  const ncmExiste = await verificarNCM(ncm);
  
  if (!ncmExiste) {
    throw new Error('NCM deve ser validado primeiro');
  }
  
  // Adicionar CEST à tabela local
  await inserirCEST({
    codigo_ncm: ncm,
    codigo_cest: cest,
    descricao_cest: descricao,
    tem_substituicao_tributaria: true
  });
}
```

## 📊 Estrutura de Dados Otimizada

### Tabela NCM (Já criada)
```sql
-- Estrutura atual mantida
-- Permite crescimento orgânico
-- Suporte a múltiplos CEST por NCM
```

### Funções Adicionais
```sql
-- buscar_ncm_completo() - Busca local + indicação BrasilAPI
-- adicionar_ncm_dinamico() - Adiciona NCM validado
-- validar_ncm_cest() - Valida correspondência
```

## 🔧 Implementação no Frontend

### 1. **Campo NCM Inteligente**
```typescript
const NCMField = () => {
  const [ncmData, setNcmData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const handleNCMChange = async (codigo: string) => {
    if (codigo.length === 8) {
      setLoading(true);
      
      // Consulta híbrida
      const result = await consultarNCM(codigo);
      
      if (result.fonte === 'LOCAL') {
        // Mostrar CEST disponíveis
        setCestOpcoes(result.cestOpcoes);
      } else if (result.fonte === 'BRASILAPI') {
        // NCM válido, mas sem CEST local
        setCestOpcoes([]);
        setMostrarAdicionarCEST(true);
      }
      
      setNcmData(result);
      setLoading(false);
    }
  };
  
  return (
    <div>
      <input 
        value={ncm}
        onChange={(e) => handleNCMChange(e.target.value)}
        placeholder="NCM (8 dígitos)"
      />
      
      {loading && <span>Validando NCM...</span>}
      
      {ncmData?.fonte === 'LOCAL' && (
        <CestDropdown opcoes={cestOpcoes} />
      )}
      
      {ncmData?.fonte === 'BRASILAPI' && (
        <CestManualInput 
          onAdd={(cest) => adicionarCEST(ncm, cest)}
        />
      )}
    </div>
  );
};
```

### 2. **Dropdown CEST Dinâmico**
```typescript
const CestDropdown = ({ ncm, onChange }) => {
  const [cestOpcoes, setCestOpcoes] = useState([]);
  
  useEffect(() => {
    if (ncm) {
      buscarCestPorNCM(ncm).then(setCestOpcoes);
    }
  }, [ncm]);
  
  return (
    <select onChange={(e) => onChange(e.target.value)}>
      <option value="">Selecione o CEST</option>
      {cestOpcoes.map(cest => (
        <option key={cest.codigo} value={cest.codigo}>
          {cest.codigo} - {cest.descricao}
          {cest.especificacao && ` (${cest.especificacao})`}
        </option>
      ))}
    </select>
  );
};
```

## 📈 Vantagens da Estratégia Híbrida

### ✅ Benefícios Imediatos
1. **Performance** - Consulta local rápida
2. **Confiabilidade** - Não depende 100% de APIs externas
3. **Flexibilidade** - Permite adição manual de CEST
4. **Crescimento orgânico** - Base de dados cresce conforme uso

### ✅ Benefícios a Longo Prazo
1. **Base completa** - Eventualmente terá todos os NCM usados
2. **Customização** - Pode adicionar CEST específicos da empresa
3. **Backup** - Funciona mesmo se BrasilAPI estiver fora
4. **Controle total** - Dados sob controle da empresa

## 🎯 Roadmap de Implementação

### Fase 1: Básico (Imediato)
- [x] Tabela NCM criada
- [x] Funções básicas implementadas
- [ ] Integração com formulário de produtos
- [ ] Validação via BrasilAPI

### Fase 2: Híbrido (1-2 semanas)
- [ ] Função de consulta híbrida
- [ ] Interface para adicionar CEST
- [ ] Dropdown dinâmico de CEST
- [ ] Validação NCM-CEST

### Fase 3: Avançado (1 mês)
- [ ] Cache inteligente
- [ ] Relatórios de uso
- [ ] Importação em lote
- [ ] API própria para consulta

### Fase 4: Otimização (Contínuo)
- [ ] Machine learning para sugestões
- [ ] Integração com outros sistemas
- [ ] Atualizações automáticas
- [ ] Backup e sincronização

## 🔍 Monitoramento e Métricas

### KPIs Importantes
1. **Taxa de acerto local** - % de NCM encontrados na tabela local
2. **Tempo de resposta** - Velocidade das consultas
3. **Uso de BrasilAPI** - Quantas consultas externas
4. **Crescimento da base** - Novos NCM/CEST adicionados

### Alertas
- BrasilAPI fora do ar
- NCM inválidos frequentes
- CEST duplicados
- Performance degradada

## 💡 Próximos Passos

1. **Implementar integração** com formulário de produtos
2. **Criar interface** para adição de CEST
3. **Testar fluxo completo** com dados reais
4. **Documentar processo** para usuários
5. **Treinar equipe** no novo sistema

---

**Esta estratégia resolve todos os problemas identificados:**
- ✅ Não depende de tabela completa externa
- ✅ Funciona offline após primeira consulta
- ✅ CEST padronizado nacionalmente
- ✅ Crescimento orgânico da base
- ✅ Performance otimizada
- ✅ Controle total dos dados
