import Tenant from '../schemas/Tenant';

import { connectNewTenantsDB, resolveDbConnection } from '../middlewares/connectionResolver';

class ConnectController {
    async store(req, res) {
        const { cnpj } = req.body;

        if (!cnpj || cnpj === "") {
            return res.status(400).json({ message: 'Invalid CNPJ' })
        }

        const tenant = await Tenant.findOne({ cnpj });

        try {
            await connectNewTenantsDB(tenant);
            const dbStatus = await resolveDbConnection(tenant);
            return res.json({
                id: tenant.id,
                cnpj: tenant.cnpj,
                responsavel: tenant.responsavel,
                contato: tenant.contato,
                provedor: {
                    nome: tenant.provedor.nome
                },
                database: {
                    conectado: dbStatus
                },
                assinatura: {
                    ativa: tenant.assinatura.ativa,
                    valor: tenant.assinatura.valor,
                    data_vencimento: tenant.assinatura.data_vencimento,
                    dia_vencimento: tenant.assinatura.dia_vencimento
                }
            });
        } catch (error) {
            return res.status(401).json({ message: error })
        }
    }
}

export default new ConnectController();
