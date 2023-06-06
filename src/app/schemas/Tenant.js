import mongoose from 'mongoose';
import { resolveDbConnection } from '../middlewares/connectionResolver';

const TenantSchema = new mongoose.Schema(
  {
    cnpj: {
      type: String,
      required: true,
    },
    responsavel: {
      type: String,
      required: true,
    },
    contato: {
      type: String,
      required: true,
    },
    provedor: {
      nome: {
        type: String,
        required: true,
      }
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
      ativa: {
        type: Boolean,
        required: false,
      },
      valor: {
        type: Number,
        required: true,
      },
      data_vencimento: {
        type: Date,
        required: true,
      },
      dia_vencimento: {
        type: String,
        required: true,
      },
    }
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Tenant', TenantSchema);
