# Estrutura do Banco de Dados - Nexo Pedidos

## Visão Geral

O sistema Nexo Pedidos utiliza o Supabase como backend, que é construído sobre o PostgreSQL. A estrutura do banco de dados foi projetada para suportar múltiplas empresas (multi-tenant) e diferentes tipos de usuários, com foco em gerenciamento de produtos, clientes e pedidos.

## Tabelas Principais

### 1. usuarios

Armazena informações dos usuários do sistema.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Chave primária, vinculada ao auth.users do Supabase |
| nome | text | Nome completo do usuário |
| email | text | Email do usuário |
| tipo | text | Tipo de usuário: 'admin' ou 'user' |
| empresa_id | uuid | Referência à empresa do usuário |
| created_at | timestamp | Data de criação |
| updated_at | timestamp | Data de atualização |

**Observações:**
- Usuários 'admin' têm acesso completo ao sistema
- Usuários 'user' têm acesso limitado e interface mobile

### 2. empresas

Armazena informações das empresas cadastradas no sistema.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Chave primária |
| nome | text | Nome da empresa |
| cnpj | text | CNPJ da empresa |
| razao_social | text | Razão social |
| nome_fantasia | text | Nome fantasia |
| created_at | timestamp | Data de criação |
| updated_at | timestamp | Data de atualização |

**Observações:**
- Cada usuário está vinculado a uma empresa
- Todos os registros do sistema (produtos, clientes, pedidos) estão vinculados a uma empresa

### 3. grupos

Categorias de produtos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Chave primária |
| nome | text | Nome do grupo |
| empresa_id | uuid | Referência à empresa |
| deletado | boolean | Indica se o grupo foi excluído (exclusão lógica) |
| deletado_em | timestamp | Data da exclusão |
| deletado_por | uuid | Usuário que realizou a exclusão |
| created_at | timestamp | Data de criação |

**Observações:**
- Utilizamos exclusão lógica (soft delete) para manter histórico
- Cada grupo pertence a uma empresa específica

### 4. produtos

Produtos disponíveis para venda.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Chave primária |
| nome | text | Nome do produto |
| preco | numeric | Preço do produto |
| descricao | text | Descrição do produto |
| codigo | text | Código único do produto |
| grupo_id | uuid | Referência ao grupo do produto |
| empresa_id | uuid | Referência à empresa |
| ativo | boolean | Indica se o produto está ativo |
| promocao | boolean | Indica se o produto está em promoção |
| deletado | boolean | Indica se o produto foi excluído |
| deletado_em | timestamp | Data da exclusão |
| deletado_por | uuid | Usuário que realizou a exclusão |
| created_at | timestamp | Data de criação |

**Observações:**
- O campo 'promocao' está implementado mas ocultado na interface conforme solicitação
- O campo 'codigo' deve ser único dentro da empresa

### 5. produto_fotos

Fotos dos produtos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Chave primária |
| produto_id | uuid | Referência ao produto |
| url | text | URL pública da foto |
| storage_path | text | Caminho no storage do Supabase |
| principal | boolean | Indica se é a foto principal |
| empresa_id | uuid | Referência à empresa |
| deletado | boolean | Indica se a foto foi excluída |

**Observações:**
- Cada produto pode ter até 3 fotos
- Apenas uma foto pode ser marcada como principal
- **Importante**: Esta tabela não possui os campos 'created_by' e 'created_at'
- O campo 'empresa_id' foi adicionado para compatibilidade com as políticas RLS

### 6. opcoes_adicionais

Opções adicionais que podem ser aplicadas aos produtos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Chave primária |
| nome | text | Nome da opção |
| empresa_id | uuid | Referência à empresa |
| created_at | timestamp | Data de criação |

**Observações:**
- Exemplos: "Tamanho", "Sabor", "Cor"
- Cada opção pode ter múltiplos itens

### 7. opcoes_adicionais_itens

Itens específicos de cada opção adicional.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Chave primária |
| opcao_id | uuid | Referência à opção adicional |
| nome | text | Nome do item |
| preco | numeric | Preço adicional do item |
| created_at | timestamp | Data de criação |

**Observações:**
- Exemplos: Para opção "Tamanho": "P", "M", "G"
- Cada item pode ter um preço adicional

### 8. produtos_opcoes_adicionais

Relacionamento entre produtos e opções adicionais.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| produto_id | uuid | Referência ao produto |
| opcao_id | uuid | Referência à opção adicional |
| empresa_id | uuid | Referência à empresa |
| deletado | boolean | Indica se o relacionamento foi excluído |
| deletado_em | timestamp | Data da exclusão |
| deletado_por | uuid | Usuário que realizou a exclusão |

**Observações:**
- Tabela de relacionamento muitos-para-muitos
- O campo 'empresa_id' foi adicionado para compatibilidade com as políticas RLS

### 9. clientes

