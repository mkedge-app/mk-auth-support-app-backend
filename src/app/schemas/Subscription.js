import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    status: {
      type: String,
      enum: ['trial', 'active', 'suspended', 'cancelled', 'overdue'],
      default: 'trial',
    },
    plano: {
      type: String,
      default: 'mensal',
    },
    valor: {
      type: Number,
      required: true,
    },
    dia_vencimento: {
      type: Number,
      required: true,
    },
    proximo_vencimento: {
      type: Date,
      required: true,
    },
    data_inicio: {
      type: Date,
      default: Date.now,
    },
    data_fim: {
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
    notas: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Subscription', SubscriptionSchema);
