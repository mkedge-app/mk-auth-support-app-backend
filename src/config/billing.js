export default {
  // Configurações da aplicação
  app: {
    url: process.env.APP_URL || 'http://localhost:3333',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  // Configurações EFI (Gerencianet)
  efi: {
    // Credenciais globais (podem ser sobrescritas por tenant)
    clientId: process.env.EFI_CLIENT_ID,
    clientSecret: process.env.EFI_CLIENT_SECRET,
    certificate: process.env.EFI_CERTIFICATE_PATH,
    sandbox: process.env.EFI_SANDBOX === 'true',
    
    // Chave Pix da conta
    pixKey: process.env.EFI_PIX_KEY,
    
    // URLs de webhook
    webhookUrl: {
      pix: `${process.env.APP_URL}/webhook/efi/pix`,
      boleto: `${process.env.APP_URL}/webhook/efi/boleto`,
    },
  },

  // Configurações Z-API (WhatsApp)
  zapi: {
    // Credenciais globais (podem ser sobrescritas por tenant)
    instance: process.env.ZAPI_INSTANCE,
    token: process.env.ZAPI_TOKEN,
    clientToken: process.env.ZAPI_CLIENT_TOKEN,
    
    // URL de webhook
    webhookUrl: `${process.env.APP_URL}/webhook/zapi`,
  },

  // Configurações de cobrança
  billing: {
    // Planos disponíveis
    plans: {
      mensal: {
        name: 'Plano Mensal',
        value: 100.00,
        interval: 'monthly',
        trialDays: 7,
      },
      anual: {
        name: 'Plano Anual',
        value: 1000.00,
        interval: 'yearly',
        trialDays: 15,
      },
    },

    // Configurações de vencimento
    overdue: {
      gracePeriodDays: 3, // Dias de tolerância antes de suspender
      suspendAfterDays: 7, // Suspende após X dias
      cancelAfterDays: 30, // Cancela após X dias
    },

    // Dias para enviar lembretes
    reminderDays: [7, 3, 1],

    // Configurações de multa e juros
    fees: {
      latePaymentFee: 2, // Multa de 2%
      dailyInterest: 0.033, // Juros de 1% ao mês (0.033% ao dia)
    },
  },

  // Configurações de notificações
  notifications: {
    email: {
      enabled: process.env.EMAIL_ENABLED === 'true',
      from: process.env.EMAIL_FROM || 'noreply@mkedge.com.br',
      fromName: process.env.EMAIL_FROM_NAME || 'MK-Edge',
    },
    whatsapp: {
      enabled: process.env.WHATSAPP_ENABLED === 'true',
      defaultPhone: process.env.WHATSAPP_DEFAULT_PHONE,
    },
  },

  // Job de cobrança
  billingJob: {
    enabled: process.env.BILLING_JOB_ENABLED !== 'false',
    schedule: process.env.BILLING_JOB_SCHEDULE || '0 8 * * *', // Diariamente às 8h
  },
};
