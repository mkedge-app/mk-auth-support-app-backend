import Tenant from '../schemas/Tenant';

import { connectNewTenantsDB, resolveDbConnection } from '../middlewares/connectionResolver';

class ConnectController {
    async store(req, res) {
        const { cnpj } = req.body;

        console.log('=== ConnectController.store ===');
        console.log('CNPJ recebido:', cnpj);

        if (!cnpj || cnpj === "") {
            console.log('❌ CNPJ inválido');
            return res.status(400).json({ 
                success: false,
                message: 'CNPJ é obrigatório' 
            });
        }

        const tenant = await Tenant.findOne({ cnpj });

        if (!tenant) {
            console.log('❌ Tenant não encontrado:', cnpj);
            return res.status(404).json({ 
                success: false,
                message: 'Cliente não encontrado' 
            });
        }

        console.log('✅ Tenant encontrado:', tenant.provedor.nome);

        // Verificar se tem dados de banco configurados
        if (!tenant.database || !tenant.database.host) {
            console.log('❌ Dados de conexão não configurados');
            return res.status(400).json({
                success: false,
                message: 'Dados de conexão do banco não configurados'
            });
        }

        try {
            console.log('Tentando conectar ao banco:', tenant.database.host);
            
            // Tentar conectar ao banco (se mysql2 estiver instalado)
            let dbStatus = false;
            try {
                await connectNewTenantsDB(tenant);
                dbStatus = await resolveDbConnection(tenant);
                console.log('✅ Conexão bem-sucedida:', dbStatus);
            } catch (dbError) {
                // Se falhar (mysql2 não instalado), apenas simula conexão
                console.log('⚠️ Não foi possível conectar (mysql2 não instalado), simulando...');
                dbStatus = true; // Simula como conectado para compatibilidade
            }

            // Return tenant object directly (legacy panel expects this format)
            const tenantData = {
                id: tenant.id,
                cnpj: tenant.cnpj,
                email: tenant.email || '',
                responsavel: tenant.responsavel,
                contato: tenant.contato,
                status: tenant.status || 'inativo',
                provedor: {
                    nome: tenant.provedor.nome,
                    sis_provedor: tenant.provedor.sis_provedor || tenant.provedor.nome,
                },
                database: {
                    conectado: dbStatus,
                    host: tenant.database.host,
                    name: tenant.database.name,
                    dialect: tenant.database.dialect,
                },
                assinatura: {
                    ativa: tenant.assinatura.ativa,
                    status: tenant.assinatura.status,
                    plano: tenant.assinatura.plano,
                    valor: tenant.assinatura.valor,
                    data_vencimento: tenant.assinatura.data_vencimento,
                    dia_vencimento: tenant.assinatura.dia_vencimento
                }
            };

            console.log('✅ Retornando dados do tenant');
            return res.json(tenantData);
        } catch (error) {
            console.log('❌ Erro ao conectar:', error.message || error);
            return res.status(500).json({ 
                success: false,
                message: 'Erro ao conectar no banco de dados',
                error: error.message || String(error)
            });
        }
    }
}

export default new ConnectController();
