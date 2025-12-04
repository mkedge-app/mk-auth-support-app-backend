import mongoose from 'mongoose';

const PlanSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    descricao: {
      type: String,
      required: true,
    },
    valor: {
      type: Number,
      required: true,
    },
    limite_clientes: {
      type: Number,
      default: null, // null = ilimitado
    },
    recorrente: {
      type: Boolean,
      default: true,
    },
    periodo: {
      type: String,
      enum: ['mensal', 'trimestral', 'semestral', 'anual', 'vitalicio'],
      default: 'mensal',
    },
    recursos: [
      {
        type: String,
      }
    ],
    ativo: {
      type: Boolean,
      default: true,
    },
    destaque: {
      type: Boolean,
      default: false,
    },
    ordem: {
      type: Number,
      default: 0,
    },
    cor: {
      type: String,
      default: '#6366f1', // primary color
    },
    dias_trial: {
      type: Number,
      default: 7,
    },
  },
  {
    timestamps: true,
  }
);

// Índices
PlanSchema.index({ slug: 1 });
PlanSchema.index({ ativo: 1, ordem: 1 });

export default mongoose.model('Plan', PlanSchema);
