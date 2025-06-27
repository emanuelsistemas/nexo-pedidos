# Documentação de Migração - Scripts Nexo e Push

## Visão Geral

Este documento contém instruções para configurar os comandos personalizados `nexo` e `push` em um novo servidor. Estes comandos facilitam o gerenciamento e execução do projeto Nexo Pedidos.

## Conteúdo

Esta pasta contém os seguintes arquivos essenciais:

- `nexo` - Script que inicia o projeto Nexo Pedidos
- `push` - Script para realizar commits e push automáticos
- `start.sh` - Script de inicialização chamado pelo comando `nexo`
- `README.md` - Esta documentação

## Como Configurar no Novo Servidor

Siga estas etapas para configurar os scripts no novo servidor:

### 1. Pré-requisitos no Novo Servidor

Certifique-se de que o novo servidor possui:

- Git instalado
- Node.js (versão 18+)
- npm 
- PHP 7.4+ com PHP-FPM
- Nginx
- Composer
- O repositório já clonado em `/root/nexo/nexo-pedidos`

Se algum destes não estiver instalado, use os comandos apropriados para sua distribuição Linux.

### 2. Instalação dos Scripts

```bash
# Criar diretório para os scripts (se ainda não existir)
mkdir -p /root/nexo/nexo-pedidos/inicializar_push

# Copiar os scripts para os locais corretos
cp /caminho/para/nexo /usr/local/bin/
cp /caminho/para/push /root/nexo/nexo-pedidos/inicializar_push/
cp /caminho/para/start.sh /root/nexo/nexo-pedidos/

# Definir permissões de execução
chmod +x /usr/local/bin/nexo
chmod +x /root/nexo/nexo-pedidos/inicializar_push/push
chmod +x /root/nexo/nexo-pedidos/start.sh

# Opcional: Criar link simbólico para o comando push
ln -s /root/nexo/nexo-pedidos/inicializar_push/push /usr/local/bin/push
```

### 3. Ajustar Caminhos (Se Necessário)

Se o caminho do projeto no novo servidor for diferente do padrão `/root/nexo/nexo-pedidos`, é necessário editar os scripts:

#### Editar o script `nexo`:

```bash
nano /usr/local/bin/nexo
```

Altere a linha `PROJECT_DIR="/root/nexo/nexo-pedidos"` para o caminho correto no novo servidor.

#### Editar o script `push`:

```bash
nano /root/nexo/nexo-pedidos/inicializar_push/push
```

Altere a linha `PROJECT_DIR="/root/nexo/nexo-pedidos"` para o caminho correto no novo servidor.

## Como Usar os Comandos

### Comando `nexo`

Este comando inicia o projeto Nexo Pedidos:

```bash
nexo
```

O que ele faz:
1. Navega até o diretório do projeto
2. Executa o script `start.sh` que:
   - Verifica dependências
   - Instala pacotes necessários se faltantes
   - Configura o ambiente
   - Gera o build
   - Configura permissões
   - Verifica serviços (nginx, php-fpm)

### Comando `push`

Este comando automatiza commits e pushes para o repositório:

```bash
push
```

Ou se você criou o link simbólico:

```bash
cd /root/nexo/nexo-pedidos/inicializar_push
./push
```

O que ele faz:
1. Navega até o diretório do projeto
2. Adiciona todos os arquivos modificados (git add .)
3. Realiza um commit com mensagem automática contendo data e hora
4. Faz push para o repositório remoto

## Solução de Problemas

### Problema: O comando `nexo` não é encontrado

**Solução**: Verifique se o script está em `/usr/local/bin/` e se tem permissão de execução:
```bash
ls -la /usr/local/bin/nexo
chmod +x /usr/local/bin/nexo
```

### Problema: Erros de permissão ao executar os scripts

**Solução**: Verifique e corrija as permissões:
```bash
chmod +x /usr/local/bin/nexo
chmod +x /root/nexo/nexo-pedidos/inicializar_push/push
chmod +x /root/nexo/nexo-pedidos/start.sh
```

### Problema: Erros no Git ao executar `push`

**Solução**: Verifique se as credenciais Git estão configuradas:
```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
```

E se necessário, configure o acesso SSH para o repositório.

## Informações Adicionais

- Os scripts são configurados para usar o fuso horário de São Paulo (GMT-3) para timestamps
- O comando `nexo` depende do script `start.sh` para funcionar corretamente
- O comando `push` realiza commits automáticos com mensagens padronizadas

Para mais informações sobre o projeto Nexo Pedidos, consulte o `README.md` principal do projeto.

---
Última atualização: 13/06/2025
