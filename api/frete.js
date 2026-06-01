export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  const { cep } = req.body || {};
  if (!cep || cep.replace(/\D/g, '').length !== 8) {
    return res.status(400).json({ erro: 'CEP inválido' });
  }

  try {
    const response = await fetch('https://melhorenvio.com.br/api/v2/me/shipment/calculate', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`,
        'User-Agent': 'MulheresMorderam/1.0 (leandro@escritorlecao.com.br)',
      },
      body: JSON.stringify({
        from: { postal_code: process.env.CEP_ORIGEM },
        to: { postal_code: cep.replace(/\D/g, '') },
        package: { height: 2, width: 16, length: 23, weight: 0.4 },
        options: { insurance_value: 39.90, receipt: false, own_hand: false }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro Melhor Envio:', JSON.stringify(data));
      return res.status(502).json({ erro: 'Erro ao calcular frete. Tente novamente.' });
    }

    const opcoes = (Array.isArray(data) ? data : [])
      .filter(s => !s.error && s.price)
      .map(s => ({
        id: s.id,
        nome: s.name,
        empresa: s.company.name,
        preco: parseFloat(s.price),
        prazo: s.delivery_time,
      }))
      .sort((a, b) => a.preco - b.preco);

    if (opcoes.length === 0) {
      return res.status(200).json({ erro: 'Nenhuma opção de frete disponível para este CEP.' });
    }

    return res.status(200).json({ opcoes });

  } catch (err) {
    console.error('Erro interno frete:', err.message);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}
