# Documentação do Sistema nexo

## Sumário
1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Banco de Dados](#banco-de-dados)
4. [Funcionalidades](#funcionalidades)
5. [Fluxos de Trabalho](#fluxos-de-trabalho)

## Visão Geral

O nexo é um sistema moderno para gestão de estabelecimentos comerciais, focado principalmente em restaurantes, lanchonetes e similares. O sistema oferece funcionalidades completas para gerenciamento de produtos, pedidos, entregas e configurações operacionais.

## Arquitetura

### Tecnologias Utilizadas
- Frontend: React + TypeScript + Vite
- Estilização: Tailwind CSS
- Banco de Dados: Supabase (PostgreSQL)
- Autenticação: Supabase Auth
- Gerenciamento de Estado: Zustand
- Gráficos: Chart.js
- Animações: Framer Motion
- Ícones: Lucide React

### Estrutura de Diretórios
```
src/
  ├── components/        # Componentes reutilizáveis
  ├── pages/            # Páginas da aplicação
  ├── store/            # Gerenciamento de estado global
  ├── lib/              # Configurações e utilitários
  ├── types/            # Definições de tipos TypeScript
  └── utils/            # Funções utilitárias
```

## Banco de Dados

### Estrutura Principal

#### Empresas e Usuários
- `empresas`: Armazena dados das empresas
  - Relacionamentos:
    - 1:N com `usuarios`
    - 1:N com `grupos`
    - 1:N com `configuracoes`
    - 1:N com `status_loja`

- `usuarios`: Gerencia usuários do sistema
  - Relacionamentos:
    - N:1 com `empresas`
    - N:1 com `perfis_acesso`

#### Produtos e Grupos
- `grupos`: Categoriza produtos
  - Relacionamentos:
    - N:1 com `empresas`
    - 1:N com `produtos`

- `produtos`: Cadastro de produtos
  - Relacionamentos:
    - N:1 com `grupos`
    - N:N com `opcoes_adicionais` através de `produtos_opcoes_adicionais`
    - 1:N com `pedidos_itens`

#### Opções Adicionais
- `opcoes_adicionais`: Grupos de adicionais
  - Relacionamentos:
    - N:1 com `empresas`
    - 1:N com `opcoes_adicionais_itens`
    - N:N com `produtos` através de `produtos_opcoes_adicionais`

- `opcoes_adicionais_itens`: Itens de adicionais
  - Relacionamentos:
    - N:1 com `opcoes_adicionais`
    - N:N com `produtos` através de `produtos_opcoes_adicionais_itens`

#### Pedidos
- `pedidos`: Registro de pedidos
  - Relacionamentos:
    - N:1 com `empresas`
    - N:1 com `entregadores`
    - 1:N com `pedidos_itens`

- `pedidos_itens`: Itens do pedido
  - Relacionamentos:
    - N:1 com `pedidos`
    - N:1 com `produtos`
    - 1:N com `pedidos_itens_adicionais`

- `pedidos_itens_adicionais`: Adicionais dos itens
  - Relacionamentos:
    - N:1 com `pedidos_itens`
    - N:1 com `opcoes_adicionais_itens`

#### Configurações
- `configuracoes`: Configurações gerais
  - Campos principais:
    - `taxa_modo`: Define modo de cálculo da taxa ('bairro' ou 'distancia')

- `status_loja`: Status de funcionamento
  - Campos principais:
    - `aberto`: Status atual
    - `aberto_manual`: Indica controle manual
    - `modo_operacao`: Modo de operação ('manual' ou 'automatico')

- `horario_atendimento`: Horários de funcionamento
  - Campos principais:
    - `dia_semana`: Dia da semana (0-6)
    - `hora_abertura`: Horário de abertura
    - `hora_fechamento`: Horário de fechamento

#### Entrega
- `entregadores`: Cadastro de entregadores
  - Campos principais:
    - `nome`: Nome do entregador
    - `comissao`: Percentual de comissão

- `taxa_entrega`: Configuração de taxas
  - Campos principais:
    - `cep`: CEP para modo bairro
    - `bairro`: Bairro para modo bairro
    - `km`: Distância para modo distância
    - `valor`: Valor da taxa

## Funcionalidades

### Gestão de Produtos
O sistema implementa uma estrutura hierárquica para produtos:

1. Grupos
   - Categorização principal dos produtos
   - Permite organização por tipo/categoria

2. Produtos
   - Informações básicas (nome, preço, código)
   - Descrição detalhada
   - Vinculação com grupo

3. Opções Adicionais
   - Grupos de adicionais
   - Itens de adicionais com preços
   - Vinculação com produtos

### Kanban de Pedidos
O sistema implementa um quadro Kanban para gestão de pedidos com os seguintes status:

1. Aguardando
   - Pedidos recém-recebidos
   - Aguardando aceitação

2. Preparando
   - Pedidos em produção
   - Em preparação na cozinha

3. Pronto
   - Pedidos prontos para entrega
   - Aguardando entregador

4. Enviado
   - Pedidos em rota de entrega
   - Com entregador designado

5. Entregue
   - Pedidos finalizados
   - Entrega confirmada

6. Recusado
   - Pedidos não aceitos
   - Cancelados por algum motivo

### Configurações Operacionais

1. Status da Loja
   - Controle manual ou automático
   - Horários de funcionamento
   - Status atual (aberto/fechado)

2. Taxa de Entrega
   - Modo bairro: Taxa por região
   - Modo distância: Taxa por quilometragem

3. Entregadores
   - Cadastro de entregadores
   - Gestão de comissões
   - Vinculação com pedidos

## Fluxos de Trabalho

### Cadastro de Produtos
1. Criar grupo
2. Adicionar produto ao grupo
3. Configurar opções adicionais (se necessário)
   - Criar grupo de adicionais
   - Adicionar itens aos adicionais
   - Vincular adicionais ao produto

### Gestão de Pedidos
1. Recebimento do pedido
   - Status inicial: Aguardando
   - Validação de dados

2. Fluxo de produção
   - Aceitação → Preparando
   - Finalização → Pronto
   - Saída para entrega → Enviado
   - Confirmação → Entregue

3. Controle de entrega
   - Designação de entregador
   - Cálculo de taxa de entrega
   - Registro de entrega

### Configuração Inicial
1. Cadastro da empresa
2. Configuração de taxa de entrega
3. Definição de horários
4. Cadastro de entregadores
5. Configuração de status da loja

Esta documentação fornece uma visão geral do sistema nexo. Para mais detalhes específicos sobre cada funcionalidade ou componente, consulte o código-fonte ou entre em contato com a equipe de desenvolvimento.