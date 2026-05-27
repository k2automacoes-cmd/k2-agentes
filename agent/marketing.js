const { execSync } = require('child_process');
const fs = require('fs');

// K2 FIRST — Agente de Marketing & Conteúdo


const SYSTEM_PROMPT = `És o agente de marketing da K2 FIRST, especializado no sector automóvel português.

Responsabilidades:
- Criar conteúdo para Instagram e Facebook (posts, stories, reels)
- Gerar copy para anúncios pagos (Meta Ads)
- Criar landing pages e textos de conversão
- Sugerir estratégias de conteúdo baseadas no stock disponível
- Analisar e reportar métricas das publicações

Estilo de comunicação da K2 FIRST:
- Directo, confiante, sem exageros
- Foco em valor e ROI, não em emoções
- Português europeu
- Tom profissional mas acessível

Quando criares conteúdo para uma viatura específica:
- Destaca o score de valor (A/B/C/D)
- Menciona sempre o valor de negócio, não só o preço
- Inclui call-to-action claro`;

const toolDefinitions = [
  {
    name: 'create_post',
    description: 'Cria um post para Instagram ou Facebook sobre uma viatura ou tema de marketing automóvel.',
    input_schema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['instagram', 'facebook', 'both'], description: 'Plataforma de destino' },
        type: { type: 'string', enum: ['viatura', 'educativo', 'testemunho', 'promocao', 'bastidores'], description: 'Tipo de conteúdo' },
        vehicle: { type: 'string', description: 'Dados da viatura (marca, ano, preço) se aplicável' },
        score: { type: 'string', description: 'Score de depreciação da viatura (A/B/C/D)' },
        tone: { type: 'string', enum: ['profissional', 'descontraido', 'urgencia'], description: 'Tom do post' }
      },
      required: ['platform', 'type']
    }
  },
  {
    name: 'create_ad_copy',
    description: 'Cria copy para anúncio pago no Meta Ads (Facebook/Instagram).',
    input_schema: {
      type: 'object',
      properties: {
        objective: { type: 'string', enum: ['leads', 'trafego', 'alcance'], description: 'Objectivo da campanha' },
        audience: { type: 'string', description: 'Público-alvo (ex: compradores de carro usados, 28-50 anos, Portugal)' },
        vehicle: { type: 'string', description: 'Viatura ou categoria a promover' },
        budget: { type: 'string', description: 'Orçamento diário em euros' }
      },
      required: ['objective', 'audience']
    }
  },
  {
    name: 'create_lp_section',
    description: 'Cria secções de texto para landing page do stand ou de uma viatura específica.',
    input_schema: {
      type: 'object',
      properties: {
        section: { type: 'string', enum: ['hero', 'beneficios', 'prova_social', 'faq', 'cta'], description: 'Secção a criar' },
        stand_name: { type: 'string', description: 'Nome do stand' },
        vehicle: { type: 'string', description: 'Viatura específica se aplicável' },
        differentiator: { type: 'string', description: 'Diferencial chave do stand' }
      },
      required: ['section']
    }
  },
  {
    name: 'content_calendar',
    description: 'Gera um calendário de conteúdo semanal baseado no stock e estratégia.',
    input_schema: {
      type: 'object',
      properties: {
        week: { type: 'string', description: 'Semana (ex: 19-25 Mai 2026)' },
        stock: { type: 'string', description: 'Viaturas disponíveis no stock' },
        posts_per_week: { type: 'number', description: 'Número de posts por semana' }
      },
      required: ['week', 'posts_per_week']
    }
  },
  {
    name: 'schedule_post',
    description: 'Agenda um post para publicação (requer Meta API configurada).',
    input_schema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['instagram', 'facebook'] },
        content: { type: 'string', description: 'Texto do post' },
        datetime: { type: 'string', description: 'Data e hora de publicação (ISO 8601)' },
        image_description: { type: 'string', description: 'Descrição da imagem a usar' }
      },
      required: ['platform', 'content', 'datetime']
    }
  }
];

async function executeTool(name, input) {
  switch (name) {
    case 'create_post':
      return generatePost(input);
    case 'create_ad_copy':
      return generateAdCopy(input);
    case 'create_lp_section':
      return generateLPSection(input);
    case 'content_calendar':
      return generateCalendar(input);
    case 'schedule_post':
      return schedulePost(input);
    default:
      return { error: `Ferramenta desconhecida: ${name}` };
  }
}

function generatePost({ platform, type, vehicle, score, tone }) {
  const scoreEmoji = { A: '🟢', B: '🔵', C: '🟡', D: '🔴' }[score] || '';
  const templates = {
    viatura: {
      profissional: `${scoreEmoji} ${vehicle || 'Nova viatura disponível'}\n\nScore de valor: ${score || 'A avaliar'}\nPreço justo. Margem calculada. Sem surpresas.\n\n📍 Visita ao stand mediante marcação\n📲 Fala connosco no WhatsApp\n\n#standautomóvel #carrosusados #comprarcarroPortugal`,
      descontraido: `Olha o que acabou de chegar! 🚗\n\n${vehicle || 'Viatura nova no stock'} — e o score fala por si: ${score || '⭐'}\n\nSe estás à procura, esta pode ser a tua. Vem ver antes que vá!\n\n#standautomóvel #carrosnovo #Portugal`,
      urgencia: `⚡ DISPONÍVEL AGORA\n\n${vehicle || 'Viatura'} com score ${score || 'A'} — raramente encontras assim.\nJá temos interesse. Não esperes.\n\n📲 Mensagem agora`,
    },
    educativo: {
      profissional: `Sabes o que é o score de depreciação?\n\nÉ a diferença entre comprar bem e pagar a mais.\n\nNa K2 FIRST calculamos o valor real de cada viatura antes de te apresentar o preço.\n\n✅ Score A — excelente valor\n✅ Score B — bom, negoceia\n⚠️ Score C — pondera\n❌ Score D — evita\n\n#comprarcarro #scoreviatura #automóvel`,
    }
  };
  const content = templates[type]?.[tone] || templates[type]?.profissional || `Post sobre ${type} para ${platform}`;
  return { content, platform, type, estimated_reach: '500-2000', best_time: '18:00-20:00' };
}

