# Documentação do Sistema Nexo Pedidos

## Índice

1. [Visão Geral do Sistema](#visão-geral-do-sistema)
2. [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
3. [Funcionalidades Implementadas](#funcionalidades-implementadas)
4. [Desafios e Soluções](#desafios-e-soluções)
5. [Próximos Passos](#próximos-passos)

## Visão Geral do Sistema

O Nexo Pedidos é um sistema de gerenciamento de pedidos desenvolvido para empresas que precisam controlar produtos, clientes, pedidos e faturamento. O sistema possui duas interfaces principais:

1. **Interface de Administrador**: Acessada por usuários do tipo "admin", com funcionalidades completas de gerenciamento.
2. **Interface de Usuário Mobile**: Acessada por usuários do tipo "user", com layout adaptado para dispositivos móveis e funcionalidades específicas.

Para uma documentação completa do sistema, consulte o arquivo [documentacao_sistema.md](./documentacao_sistema.md).

## Estrutura do Banco de Dados

O sistema utiliza o Supabase como backend, com as seguintes tabelas principais:

- **usuarios**: Armazena informações dos usuários do sistema
- **empresas**: Armazena informações das empresas
- **grupos**: Categorias de produtos
- **produtos**: Produtos disponíveis para venda
- **produto_fotos**: Fotos dos produtos
- **opcoes_adicionais**: Opções adicionais que podem ser aplicadas aos produtos
- **opcoes_adicionais_itens**: Itens específicos de cada opção adicional
- **produtos_opcoes_adicionais**: Relacionamento entre produtos e opções adicionais
- **clientes**: Informações dos clientes
- **cliente_telefones**: Múltiplos telefones para cada cliente
- **cliente_enderecos**: Endereços dos clientes
- **pedidos**: Pedidos realizados
- **pedido_itens**: Itens de cada pedido

Para uma documentação detalhada da estrutura do banco de dados, consulte o arquivo [estrutura_banco_dados.md](./estrutura_banco_dados.md).

## Funcionalidades Implementadas

### Interface de Administrador

1. **Gestão de Produtos**
   - Criação, edição e exclusão de grupos de produtos
   - Criação, edição e exclusão de produtos
   - Upload de até 3 fotos por produto
   - Definição de foto principal
   - Visualização em galeria das fotos

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

Para uma documentação completa das funcionalidades implementadas, consulte o arquivo [funcionalidades_implementadas.md](./funcionalidades_implementadas.md).

## Desafios e Soluções

Durante o desenvolvimento do sistema, enfrentamos diversos desafios técnicos e de implementação. Os principais desafios incluem:

1. **Políticas de Segurança RLS no Supabase**
   - Erro "new row violates row-level security policy" ao fazer upload de fotos
   - Solução: Adição do campo empresa_id na tabela produto_fotos

2. **Estrutura da Tabela produto_fotos**
   - Erro "Could not find the 'created_by' column of 'produto_fotos' in the schema cache"
   - Solução: Remoção dos campos inexistentes do objeto de inserção

3. **Atualização da Interface após Upload de Fotos**
   - Interface não atualizava automaticamente após operações com fotos
   - Solução: Implementação de código para atualização automática da interface

4. **Múltiplos Telefones para Clientes**
   - Implementação de suporte a múltiplos telefones com tipos diferentes
   - Solução: Criação de tabela específica e interface dinâmica para gerenciamento

Para uma documentação detalhada dos desafios enfrentados e soluções implementadas, consulte o arquivo [desafios_e_solucoes.md](./desafios_e_solucoes.md).

## Próximos Passos

Algumas sugestões para o desenvolvimento futuro do sistema:

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

4. **Segurança**
   - Revisar e aprimorar as políticas RLS
   - Implementar autenticação de dois fatores
   - Adicionar logs de auditoria

5. **Testes**
   - Implementar testes unitários
   - Adicionar testes de integração
   - Configurar CI/CD para execução automática de testes

## Configuração do Projeto

### Supabase

- **URL**: https://xsrirnfwsjeovekwtluz.supabase.co
- **Projeto**: nexo

### Inicialização do Projeto

```bash
# Clonar o repositório
git clone https://github.com/emanuelsistemas/nexo-pedidos.git

# Entrar no diretório do projeto
cd nexo-pedidos

# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npm run dev
```

## Contribuição

Para contribuir com o projeto, siga estas etapas:

1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova funcionalidade'`)
4. Faça push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Contato

Para mais informações, entre em contato com:

- Emanuel Luis - emanuel.sistemas@gmail.com
