import mongoose from 'mongoose';

const TenantSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
    },
    cnpj: {
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
    database: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Tenant', TenantSchema);
