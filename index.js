const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

function rewriteLinks($, baseUrl) {
  // Reescrever scripts
  $('script[src]').each((_, el) => {
    let src = $(el).attr('src');
    if (src) {
      try {
        src = new URL(src, baseUrl).toString();
        $(el).attr('src', `/proxy/resource?url=${encodeURIComponent(src)}`);
      } catch {
        $(el).removeAttr('src');
      }
    }
  });

  // Reescrever folhas de estilo
  $('link[rel="stylesheet"]').each((_, el) => {
    let href = $(el).attr('href');
    if (href) {
      try {
        href = new URL(href, baseUrl).toString();
        $(el).attr('href', `/proxy/resource?url=${encodeURIComponent(href)}`);
      } catch {
        $(el).removeAttr('href');
      }
    }
  });

  // Reescrever fontes, imagens e ícones
  $('img, source, video, audio, iframe').each((_, el) => {
    let src = $(el).attr('src');
    if (src) {
      try {
        src = new URL(src, baseUrl).toString();
        $(el).attr('src', `/proxy/resource?url=${encodeURIComponent(src)}`);
      } catch {
        $(el).removeAttr('src');
      }
    }
  });

  $('link[rel="icon"], link[rel="shortcut icon"]').each((_, el) => {
    let href = $(el).attr('href');
    if (href) {
      try {
        href = new URL(href, baseUrl).toString();
        $(el).attr('href', `/proxy/resource?url=${encodeURIComponent(href)}`);
      } catch {
        $(el).removeAttr('href');
      }
    }
  });

  // Reescrever links de navegação
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
}

app.get('/', async (req, res) => {
  const targetUrl = 'https://now.gg';
  try {
    const { data } = await axios.get(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const $ = cheerio.load(data);
    const baseUrl = new URL(targetUrl).origin;

    // Remover redirecionamentos automáticos
    $('meta[http-equiv="refresh"]').remove();
    $('script').each((_, el) => {
      const content = $(el).html();
      if (content && /location\.href|window\.location|document\.location/.test(content)) {
        $(el).remove();
      }
    });

    rewriteLinks($, baseUrl);
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

    rewriteLinks($, baseUrl);
    res.send($.html());
  } catch (err) {
    res.status(500).send('Erro ao carregar página: ' + err.message);
  }
});

// ROTA NOVA: Serve recursos estáticos (CSS, JS, fontes, etc.)
app.get('/proxy/resource', async (req, res) => {
  const fileUrl = req.query.url;
  if (!fileUrl) return res.status(400).send('URL do recurso não informada.');

  try {
    const response = await axios.get(fileUrl, {
      responseType: 'stream',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    res.status(response.status);
    for (const [key, value] of Object.entries(response.headers)) {
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }

    response.data.pipe(res);
  } catch (err) {
    console.error('Erro ao carregar recurso:', fileUrl, err.message);
    res.status(500).send('Erro ao carregar recurso.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Proxy atualizado rodando em http://localhost:${PORT}`);
});
