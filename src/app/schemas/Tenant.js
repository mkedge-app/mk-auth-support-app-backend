import mongoose from 'mongoose';

const TenantSchema = new mongoose.Schema(
  {
    cnpj: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: false,
    },
    senha_hash: {
      type: String,
      required: false,
    },
    responsavel: {
      type: String,
      required: true,
    },
    contato: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['ativo', 'inativo', 'suspenso', 'bloqueado'],
      default: 'inativo',
    },
    cortesia: {
      type: Boolean,
      default: false,
    },
    provedor: {
      nome: {
        type: String,
        required: true,
      },
      sis_provedor: {
        type: String,
        required: false,
      }
    },
    google_maps_api_key: {
      type: String,
      required: false,
    },
    database: {
      name: {
        type: String,
        required: true,
      },
      dialect: {
        type: String,
        required: true,
      },
      host: {
        type: String,
        required: true,
      },
      username: {
        type: String,
        required: true,
      },
      password: {
        type: String,
        required: true,
      },
    },
    assinatura: {
      plano_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan',
        required: false,
      },
      status: {
        type: String,
        enum: ['trial', 'active', 'suspended', 'cancelled', 'overdue', 'ativa', 'inativa', 'suspensa', 'cancelada', 'vencida', 'trial_expirado'],
        default: 'trial',
      },
      ativa: {
        type: Boolean,
        default: false,
      },
      plano: {
        type: String,
        enum: ['basico', 'premium', 'vitalicio'],
        default: 'basico',
      },
      plano_nome: {
        type: String,
        default: 'Plano Básico',
      },
      valor: {
        type: Number,
        required: true,
      },
      limite_clientes: {
        type: Number,
        default: 1000,
      },
      recorrente: {
        type: Boolean,
        default: true,
      },
      data_vencimento: {
        type: Date,
        required: true,
      },
      dia_vencimento: {
        type: String,
        required: true,
      },
      proximo_pagamento: {
        type: Date,
        required: false,
      },
      ultimo_pagamento: {
        type: Date,
        required: false,
      },
      trial_ends_at: {
        type: Date,
        required: false,
      },
      metodo_pagamento: {
        type: String,
        enum: ['pix', 'boleto', 'cartao'],
        required: false,
      },
      gateway_customer_id: {
        type: String,
        required: false,
      },
      gateway_subscription_id: {
        type: String,
        required: false,
      },
      tentativas_falhas: {
        type: Number,
        default: 0,
      },
    },
    // 🆕 Credenciais da API MK-AUTH
    api_mka_client: {
      type: String,
      required: false,
    },
    api_mka_secret: {
      type: String,
      required: false,
    },
    // 🆕 Webhook MK-AUTH
    webhook_mka_servidor: {
      type: String,
      required: false,
    },
    webhook_mka_secret: {
      type: String,
      required: false,
    },
    // 🆕 Credenciais EFI (Gerencianet)
    efi_client_id: {
      type: String,
      required: false,
    },
    efi_client_secret: {
      type: String,
      required: false,
    },
    efi_certificate: {
      type: String,
      required: false,
    },
    efi_pix_key: {
      type: String,
      required: false,
    },
    efi_sandbox: {
      type: Boolean,
      default: true,
    },
    // 🆕 Credenciais Z-API (WhatsApp)
    zapi_instance: {
      type: String,
      required: false,
    },
    zapi_token: {
      type: String,
      required: false,
    },
    zapi_client_token: {
      type: String,
      required: false,
    },
    // 🆕 Configurações de notificação
    notificacoes: {
      whatsapp_enabled: {
        type: Boolean,
        default: false,
      },
      email_enabled: {
        type: Boolean,
        default: true,
      },
      dias_aviso_vencimento: {
        type: [Number],
        default: [7, 3, 1],
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Tenant', TenantSchema);
