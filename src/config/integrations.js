import 'dotenv/config';

export default {
  // EFI (Gerencianet) - Credenciais globais do sistema
  efi: {
    client_id: process.env.EFI_CLIENT_ID,
    client_secret: process.env.EFI_CLIENT_SECRET,
    certificate: process.env.EFI_CERTIFICATE_PATH,
    pix_key: process.env.EFI_PIX_KEY,
    sandbox: process.env.EFI_SANDBOX === 'true',
  },
  
  // Z-API (WhatsApp) - Credenciais globais do sistema
  zapi: {
    instance: process.env.ZAPI_INSTANCE,
    token: process.env.ZAPI_TOKEN,
    client_token: process.env.ZAPI_CLIENT_TOKEN,
  },
  
  // Configurações de notificação
  notifications: {
    whatsapp_enabled: process.env.NOTIFICATIONS_WHATSAPP_ENABLED === 'true',
    email_enabled: process.env.NOTIFICATIONS_EMAIL_ENABLED !== 'false', // true por padrão
    dias_aviso_vencimento: process.env.NOTIFICATIONS_DIAS_AVISO
      ? process.env.NOTIFICATIONS_DIAS_AVISO.split(',').map(d => parseInt(d.trim()))
      : [7, 3, 1],
  },
};
