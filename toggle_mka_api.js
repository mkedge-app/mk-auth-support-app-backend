// Toggle feature flag use_mka_api
const mongoose = require('mongoose');

const MONGO_URL = 'mongodb://root:Falcon2931@localhost:27017/mkedgetenants?authSource=admin&authMechanism=SCRAM-SHA-256';

async function toggle(action) {
  try {
    await mongoose.connect(MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const enable = action === 'enable';
    
    const result = await mongoose.connection.db.collection('tenants').updateOne(
      { _id: mongoose.Types.ObjectId('63dd998b885eb427c8c51958') },
      { $set: { use_mka_api: enable } }
    );

    const tenant = await mongoose.connection.db.collection('tenants').findOne(
      { _id: mongoose.Types.ObjectId('63dd998b885eb427c8c51958') }
    );

    console.log(enable ? '✅ API MK-AUTH ATIVADA' : '❌ API MK-AUTH DESATIVADA');
    console.log(`   Tenant: ${tenant.provedor.nome}`);
    console.log(`   Status: use_mka_api = ${tenant.use_mka_api}`);
    
    if (enable) {
      console.log('\n⚠️  IMPORTANTE: Reinicie o servidor com "pm2 restart server"');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

const action = process.argv[2];
if (!action || !['enable', 'disable'].includes(action)) {
  console.log('Uso: node toggle_mka_api.js <enable|disable>');
  process.exit(1);
}

toggle(action);
