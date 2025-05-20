# Documentação do Sistema Nexo Pedidos

## Visão Geral

O Nexo Pedidos é um sistema de gerenciamento de pedidos desenvolvido para empresas que precisam controlar produtos, clientes, pedidos e faturamento. O sistema possui duas interfaces principais:

1. **Interface de Administrador**: Acessada por usuários do tipo "admin", com funcionalidades completas de gerenciamento.
2. **Interface de Usuário Mobile**: Acessada por usuários do tipo "user", com layout adaptado para dispositivos móveis e funcionalidades específicas.

## Tecnologias Utilizadas

- **Frontend**: React com TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Supabase (PostgreSQL, Autenticação, Storage)
- **Gerenciamento de Estado**: React Hooks (useState, useEffect)
- **Roteamento**: React Router
- **Notificações**: React Toastify

## Estrutura do Projeto

```
nexo-pedidos/
├── src/
│   ├── components/
│   │   ├── comum/           # Componentes reutilizáveis
│   │   └── dashboard/       # Componentes específicos do dashboard
│   ├── lib/
│   │   └── supabase.ts      # Configuração do Supabase
│   ├── pages/
│   │   ├── dashboard/       # Páginas do painel administrativo
│   │   ├── user/            # Páginas do painel de usuário mobile
│   │   ├── EntrarPage.tsx   # Página de login
│   │   └── CadastrarPage.tsx # Página de cadastro
│   ├── types/               # Definições de tipos TypeScript
│   └── utils/               # Funções utilitárias
├── public/                  # Arquivos públicos
└── supabase/                # Configurações do Supabase
```

## Banco de Dados

O sistema utiliza o Supabase como backend, com as seguintes tabelas principais:

### Tabelas Principais

1. **usuarios**
   - Armazena informações dos usuários do sistema
   - Campos principais: id, nome, email, tipo (admin/user), empresa_id
   - Relacionada com a tabela de autenticação do Supabase

2. **empresas**
   - Armazena informações das empresas
   - Campos principais: id, nome, cnpj, razao_social, nome_fantasia

3. **grupos**
   - Categorias de produtos
   - Campos principais: id, nome, empresa_id, deletado, deletado_em, deletado_por

4. **produtos**
   - Produtos disponíveis para venda
   - Campos principais: id, nome, preco, descricao, codigo, grupo_id, empresa_id, ativo, promocao, deletado

5. **produto_fotos**
   - Fotos dos produtos
   - Campos principais: id, produto_id, url, storage_path, principal, empresa_id, deletado
   - Observação: Não possui os campos created_by e created_at

6. **opcoes_adicionais**
   - Opções adicionais que podem ser aplicadas aos produtos
   - Campos principais: id, nome, empresa_id

7. **opcoes_adicionais_itens**
   - Itens específicos de cada opção adicional
   - Campos principais: id, opcao_id, nome, preco

8. **produtos_opcoes_adicionais**
   - Relacionamento entre produtos e opções adicionais
   - Campos principais: produto_id, opcao_id, empresa_id, deletado

9. **clientes**
   - Informações dos clientes
   - Campos principais: id, nome, email, documento (CPF/CNPJ), razao_social, nome_fantasia, empresa_id

10. **cliente_telefones**
    - Múltiplos telefones para cada cliente
    - Campos principais: id, cliente_id, numero, tipo (fixo/celular), whatsapp

11. **cliente_enderecos**
    - Endereços dos clientes
    - Campos principais: id, cliente_id, cep, rua, numero, complemento, bairro, cidade, estado

12. **pedidos**
    - Pedidos realizados
    - Campos principais: id, numero, cliente_id, usuario_id, valor_total, status, empresa_id

13. **pedido_itens**
    - Itens de cada pedido
    - Campos principais: id, pedido_id, produto_id, quantidade, valor_unitario, valor_total

## Funcionalidades Implementadas

### Interface de Administrador

1. **Gestão de Produtos**
   - Criação, edição e exclusão de grupos de produtos
   - Criação, edição e exclusão de produtos
   - Upload de até 3 fotos por produto
   - Definição de foto principal
   - Visualização em galeria das fotos
   - Opção de ativar/desativar produtos

2. **Gestão de Clientes**
   - Cadastro completo de clientes com múltiplos telefones
   - Suporte a CPF/CNPJ com validação
   - Cadastro de múltiplos endereços

3. **Gestão de Pedidos**
   - Criação e edição de pedidos
   - Filtros por status e data
   - Visualização detalhada

4. **Faturamento**
   - Visualização de pedidos para faturamento
   - Filtros por data e status

5. **Configurações**
   - Gerenciamento de usuários
   - Configurações da empresa

### Interface de Usuário Mobile

