import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema(
    {
        cnpj: {
            type: String,
            required: true,
        },
        vencimentoOriginal: {
            type: Date,
            required: true,
        },
        valorPlano: {
            type: Number,
            required: true,
        },
        dataPagamento: {
            type: Date,
            required: true,
        },
        valorPago: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model('Payment', PaymentSchema);
