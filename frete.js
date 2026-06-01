// api/frete.js
// Calcula frete real via API do Melhor Envio

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  const { cep } = req.body;

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
        'User-Agent': 'LivroMulheresMorderam (contato@escritorlecao.com.br)',
      },
      body: JSON.stringify({
        from: {
          postal_code: process.env.CEP_ORIGEM // CEP de onde você vai postar
        },
        to: {
          postal_code: cep.replace(/\D/g, '')
        },
        package: {
          height: 2,   // cm
          width: 16,   // cm
          length: 23,  // cm
          weight: 0.4  // kg (ajuste ao peso real do livro)
        },
        services: '1,2,3,4', // PAC, SEDEX, e outros
        options: {
          insurance_value: 39.90,
          receipt: false,
          own_hand: false
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro Melhor Envio:', data);
      return res.status(502).json({ erro: 'Erro ao calcular frete. Tente novamente.' });
    }

    // Filtra só os serviços com preço e sem erro
    const opcoes = data
      .filter(s => !s.error && s.price)
      .map(s => ({
        id: s.id,
        nome: s.name,
        empresa: s.company.name,
        preco: parseFloat(s.price),
        prazo: s.delivery_time,
        logo: s.company.picture
      }))
      .sort((a, b) => a.preco - b.preco);

    return res.status(200).json({ opcoes });

  } catch (err) {
    console.error('Erro interno:', err);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
}
