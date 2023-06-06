import Payment from '../schemas/Payment';
import Tenant from '../schemas/Tenant';

class PaymentController {
    async index(req, res) {
        const { cnpj, valorPago, dataPagamento, proximoPagamento } = req.body;

        const tenant = await Tenant.findOne({ cnpj });
        if (!tenant) {
            return res.status(401).json({ message: 'No tenant. Invalid CNPJ.' });
        }

        await Payment.create({
            cnpj,
            valorPlano: tenant.assinatura.valor,
            vencimentoOriginal: tenant.assinatura.data_vencimento,
            dataPagamento,
            valorPago,
        });

        console.log();
        tenant.assinatura.data_vencimento = proximoPagamento;
        await tenant.save();

        return res.json({ message: "Paid successfuly" });
    }
}

export default new PaymentController();