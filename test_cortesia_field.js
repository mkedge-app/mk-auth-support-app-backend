const Tenant = require('./src/app/schemas/Tenant').default;

async function test() {
    try {
        const updata = await Tenant.findOne({ cnpj: '04038227000187' }).lean();
        console.log('✅ Updata no banco:');
        console.log('   Nome:', updata.provedor?.nome);
        console.log('   Status:', updata.status);
        console.log('   Cortesia:', updata.cortesia);
        console.log('   Tem campo cortesia?', 'cortesia' in updata ? 'SIM' : 'NÃO');
        process.exit(0);
    } catch (error) {
        console.error('Erro:', error.message);
        process.exit(1);
    }
}

test();
