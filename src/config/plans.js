// Planos de Assinatura MK-Edge

export const PLANS = {
  BASICO: {
    id: 'basico',
    nome: 'Plano Básico',
    descricao: 'Até 1000 clientes ativos',
    valor: 150.00,
    limite_clientes: 1000,
    recorrente: true,
    periodo: 'mensal',
    recursos: [
      'Até 1000 clientes ativos',
      'Dashboard completo',
      'Gestão de tickets',
      'Notificações WhatsApp',
      'Pagamentos via PIX',
      'Suporte via chat',
    ]
  },
  
  PREMIUM: {
    id: 'premium',
    nome: 'Plano Premium',
    descricao: 'Acima de 1000 clientes ativos',
    valor: 200.00,
    limite_clientes: null, // ilimitado
    recorrente: true,
    periodo: 'mensal',
    recursos: [
      'Clientes ilimitados',
      'Dashboard completo',
      'Gestão de tickets',
      'Notificações WhatsApp',
      'Pagamentos via PIX e Boleto',
      'API completa',
      'Suporte prioritário',
      'Relatórios avançados',
    ]
  },
  
  VITALICIO: {
    id: 'vitalicio',
    nome: 'Plano Vitalício',
    descricao: 'Pagamento único - Acesso perpétuo',
    valor: 1800.00,
    limite_clientes: null, // ilimitado
    recorrente: false,
    periodo: 'vitalicio',
    recursos: [
      'Clientes ilimitados',
      'Dashboard completo',
      'Gestão de tickets',
      'Notificações WhatsApp',
      'Pagamentos via PIX e Boleto',
      'API completa',
      'Suporte vitalício',
      'Todas as atualizações futuras',
      'Prioridade máxima',
      'Sem mensalidades',
    ]
  }
};

export const getPlanById = (planId) => {
  const plan = Object.values(PLANS).find(p => p.id === planId);
  return plan || PLANS.BASICO;
};

export const getPlanByValue = (valor) => {
  if (valor >= 1800) return PLANS.VITALICIO;
  if (valor >= 200) return PLANS.PREMIUM;
  return PLANS.BASICO;
};

export const validateClientLimit = (planId, activeClients) => {
  const plan = getPlanById(planId);
  
  if (!plan.limite_clientes) return true; // ilimitado
  
  return activeClients <= plan.limite_clientes;
};

export default PLANS;
