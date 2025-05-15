const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

app.get('/', async (req, res) => {
  const targetUrl = 'https://now.gg';
  try {
    const { data } = await axios.get(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const $ = cheerio.load(data);
    const baseUrl = new URL(targetUrl).origin;

    // Remover scripts de redirecionamento automático
    $('meta[http-equiv="refresh"]').remove();
    $('script').each((_, el) => {
      const content = $(el).html();
      if (content && /location\.href|window\.location|document\.location/.test(content)) {
        $(el).remove();
      }
    });

    // Reescrever links
    $('a').each((_, el) => {
      let href = $(el).attr('href');
      if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
        try {
          href = new URL(href, baseUrl).toString();
          $(el).attr('href', `/proxy?url=${encodeURIComponent(href)}`);
          $(el).removeAttr('target');
        } catch {
          $(el).removeAttr('href');
        }
      }
    });

    // Reescrever imagens
    $('img').each((_, el) => {
      let src = $(el).attr('src');
      if (src) {
        try {
          src = new URL(src, baseUrl).toString();
          $(el).attr('src', `/proxy/image?url=${encodeURIComponent(src)}`);
        } catch {
          $(el).removeAttr('src');
        }
      }
    });

    res.send($.html());
  } catch (err) {
    res.status(500).send('Erro ao carregar now.gg: ' + err.message);
  }
});

app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('URL inválida');

  try {
    const { data } = await axios.get(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const $ = cheerio.load(data);
    const baseUrl = new URL(targetUrl).origin;

    $('meta[http-equiv="refresh"]').remove();
    $('script').each((_, el) => {
      const content = $(el).html();
      if (content && /location\.href|window\.location/.test(content)) {
        $(el).remove();
      }
    });

    $('a').each((_, el) => {
      let href = $(el).attr('href');
      if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
        try {
          href = new URL(href, baseUrl).toString();
          $(el).attr('href', `/proxy?url=${encodeURIComponent(href)}`);
          $(el).removeAttr('target');
        } catch {
          $(el).removeAttr('href');
        }
      }
    });

    $('img').each((_, el) => {
      let src = $(el).attr('src');
      if (src) {
        try {
          src = new URL(src, baseUrl).toString();
          $(el).attr('src', `/proxy/image?url=${encodeURIComponent(src)}`);
        } catch {
          $(el).removeAttr('src');
        }
      }
    });

    res.send($.html());
  } catch (err) {
    res.status(500).send('Erro ao carregar página: ' + err.message);
  }
});

app.get('/proxy/image', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).send('URL da imagem inválida.');

  try {
    const response = await axios.get(imageUrl, {
      responseType: 'stream',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    res.status(response.status);
    for (const [key, value] of Object.entries(response.headers)) {
      if (key.toLowerCase() !== 'content-encoding') {
        res.setHeader(key, value);
      }
    }

    response.data.pipe(res);
  } catch (err) {
    res.status(500).send('Erro ao carregar imagem: ' + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Proxy direto para now.gg: http://localhost:${PORT}`);
});
