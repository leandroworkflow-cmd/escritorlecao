export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  const { freteNome, fretePreco } = req.body || {};
  if (!fretePreco) return res.status(400).json({ erro: 'Dados incompletos.' });

  const PRECO_LIVRO = 39.90;
  const total = parseFloat((PRECO_LIVRO + parseFloat(fretePreco)).toFixed(2));

  try {
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        items: [{
          title: 'Mulheres que Morderam o Medo — Lecão',
          description: `Livro de poesia + frete (${freteNome})`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: total
        }],
        back_urls: {
          success: `${process.env.SITE_URL}/obrigado.html`,
          failure: process.env.SITE_URL,
          pending: process.env.SITE_URL
        },
        auto_return: 'approved',
        statement_descriptor: 'LEANDROLECAO',
        external_reference: `LIVRO-${Date.now()}`
      })
    });

    const data = await response.json();

    if (!response.ok || !data.init_point) {
      console.error('Erro MP:', JSON.stringify(data));
      return res.status(502).json({ erro: 'Erro ao criar pagamento. Tente novamente.' });
    }

    return res.status(200).json({ url: data.init_point, total });

  } catch (err) {
    console.error('Erro interno checkout:', err.message);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}
