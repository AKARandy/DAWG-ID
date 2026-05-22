export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { province, scenario } = req.body;
  if (!province || !scenario) {
    return res.status(400).json({ error: 'province and scenario are required' });
  }

  const endpoint = process.env.FOUNDRY_ENDPOINT;
  const apiKey = process.env.FOUNDRY_API_KEY;

  if (!endpoint || !apiKey) {
    return res.status(500).json({ error: 'Foundry API not configured' });
  }

  const prompt = `Kamu adalah analis ekonomi senior yang menganalisis kerentanan ekonomi regional Indonesia terhadap konvergensi guncangan global 2026 (krisis Selat Hormuz, tarif AS, tekanan nilai tukar, ancaman downgrade).

## Data Provinsi: ${province.province}
- Skor Kerentanan: ${province.score.toFixed(3)} (Rank #${province.rank} dari 38 provinsi)
- Skenario: ${scenario}
- HHI Sektoral: ${province.hhi.toFixed(3)} (konsentrasi ekonomi, makin tinggi = makin rentan)
- Intensitas Ekspor: ${province.export_intensity.toFixed(2)} (rasio ekspor/PDRB)
- Pangsa Migas: ${(province.migas_share * 100).toFixed(1)}%
- β Minyak: ${province.beta_oil.toFixed(2)} (sensitivitas inflasi terhadap harga minyak)
- β Kurs: ${province.beta_fx.toFixed(2)} (sensitivitas inflasi terhadap depresiasi Rupiah)
- Resiliensi: ${province.resilience.toFixed(2)} (komposit kemiskinan, Gini, formalitas kerja; negatif = kurang resilien)

## Tugas:
Tulis policy brief dalam Bahasa Indonesia (maks 300 kata) yang mencakup:
1. Ringkasan profil kerentanan provinsi ini
2. Faktor risiko utama berdasarkan data di atas
3. Proyeksi dampak pada skenario ${scenario}
4. 2-3 rekomendasi kebijakan yang actionable dan spesifik untuk pemerintah daerah

Gunakan bahasa formal namun mudah dipahami oleh pembuat kebijakan daerah.`;

  try {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: `Foundry API error: ${err}` });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'No response generated.';
    return res.status(200).json({ brief: content });
  } catch (err) {
    return res.status(500).json({ error: `Request failed: ${err.message}` });
  }
}