Informações dos clientes.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Chave primária |
| nome | text | Nome do cliente |
| email | text | Email do cliente |
| documento | text | CPF ou CNPJ |
| razao_social | text | Razão social (para PJ) |
| nome_fantasia | text | Nome fantasia (para PJ) |
| empresa_id | uuid | Referência à empresa |
| created_at | timestamp | Data de criação |
| updated_at | timestamp | Data de atualização |

**Observações:**
- Suporta tanto pessoas físicas quanto jurídicas
- Os telefones e endereços são armazenados em tabelas separadas

### 10. cliente_telefones

Múltiplos telefones para cada cliente.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Chave primária |
| cliente_id | uuid | Referência ao cliente |
| numero | text | Número de telefone |
| tipo | text | Tipo: 'fixo' ou 'celular' |
| whatsapp | boolean | Indica se é WhatsApp |
| created_at | timestamp | Data de criação |

**Observações:**
- Um cliente pode ter múltiplos telefones
- Para celulares, pode-se indicar se é WhatsApp

### 11. cliente_enderecos

Endereços dos clientes.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Chave primária |
| cliente_id | uuid | Referência ao cliente |
| cep | text | CEP |
| rua | text | Rua/Avenida |
| numero | text | Número |
| complemento | text | Complemento |
| bairro | text | Bairro |
| cidade | text | Cidade |
| estado | text | Estado |
| created_at | timestamp | Data de criação |

**Observações:**
- Um cliente pode ter múltiplos endereços
- O CEP possui máscara xx.xxx-xxx e botão de pesquisa automática

### 12. pedidos

Pedidos realizados.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Chave primária |
| numero_pedido | text | Número do pedido (exibido ao usuário) |
| cliente_id | uuid | Referência ao cliente |
| usuario_id | uuid | Usuário que criou o pedido |
| valor_total | numeric | Valor total do pedido |
| status | text | Status: 'pendente', 'confirmado', 'em_preparo', 'em_entrega', 'entregue', 'cancelado' |
| empresa_id | uuid | Referência à empresa |
| created_at | timestamp | Data de criação |
| updated_at | timestamp | Data de atualização |

**Observações:**
- O campo 'status' controla o fluxo do pedido
- A opção de empresa no formulário de pedidos foi ocultada conforme solicitação

### 13. pedido_itens

Itens de cada pedido.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Chave primária |
| pedido_id | uuid | Referência ao pedido |
| produto_id | uuid | Referência ao produto |
| quantidade | integer | Quantidade do produto |
| valor_unitario | numeric | Valor unitário no momento da compra |
| valor_total | numeric | Valor total do item (quantidade * valor_unitário) |
| created_at | timestamp | Data de criação |

**Observações:**
- Armazenamos o valor unitário no momento da compra para manter histórico
- Cada item pode ter opções adicionais específicas

## Políticas de Segurança (RLS)

O Supabase utiliza Row Level Security (RLS) para controlar o acesso aos dados. As principais políticas implementadas são:

1. **Política de Empresa**: Usuários só podem ver e modificar dados da sua própria empresa
2. **Política de Usuário**: Usuários do tipo 'user' têm acesso limitado aos dados
3. **Política de Exclusão Lógica**: Registros marcados como 'deletado' são filtrados automaticamente

**Importante**: Ao inserir registros em tabelas com RLS, certifique-se de incluir todos os campos necessários, especialmente `empresa_id`.

## Relacionamentos

- **usuarios** → **empresas**: Muitos para um
- **grupos** → **empresas**: Muitos para um
- **produtos** → **grupos**: Muitos para um
- **produtos** → **empresas**: Muitos para um
- **produto_fotos** → **produtos**: Muitos para um
- **opcoes_adicionais** → **empresas**: Muitos para um
- **opcoes_adicionais_itens** → **opcoes_adicionais**: Muitos para um
- **produtos** ↔ **opcoes_adicionais**: Muitos para muitos (via produtos_opcoes_adicionais)
- **clientes** → **empresas**: Muitos para um
- **cliente_telefones** → **clientes**: Muitos para um
- **cliente_enderecos** → **clientes**: Muitos para um
- **pedidos** → **clientes**: Muitos para um
- **pedidos** → **usuarios**: Muitos para um
- **pedidos** → **empresas**: Muitos para um
- **pedido_itens** → **pedidos**: Muitos para um
- **pedido_itens** → **produtos**: Muitos para um

## Considerações para Desenvolvimento Futuro

1. **Índices**: Considere adicionar índices para campos frequentemente usados em consultas, como `empresa_id`, `cliente_id`, `produto_id`.

2. **Constraints**: Verifique se todas as constraints de chave estrangeira estão implementadas corretamente.

3. **Campos Adicionais**: Ao adicionar novos campos, verifique se eles são compatíveis com as políticas RLS existentes.

4. **Migrações**: Documente todas as alterações de esquema para facilitar migrações futuras.

5. **Backup**: Implemente uma estratégia de backup regular para os dados.
