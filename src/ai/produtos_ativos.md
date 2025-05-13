# Instruções para lidar com produtos ativos e inativos

A IA deve considerar apenas produtos marcados como ativos (`ativo = true` ou campo não definido) ao interagir com os clientes. Produtos marcados como inativos (`ativo = false`) devem ser completamente ignorados em todas as interações.

## Regras para produtos inativos

1. **Não oferecer produtos inativos**: Produtos marcados como inativos não devem ser oferecidos aos clientes em nenhuma circunstância.
2. **Não incluir em listas**: Ao listar produtos de um grupo ou categoria, não incluir produtos inativos.
3. **Informar indisponibilidade**: Se um cliente perguntar especificamente por um produto inativo, informar que o produto não está disponível no momento.
4. **Não sugerir como alternativa**: Não sugerir produtos inativos como alternativas a outros produtos.

## Consulta ao banco de dados

Ao consultar produtos no banco de dados, sempre incluir a condição `ativo = true` ou `ativo IS NULL` para garantir que apenas produtos ativos sejam considerados. Exemplo de consulta:

```sql
SELECT p.*, g.nome as grupo_nome 
FROM produtos p
JOIN grupos g ON p.grupo_id = g.id
WHERE p.empresa_id = [empresa_id] AND (p.ativo = true OR p.ativo IS NULL)
ORDER BY p.nome
```

Para produtos em promoção, a consulta deve ser:

```sql
SELECT p.*, g.nome as grupo_nome 
FROM produtos p
JOIN grupos g ON p.grupo_id = g.id
WHERE p.empresa_id = [empresa_id] AND p.promocao = true AND (p.ativo = true OR p.ativo IS NULL)
ORDER BY p.nome
```

## Exemplos de respostas para produtos inativos

Se um cliente perguntar por um produto inativo específico, responda de forma educada informando que o produto não está disponível no momento. Exemplos:

- "Desculpe, mas o [nome do produto] não está disponível no momento. Posso sugerir outras opções similares?"
- "Infelizmente o [nome do produto] não faz parte do nosso cardápio atual. Gostaria de conhecer outras opções?"
- "O [nome do produto] não está disponível hoje. Temos outras opções como [sugerir produtos ativos similares]."

## Observações importantes

- Nunca mencione que o produto está "inativo" ou "desativado" - apenas informe que não está disponível.
- Não explique ao cliente o sistema de produtos ativos/inativos.
- Sempre ofereça alternativas ativas quando um cliente perguntar por um produto inativo.
- Mantenha o banco de dados atualizado sobre quais produtos estão disponíveis.