1. **Dashboard**
   - Métricas de pedidos (hoje, semana, mês)
   - Valores totais
   - Últimos pedidos

2. **Pedidos**
   - Listagem em cards
   - Criação de novos pedidos
   - Filtros por status

3. **Produtos**
   - Visualização de produtos por grupo
   - Visualização de fotos em galeria
   - Busca de produtos

4. **Clientes**
   - Listagem de clientes
   - Cadastro de novos clientes
   - Busca de clientes

5. **Perfil**
   - Edição de dados do usuário

## Personalizações Implementadas

1. **Ocultação de Menus**
   - Menus Gestor, Conexao e Entregadores foram ocultados
   - Submenu 'Adicionais' dentro do menu Produtos foi ocultado

2. **Diferenciação de Usuários**
   - Usuários 'admin' (cadastrados pelo formulário principal)
   - Usuários 'user' (cadastrados pela área de configurações)
   - Limitação de acesso para usuários do tipo 'user'

3. **Formulários**
   - Campo de preço com máscara de moeda brasileira (R$)
   - Reposicionamento do campo 'Produto Ativo' acima do 'Código do Produto'
   - Ocultação da opção 'Produto em Promoção'
   - Formulários de endereço com campos específicos e máscara para CEP

4. **Fotos de Produtos**
   - Implementação de upload de até 3 fotos por produto
   - Visualização em galeria/carrossel
   - Exibição da foto principal na listagem de produtos

5. **Telefones de Clientes**
   - Suporte a múltiplos telefones
   - Seleção de tipo (fixo/celular)
   - Indicador de WhatsApp
   - Máscaras específicas para cada tipo

## Desafios e Soluções

### 1. Políticas de Segurança RLS no Supabase

**Desafio**: Erro "new row violates row-level security policy" ao fazer upload de fotos.

**Solução**: Adicionamos o campo `empresa_id` na tabela `produto_fotos` para vincular as fotos à empresa correspondente, garantindo que as políticas RLS sejam respeitadas.

### 2. Estrutura da Tabela produto_fotos

**Desafio**: Erro "Could not find the 'created_by' column of 'produto_fotos' in the schema cache" ao tentar inserir dados.

**Solução**: Removemos os campos `created_by` e `created_at` do objeto de inserção, mantendo apenas os campos que existem na tabela.

### 3. Atualização da Interface após Upload de Fotos

**Desafio**: A interface não atualizava automaticamente após o upload de fotos, exigindo atualização manual da página.

**Solução**: Implementamos código para atualizar automaticamente a lista de fotos principais e forçar a renderização dos componentes afetados após o upload, definição de foto principal ou exclusão de fotos.

### 4. Múltiplos Telefones para Clientes

**Desafio**: Implementar suporte a múltiplos telefones com tipos diferentes e indicador de WhatsApp.

**Solução**: Criamos a tabela `cliente_telefones` e implementamos uma interface que permite adicionar, editar e remover múltiplos telefones, com seleção de tipo e indicador de WhatsApp.

## Melhorias Futuras

1. **Otimização de Desempenho**
   - Implementar paginação para listas grandes
   - Otimizar consultas ao banco de dados

2. **Melhorias de UX**
   - Adicionar mais animações e transições
   - Melhorar a responsividade em diferentes dispositivos

3. **Funcionalidades Adicionais**
   - Implementar sistema de notificações
   - Adicionar relatórios e gráficos
   - Integração com sistemas de pagamento

## Notas Importantes

1. **Políticas RLS**: Ao trabalhar com o Supabase, sempre verifique se as políticas RLS estão configuradas corretamente e se todos os campos necessários estão sendo incluídos nas operações de inserção.

2. **Campos Obrigatórios**: A tabela `produto_fotos` requer os campos `produto_id`, `url`, `storage_path`, `principal`, `empresa_id` e `deletado`. Não inclua `created_by` ou `created_at`.

3. **Atualização da Interface**: Implementamos código para atualizar automaticamente a interface após operações com fotos. Se novas funcionalidades forem adicionadas, considere implementar abordagem semelhante.

4. **Estrutura de Arquivos**: Mantenha a organização atual de arquivos, com componentes reutilizáveis em `components/comum` e componentes específicos em pastas dedicadas.

5. **Consistência Visual**: Mantenha a consistência visual entre as interfaces de administrador e usuário mobile, utilizando os mesmos componentes e estilos quando apropriado.

## Conclusão

O sistema Nexo Pedidos é uma aplicação robusta para gerenciamento de pedidos, com interfaces distintas para administradores e usuários móveis. As principais funcionalidades estão implementadas, mas há espaço para melhorias e expansões futuras.

Esta documentação serve como guia para entender a estrutura, funcionalidades e desafios do sistema, facilitando a continuidade do desenvolvimento por outros desenvolvedores.
