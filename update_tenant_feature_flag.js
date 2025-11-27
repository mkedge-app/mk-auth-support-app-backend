// Adiciona feature flag use_mka_api ao tenant
const mongoose = require('mongoose');

const MONGO_URL = 'mongodb://root:Falcon2931@localhost:27017/mkedgetenants?authSource=admin&authMechanism=SCRAM-SHA-256';

async function addFeatureFlag() {
  try {
    await mongoose.connect(MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Conectado ao MongoDB');

    // Adicionar campo use_mka_api = false (desativado por padrão)
    const result = await mongoose.connection.db.collection('tenants').updateOne(
      { _id: mongoose.Types.ObjectId('63dd998b885eb427c8c51958') },
      {
        $set: {
          use_mka_api: false  // DESATIVADO por padrão para segurança
        }
      }
    );

    console.log('\n📊 Resultado:');
    console.log(`   Documentos encontrados: ${result.matchedCount}`);
    console.log(`   Documentos modificados: ${result.modifiedCount}`);

    const tenant = await mongoose.connection.db.collection('tenants').findOne(
      { _id: mongoose.Types.ObjectId('63dd998b885eb427c8c51958') }
    );

    console.log('\n🚩 Feature Flag adicionada:');
    console.log(`   use_mka_api: ${tenant.use_mka_api} (desativada por padrão)`);
    console.log('\n💡 Para ativar: execute "node toggle_mka_api.js enable"');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

addFeatureFlag();
