const { execSync } = require('child_process');
const fs = require('fs');

// K2 FIRST — Agente de Prospecção


const SYSTEM_PROMPT = `És o agente de prospecção da K2 FIRST.

Objetivo: identificar stands automóvel em Portugal que são candidatos ideais para a infraestrutura K2 FIRST.

Critérios de qualificação:
- Stand com 5+ viaturas em stock
- Sem sistema de atendimento automático (ou sistema fraco)
- Presença online fraca ou inexistente
- Mercado: Portugal, preferência por Lisboa, Porto, Setúbal, Braga

Processo de qualificação:
1. Pesquisar stand por nome/localização
2. Verificar presença online (website, redes sociais, reviews)
3. Estimar volume de negócio
4. Classificar como Hot/Warm/Low/Skip
5. Identificar dor principal e argumento de entrada

Score de prioridade:
- HOT: sem sistema automático, tem budget, dono aberto a tecnologia
- WARM: tem sistema básico mas fraco, pode ser melhorado
- LOW: tem sistema razoável, difícil de vender agora
- SKIP: concessionário grande (já tem IT) ou stand muito pequeno

Quando apresentares leads, inclui sempre: nome, localização, score, dor principal, primeiro argumento.`;

const toolDefinitions = [
  {
    name: 'qualify_lead',
    description: 'Qualifica um stand automóvel como potencial cliente da K2 FIRST.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome do stand' },
        location: { type: 'string', description: 'Localização (cidade/distrito)' },
        website: { type: 'string', description: 'Website se existir' },
        social_media: { type: 'string', description: 'Redes sociais se existirem' },
        estimated_stock: { type: 'number', description: 'Número estimado de viaturas' },
        observations: { type: 'string', description: 'Observações adicionais' }
      },
      required: ['name', 'location']
    }
  },
  {
    name: 'generate_outreach',
    description: 'Gera mensagem de primeiro contacto personalizada para um stand.',
    input_schema: {
      type: 'object',
      properties: {
        stand_name: { type: 'string', description: 'Nome do stand' },
        channel: { type: 'string', enum: ['whatsapp', 'email', 'linkedin', 'presencial'], description: 'Canal de contacto' },
        pain_point: { type: 'string', description: 'Dor principal identificada' },
        score: { type: 'string', enum: ['HOT', 'WARM', 'LOW'], description: 'Score do lead' }
      },
      required: ['stand_name', 'channel', 'pain_point']
    }
  },
  {
    name: 'create_prospect_list',
    description: 'Cria uma lista estruturada de prospects por região.',
    input_schema: {
      type: 'object',
      properties: {
        region: { type: 'string', description: 'Região de Portugal (ex: Lisboa, Porto, Setúbal)' },
        min_score: { type: 'string', enum: ['HOT', 'WARM', 'LOW'], description: 'Score mínimo para incluir' },
        limit: { type: 'number', description: 'Número máximo de prospects' }
      },
      required: ['region']
    }
  },
  {
    name: 'prepare_pitch',
    description: 'Prepara argumentos de venda personalizados para um stand específico.',
    input_schema: {
      type: 'object',
      properties: {
        stand_name: { type: 'string' },
        identified_problems: { type: 'string', description: 'Problemas identificados no stand' },
        meeting_type: { type: 'string', enum: ['primeira_reuniao', 'demo', 'proposta'], description: 'Tipo de reunião' }
      },
      required: ['stand_name', 'identified_problems', 'meeting_type']
    }
  }
];

async function executeTool(name, input) {
  switch (name) {
    case 'qualify_lead': return qualifyLead(input);
    case 'generate_outreach': return generateOutreach(input);
    case 'create_prospect_list': return createProspectList(input);
    case 'prepare_pitch': return preparePitch(input);
    default: return { error: `Ferramenta desconhecida: ${name}` };
  }
}

function qualifyLead({ name, location, website, social_media, estimated_stock, observations }) {
  let score = 'WARM';
  let pain = 'Atendimento lento e leads perdidos';
  let argument = 'Mostrar quanto custa cada lead perdido por falta de resposta rápida';

  if (!website && !social_media) {
    score = 'HOT';
    pain = 'Sem presença online — leads chegam só por referência';
    argument = 'Demonstrar quantos leads chegam via WhatsApp sem resposta automática';
  } else if (website && social_media) {
    score = 'LOW';
    pain = 'Tem presença mas sem automação — trabalho manual excessivo';
    argument = 'Calcular horas gastas em follow-up manual vs sistema automático';
  }

  if (estimated_stock && estimated_stock > 20) {
    score = score === 'LOW' ? 'WARM' : score;
  }

  return {
    stand: name,
    location,
    score,
    pain_point: pain,
    entry_argument: argument,
    has_website: !!website,
    has_social: !!social_media,
    estimated_monthly_leads: estimated_stock ? Math.round(estimated_stock * 0.3) : 15,
    recommended_module: score === 'HOT' ? 'Atendimento + Marketing' : 'Atendimento + Score'
  };
}

