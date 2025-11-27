// Script Node.js para atualizar tenant com credenciais MK-AUTH
const mongoose = require('mongoose');

const MONGO_URL = 'mongodb://root:Falcon2931@localhost:27017/mkedgetenants?authSource=admin&authMechanism=SCRAM-SHA-256';

async function updateTenant() {
  try {
    await mongoose.connect(MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Conectado ao MongoDB');

    const result = await mongoose.connection.db.collection('tenants').updateOne(
      { _id: mongoose.Types.ObjectId('63dd998b885eb427c8c51958') },
      {
        $set: {
          api_mka_client: 'Client_Id_4d1e692d668f91461077c08a16c5456b',
          api_mka_secret: 'Client_Secret_137ae744f2ee12fef3a7eea070edbca3d0bb449e',
          webhook_mka_servidor: 'https://provedor.updata.com.br',
          webhook_mka_secret: '137ae744f2ee12fef3a7eea070edbca3d0bb449e',
        }
      }
    );

    console.log('\n📊 Resultado da atualização:');
    console.log(`   Documentos encontrados: ${result.matchedCount}`);
    console.log(`   Documentos modificados: ${result.modifiedCount}`);

    // Verificar dados atualizados
    const tenant = await mongoose.connection.db.collection('tenants').findOne(
      { _id: mongoose.Types.ObjectId('63dd998b885eb427c8c51958') }
    );

    if (tenant) {
      console.log('\n📋 Dados do tenant após atualização:');
      console.log(`   ID: ${tenant._id}`);
      console.log(`   Provedor: ${tenant.provedor.nome}`);
      console.log(`   API Client: ${tenant.api_mka_client}`);
      console.log(`   API Secret: ***${tenant.api_mka_secret?.slice(-10) || 'não definido'}`);
      console.log(`   Webhook Servidor: ${tenant.webhook_mka_servidor}`);
      console.log(`   Webhook Secret: ***${tenant.webhook_mka_secret?.slice(-10) || 'não definido'}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Atualização concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

updateTenant();
