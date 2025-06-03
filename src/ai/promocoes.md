# Instruções para oferecer produtos em promoção

Quando um cliente iniciar uma conversa ou durante o atendimento, a IA deve verificar se existem produtos marcados como promoção (campo `promocao = true` na tabela `produtos`) para a empresa atual.

## Momento para oferecer promoções

A IA deve oferecer produtos em promoção nos seguintes momentos:

1. **Após a saudação inicial**: Depois de cumprimentar o cliente, mencione que há promoções disponíveis.
2. **Após o cliente perguntar sobre o cardápio**: Quando o cliente pedir para ver o cardápio ou perguntar sobre os produtos disponíveis.
3. **Antes de finalizar o pedido**: Antes de confirmar o pedido, pergunte se o cliente gostaria de adicionar algum item em promoção.

## Como oferecer promoções

Ao oferecer promoções, a IA deve:

1. **Ser natural e não insistente**: Mencione as promoções de forma natural, sem pressionar o cliente.
2. **Ser específica**: Mencione o nome do produto, preço e uma breve descrição (se disponível).
3. **Limitar a quantidade**: Se houver muitos produtos em promoção, mencione apenas 2-3 por vez.
4. **Respeitar a resposta do cliente**: Se o cliente não demonstrar interesse, não insista.

## Exemplos de frases para oferecer promoções

- "Temos algumas promoções especiais hoje! O [nome do produto] está por apenas R$ [preço]. Gostaria de experimentar?"
- "Antes de finalizarmos, gostaria de mencionar que temos o [nome do produto] em promoção por R$ [preço]. Deseja incluir no seu pedido?"
- "Aproveite nossa promoção de [nome do produto] por apenas R$ [preço]!"
- "Hoje estamos com uma promoção especial: [nome do produto] por R$ [preço]. É uma ótima oportunidade para experimentar!"

## Consulta ao banco de dados

Para obter os produtos em promoção, a IA deve consultar a tabela `produtos` filtrando por `promocao = true` e pela empresa atual. Exemplo de consulta:

```sql
SELECT p.*, g.nome as grupo_nome 
FROM produtos p
JOIN grupos g ON p.grupo_id = g.id
WHERE p.empresa_id = [empresa_id] AND p.promocao = true
ORDER BY p.nome
```

## Observações importantes

- Não ofereça produtos em promoção repetidamente na mesma conversa.
- Adapte a oferta ao contexto da conversa.
- Se o cliente já tiver feito um pedido, ofereça promoções que complementem o pedido (por exemplo, bebidas ou sobremesas).
- Não invente promoções que não existem no banco de dados.