function generateOutreach({ stand_name, channel, pain_point, score }) {
  const templates = {
    whatsapp: {
      HOT: `Bom dia!\n\nVi o vosso stand e fiquei curioso — como é que gerem os leads que chegam por WhatsApp?\n\nTemos um sistema que responde automaticamente em segundos e regista tudo no CRM. Nenhum lead se perde.\n\nValeria a pena 15 minutos para mostrar? — Ezequias, K2 FIRST`,
      WARM: `Bom dia!\n\nTrabalho com stands automóvel a implementar sistemas de atendimento automático.\n\nTemos clientes que triplicaram a taxa de resposta a leads em 30 dias.\n\nPosso mostrar como funciona? — Ezequias, K2 FIRST`,
      LOW: `Bom dia!\n\nEzequias da K2 FIRST. Implementamos infraestrutura IA para stands.\n\nSe alguma vez quiserem explorar automação de processos, estamos disponíveis. — K2 FIRST`
    },
    email: {
      HOT: `Assunto: ${stand_name} — leads que chegam às 2h da manhã\n\nBom dia,\n\nUm lead que não recebe resposta em 5 minutos tem 80% menos probabilidade de converter.\n\nDesenvolvemos um agente de atendimento que responde instantaneamente, 24/7, e regista tudo automaticamente.\n\nPosso mostrar em 15 minutos. Quando é conveniente?\n\nEzequias Silva\nK2 FIRST`
    }
  };

  const msg = templates[channel]?.[score] || templates[channel]?.WARM || templates.whatsapp.WARM;
  return { channel, stand_name, score, message: msg, follow_up_days: score === 'HOT' ? 2 : 5 };
}

function createProspectList({ region, min_score, limit = 10 }) {
  const sample = [
    { name: 'AutoStand Lisboa', location: region, score: 'HOT', pain: 'Sem website, só WhatsApp manual', stock_est: 25 },
    { name: 'Carros & Mais', location: region, score: 'HOT', pain: 'Instagram activo mas sem atendimento auto', stock_est: 15 },
    { name: 'Stand do Sul', location: region, score: 'WARM', pain: 'Site antigo, sem CRM', stock_est: 30 },
    { name: 'Automóveis Premium', location: region, score: 'WARM', pain: 'Equipa pequena, muito trabalho manual', stock_est: 20 },
    { name: 'Viaturas Express', location: region, score: 'LOW', pain: 'Tem sistema mas desactualizado', stock_est: 45 }
  ];

  const scores = ['HOT', 'WARM', 'LOW'];
  const minIdx = scores.indexOf(min_score || 'WARM');
  const filtered = sample.filter(p => scores.indexOf(p.score) <= minIdx).slice(0, limit);

  return {
    region,
    total_found: filtered.length,
    prospects: filtered,
    note: 'Lista de exemplo — usar GHL Prospector ou pesquisa manual para dados reais'
  };
}

function preparePitch({ stand_name, identified_problems, meeting_type }) {
  return {
    stand: stand_name,
    meeting_type,
    opening: `Vim estudar o vosso stand antes de esta reunião. Vi que ${identified_problems}. Isso custa dinheiro todos os dias.`,
    demo_sequence: [
      '1. Mostrar lead a entrar via WhatsApp → resposta em 3 segundos',
      '2. Lead a aparecer automaticamente no CRM',
      '3. Dashboard com margens calculadas em tempo real',
      '4. Score de depreciação de uma viatura do stock deles'
    ],
    closing: `Posso ter isto a funcionar para o ${stand_name} em 48 horas. Qual é o próximo passo?`,
    objection_handling: {
      'Já temos um sistema': 'Que sistema usam? Quantos leads perderam esta semana sem resposta?',
      'É caro': 'Quanto custa um lead perdido? Com ${stand_name} a vender X viaturas/mês, um lead perdido vale €2-5k.',
      'Preciso de pensar': 'O que faria mudar de ideia? Posso mostrar um case de um stand similar em 48h.'
    }
  };
}

class ProspectingAgent {
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

    const tmpFile = `/tmp/pro_${Date.now()}.txt`;
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
      console.error('Erro claude-cli prospecting:', err.message);
      return 'Erro ao processar pedido.';
    } finally {
      try { fs.unlinkSync(tmpFile); } catch(e) {}
    }
  }
}

module.exports = { ProspectingAgent };

// TESTES AUTOMÁTICOS DESACTIVADOS
