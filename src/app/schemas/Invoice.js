import mongoose from 'mongoose';

const InvoiceSchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    subscription_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      required: false,
    },
    numero_fatura: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue', 'cancelled', 'refunded'],
      default: 'pending',
    },
    valor: {
      type: Number,
      required: true,
    },
    valor_pago: {
      type: Number,
      required: false,
    },
    desconto: {
      type: Number,
      default: 0,
    },
    multa: {
      type: Number,
      default: 0,
    },
    juros: {
      type: Number,
      default: 0,
    },
    data_vencimento: {
      type: Date,
      required: true,
    },
    data_pagamento: {
      type: Date,
      required: false,
    },
    metodo_pagamento: {
      type: String,
      enum: ['pix', 'boleto', 'cartao', 'manual'],
      required: false,
    },
    // Dados EFI
    efi_charge_id: {
      type: String,
      required: false,
    },
    efi_txid: {
      type: String,
      required: false,
    },
    efi_pix_qrcode: {
      type: String,
      required: false,
    },
    efi_pix_qrcode_image: {
      type: String,
      required: false,
    },
    efi_boleto_link: {
      type: String,
      required: false,
    },
    efi_boleto_barcode: {
      type: String,
      required: false,
    },
    // Notificações
    notificacoes_enviadas: [{
      tipo: {
        type: String,
        enum: ['email', 'whatsapp', 'sms'],
      },
      data_envio: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        enum: ['sent', 'failed'],
      },
      mensagem: String,
    }],
    // Histórico
    historico: [{
      data: {
        type: Date,
        default: Date.now,
      },
      evento: String,
      descricao: String,
      dados: mongoose.Schema.Types.Mixed,
    }],
    notas: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para busca rápida
InvoiceSchema.index({ tenant_id: 1, status: 1 });
InvoiceSchema.index({ efi_charge_id: 1 });
InvoiceSchema.index({ efi_txid: 1 });
InvoiceSchema.index({ data_vencimento: 1 });

export default mongoose.model('Invoice', InvoiceSchema);