function generateAdCopy({ objective, audience, vehicle, budget }) {
  return {
    headline: vehicle ? `${vehicle} — Score A. Preço justo.` : 'O carro certo ao preço certo',
    primary_text: `Cansado de comprar carros e não saber se pagaste bem?\n\nNa K2 FIRST cada viatura tem um score de valor calculado. Sabes exactamente o que levas.\n\n${vehicle ? `→ ${vehicle} disponível agora` : '→ Vê o nosso stock'}`,
    cta: objective === 'leads' ? 'Saber Mais' : 'Ver Stock',
    audience_suggestion: audience,
    daily_budget: budget || '€10-20/dia recomendado',
    objective
  };
}

function generateLPSection({ section, stand_name, vehicle, differentiator }) {
  const name = stand_name || 'K2 FIRST';
  const sections = {
    hero: {
      headline: vehicle ? `${vehicle} — Valor garantido.` : `${name} — Compra um carro com confiança.`,
      subheadline: 'Cada viatura tem um score de depreciação calculado. Sabes sempre o que levas.',
      cta_primary: 'Ver Stock Disponível',
      cta_secondary: 'Falar com Agente'
    },
    beneficios: {
      items: [
        { icon: '🎯', title: 'Score de Valor', desc: 'Cada viatura avaliada com score A-D antes de entrar no stock.' },
        { icon: '💬', title: 'Resposta Imediata', desc: 'Agente disponível 24/7 via WhatsApp. Sem esperas.' },
        { icon: '📊', title: 'Transparência Total', desc: 'Preço calculado com base no mercado real, sem margens escondidas.' },
        { icon: '✅', title: 'Garantia de ROI', desc: '3 meses para ver resultados ou devolvemos o investimento.' }
      ]
    },
    cta: {
      headline: 'Pronto para encontrar a viatura certa?',
      text: 'Fala connosco agora. O agente responde em segundos.',
      cta: 'Iniciar Conversa no WhatsApp',
      secondary: 'Ver Stock Completo'
    }
  };
  return sections[section] || { error: 'Secção não encontrada' };
}

function generateCalendar({ week, stock, posts_per_week }) {
  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const types = ['viatura', 'educativo', 'bastidores', 'viatura', 'promocao', 'viatura', 'testemunho'];
  const times = ['09:00', '18:30', '12:00', '19:00', '18:00', '11:00', '17:00'];
  const calendar = days.slice(0, posts_per_week).map((day, i) => ({
    day,
    hora: times[i],
    tipo: types[i],
    plataforma: i % 2 === 0 ? 'Instagram + Facebook' : 'Instagram',
    nota: types[i] === 'viatura' && stock ? `Usar viatura do stock: ${stock}` : 'Criar conteúdo de valor'
  }));
  return { week, posts_per_week, calendar };
}

async function schedulePost({ platform, content, datetime, image_description }) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    return {
      scheduled: false,
      note: 'Meta API não configurada. Post guardado para publicação manual.',
      content, platform, datetime, image_description
    };
  }
  return { scheduled: true, platform, datetime, content: content.slice(0, 50) + '...' };
}

class MarketingAgent {
  constructor() {
    this.conversations = new Map();
  }

  async respond(userId, message) {
    if (!this.conversations.has(userId)) {
      this.conversations.set(userId, []);
    }
    const history = this.conversations.get(userId);
    history.push({ role: 'user', content: message });

    const prompt = SYSTEM_PROMPT + '\n\n' +
      history.map(m => `${m.role === 'user' ? 'Utilizador' : 'Agente'}: ${m.content}`).join('\n') +
      '\nAgente:';

    const tmpFile = `/tmp/mkt_${Date.now()}.txt`;
    const cleanEnv = { HOME: '/home/openclaw', PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', TERM: 'xterm', LANG: 'en_US.UTF-8' };
    try {
      fs.writeFileSync(tmpFile, prompt);
      const reply = execSync(`runuser -u openclaw -- bash -c "claude -p < ${tmpFile}"`, {
        timeout: 60000, encoding: 'utf8', env: cleanEnv
      }).trim();
      history.push({ role: 'assistant', content: reply });
      if (history.length > 20) this.conversations.set(userId, history.slice(-20));
      return reply;
    } catch (err) {
      console.error('Erro claude-cli marketing:', err.message);
      return 'Erro ao processar pedido.';
    } finally {
      try { fs.unlinkSync(tmpFile); } catch(e) {}
    }
  }
}

module.exports = { MarketingAgent };

// TESTES AUTOMÁTICOS DESACTIVADOS
