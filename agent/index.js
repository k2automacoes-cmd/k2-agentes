// K2 FIRST — Agente de Atendimento & Vendas
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const { toolDefinitions, executeTool } = require('./tools');

const SYSTEM_PROMPT = `És o agente de atendimento e vendas de um stand automóvel.
O teu nome é [NOME_AGENTE]. Respondes sempre em português europeu, de forma profissional mas próxima.

Responsabilidades:
- Responder a perguntas sobre viaturas disponíveis no stock
- Qualificar o interesse do cliente (o que procura, orçamento, urgência)
- Registar os dados do cliente no sistema quando os partilharem
- Agendar visitas ao stand
- Calcular e explicar o score de valor de uma viatura quando solicitado

Regras:
- Nunca inventas informação sobre viaturas
- Se não souberes responder, dizes que alguém da equipa entrará em contacto
- Recolhes sempre o nome e telemóvel antes de agendar
- Quando o cliente partilha dados pessoais, crias o lead no CRM imediatamente
- Respostas curtas e directas — isto é WhatsApp, não email

Nunca menciones que és um agente IA a menos que o cliente pergunte directamente.`;

class K2Agent {
  constructor(standName = 'Stand') {
    this.standName = standName;
    this.systemPrompt = SYSTEM_PROMPT.replace('[NOME_AGENTE]', `Agente ${standName}`);
    this.conversations = new Map();
  }

  async respond(userId, userMessage) {
    if (!this.conversations.has(userId)) {
      this.conversations.set(userId, []);
    }
    const history = this.conversations.get(userId);
    history.push({ role: 'user', content: userMessage });

    const prompt = this.systemPrompt + '\n\n' +
      history.map(m => `${m.role === 'user' ? 'Cliente' : 'Agente'}: ${m.content}`).join('\n') +
      '\nAgente:';

    const tmpFile = `/tmp/agent_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`;
    try {
      fs.writeFileSync(tmpFile, prompt);
      const cleanEnv = { HOME: '/home/openclaw', PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', TERM: 'xterm', LANG: 'en_US.UTF-8' };
      const reply = execSync(`runuser -u openclaw -- bash -c "claude -p < ${tmpFile}"`, {
        timeout: 60000,
        encoding: 'utf8',
        env: cleanEnv
      }).trim();

      history.push({ role: 'assistant', content: reply });
      if (history.length > 20) {
        this.conversations.set(userId, history.slice(-20));
      }
      return reply;
    } catch (err) {
      console.error('Erro claude-cli:', err.message);
      return 'Desculpe, ocorreu um erro. Tente novamente.';
    } finally {
      try { fs.unlinkSync(tmpFile); } catch(e) {}
    }
  }

  clearHistory(userId) {
    this.conversations.delete(userId);
  }
}

module.exports = { K2Agent };
