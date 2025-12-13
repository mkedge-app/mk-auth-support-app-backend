const mongoose = require('mongoose');

const MONGO_URL = 'mongodb://root:Falcon2931@localhost:27017/mkedgetenants?authSource=admin&authMechanism=SCRAM-SHA-256';

mongoose.connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const tenantSchema = new mongoose.Schema({}, { collection: 'tenants', strict: false });
const Tenant = mongoose.model('Tenant', tenantSchema);

async function updateUpdata() {
    try {
        console.log('�� Buscando Updata Telecom...');
        
        const result = await Tenant.updateOne(
            { cnpj: '04038227000187' },
            { 
                $set: { 
                    status: 'ativo',
                    cortesia: true
                }
            }
        );
        
        if (result.matchedCount === 0) {
            console.log('❌ Updata não encontrada!');
            process.exit(1);
        }
        
        console.log('✅ Updata atualizada!');
        console.log('   Status: ativo');
        console.log('   Cortesia: true');
        
        const updated = await Tenant.findOne({ cnpj: '04038227000187' });
        console.log('\n📊 Confirmado:');
        console.log('   Nome:', updated.provedor?.nome || updated.razao_social);
        console.log('   Status:', updated.status);
        console.log('   Cortesia:', updated.cortesia);
        
        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    }
}

updateUpdata();
