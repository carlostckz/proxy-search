const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send(`
    <h1>Proxy de Pesquisa</h1>
    <form method="GET" action="/search">
      <input name="q" placeholder="Digite sua pesquisa" style="width:300px" required/>
      <button>Buscar</button>
    </form>
  `);
});

app.get('/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.redirect('/');

  try {
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    let resultsHtml = `<h1>Resultados da busca para: "${q}"</h1><ul>`;
    $('.result__a').each((i, el) => {
      let href = $(el).attr('href');
      let title = $(el).text();

      const proxiedUrl = `/proxy?url=${encodeURIComponent(href)}`;

      resultsHtml += `<li><a href="${proxiedUrl}">${title}</a></li>`;
    });
    resultsHtml += '</ul><a href="/">Nova busca</a>';

    res.send(resultsHtml);
  } catch (err) {
    res.status(500).send('Erro na busca: ' + err.message);
  }
});

app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('URL não informada.');

  try {
    const { data } = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    const $ = cheerio.load(data);

    $('a').each((_, el) => {
      let href = $(el).attr('href');
      if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
        href = new URL(href, targetUrl).toString();
        $(el).attr('href', `/proxy?url=${encodeURIComponent(href)}`);
      }
    });

    $('img').each((_, el) => {
      let src = $(el).attr('src');
      if (src) {
        src = new URL(src, targetUrl).toString();
        $(el).attr('src', `/proxy/image?url=${encodeURIComponent(src)}`);
      }
    });

    res.send($.html());
  } catch (err) {
    res.status(500).send('Erro ao carregar página: ' + err.message);
  }
});

app.get('/proxy/image', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).send('URL da imagem não informada.');

  try {
    const response = await axios.get(imageUrl, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    res.status(response.status);

    Object.entries(response.headers).forEach(([key, value]) => {
      if (key.toLowerCase() === 'content-encoding') return;
      res.setHeader(key, value);
    });

    response.data.pipe(res);
  } catch (err) {
    console.error('Erro ao carregar imagem:', err.message);
    res.status(500).send('Erro ao carregar imagem');
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Proxy rodando na porta ${PORT}`));
