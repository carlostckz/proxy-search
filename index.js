const express = require('express');
const puppeteer = require('puppeteer');

const app = express();

app.get('/', async (req, res) => {
  const targetUrl = 'https://now.gg';

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0');
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    const html = await page.content();
    res.send(html);
  } catch (err) {
    res.status(500).send('Erro ao carregar o site: ' + err.message);
  } finally {
    await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Proxy com navegador rodando em http://localhost:${PORT}`);
});
