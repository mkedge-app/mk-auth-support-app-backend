import Tenant from '../schemas/Tenant';
import { tenantDatabaseConnections, connectNewTenantsDB, resolveDbConnection } from '../middlewares/connectionResolver';

class ProviderStatusController {
    async update(req, res) {
        const { cnpj } = req.body;

        if (!cnpj || cnpj === "") {
            return res.status(400).json({ message: 'Invalid CNPJ' });
        }

        const tenant = await Tenant.findOne({ cnpj });

        if (tenant.assinatura.ativa) {
            // Desativando: desconecta o banco
            tenant.assinatura.ativa = false;
            await tenant.save();
            const connection = tenantDatabaseConnections[tenant.id];
            if (connection) {
                connection.close();
                delete tenantDatabaseConnections[tenant.id];
            }
        } else {
            // Ativando: aguarda 2 segundos e conecta automaticamente o banco
            tenant.assinatura.ativa = true;
            await tenant.save();
            
            // Aguarda 2 segundos antes de conectar
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Conecta o banco automaticamente
            await connectNewTenantsDB(tenant);
        }

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
    }
}

export default new ProviderStatusController();
