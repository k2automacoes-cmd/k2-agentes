// K2 FIRST — Servidor Webhook (WhatsApp + GHL + Marketing + Prospecting)
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const { K2Agent } = require('./index');
const { MarketingAgent } = require('./marketing');
const { ProspectingAgent } = require('./prospecting');

const app = express();
app.use(express.json());

const agent = new K2Agent(process.env.STAND_NAME || 'K2 FIRST');
const marketingAgent = new MarketingAgent();
const prospectingAgent = new ProspectingAgent();

// Webhook WhatsApp Business API (Meta)
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    const body = req.body;

    // Verificação Meta
    if (body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    const messages = body.entry?.[0]?.changes?.[0]?.value?.messages;
    if (!messages?.length) return res.sendStatus(200);

    for (const msg of messages) {
      if (msg.type !== 'text') continue;

      const userId = msg.from;
      const text = msg.text.body;

      console.log(`📩 [${userId}] ${text}`);
      const reply = await agent.respond(userId, text);
      console.log(`📤 Agente: ${reply}`);

      // Aqui envia a resposta via WhatsApp API
      await sendWhatsApp(userId, reply);
    }

    res.sendStatus(200);
  } catch (e) {
    console.error('Webhook error:', e);
    res.sendStatus(500);
  }
});

// Verificação do webhook Meta
app.get('/webhook/whatsapp', (req, res) => {
  const verify_token = process.env.WHATSAPP_VERIFY_TOKEN || 'k2first_token';
  if (req.query['hub.verify_token'] === verify_token) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

// Webhook GHL (eventos do pipeline)
app.post('/webhook/ghl', async (req, res) => {
  const event = req.body;
  console.log('GHL Event:', event.type, event.contactId);
  // Lógica de follow-up automático baseada em eventos do GHL
  res.sendStatus(200);
});

// Endpoint de teste manual
app.post('/chat', async (req, res) => {
  const { userId = 'web-user', message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  const reply = await agent.respond(userId, message);
  res.json({ reply });
});

// Marketing — gera posts, anúncios, calendários de conteúdo
app.post('/marketing', async (req, res) => {
  const { userId = 'marketing-user', message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  try {
    const reply = await marketingAgent.respond(userId, message);
    res.json({ reply });
  } catch (e) {
    console.error('Marketing error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Prospecting — qualifica stands, gera outreach, prepara pitch
app.post('/prospecting', async (req, res) => {
  const { userId = 'prospecting-user', message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  try {
    const reply = await prospectingAgent.respond(userId, message);
    res.json({ reply });
  } catch (e) {
    console.error('Prospecting error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Status
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    agent: process.env.STAND_NAME || 'K2 FIRST',
    endpoints: ['/chat', '/marketing', '/prospecting', '/webhook/whatsapp'],
    timestamp: new Date().toISOString()
  });
});

async function sendWhatsApp(to, text) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    console.log('WhatsApp não configurado — resposta não enviada');
    return;
  }
  await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text }
    })
  });
}

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🤖 K2 FIRST Agente online — porta ${PORT}`);
  console.log(`   Status:      GET  http://localhost:${PORT}/status`);
  console.log(`   Atendimento: POST http://localhost:${PORT}/chat`);
  console.log(`   Marketing:   POST http://localhost:${PORT}/marketing`);
  console.log(`   Prospecting: POST http://localhost:${PORT}/prospecting`);
});

// ========== ENDPOINT GOS (Agentes Estratégia + Demo) ==========
const { execSync } = require('child_process');
const fs = require('fs');

app.post('/gos', (req, res) => {
  const { userId = 'user', message, agent } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  const tmpFile = `/tmp/gos_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`;
  const cleanEnv = {
    HOME: '/home/openclaw',
    PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    TERM: 'xterm',
    LANG: 'en_US.UTF-8'
  };

  try {
    fs.writeFileSync(tmpFile, message);
    const reply = execSync(
      `runuser -u openclaw -- bash -c "claude -p < ${tmpFile}"`,
      { timeout: 120000, encoding: 'utf8', env: cleanEnv }
    ).trim();
    res.json({ reply });
  } catch (err) {
    console.error('Erro /gos:', err.message);
    res.status(500).json({ error: 'Erro ao processar', reply: 'Erro no servidor. Tenta novamente.' });
  } finally {
    try { fs.unlinkSync(tmpFile); } catch(e) {}
  }
});
