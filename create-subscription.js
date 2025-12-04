const mongoose = require('mongoose');

mongoose.connect('mongodb://root:Falcon2931@localhost:27017/mkedgetenants?authSource=admin', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  // Buscar um tenant existente
  const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }), 'tenants');
  const tenant = await Tenant.findOne();
  
  if (!tenant) {
    console.log('Nenhum tenant encontrado');
    process.exit(1);
  }
  
  // Buscar um plano existente
  const Plan = mongoose.model('Plan', new mongoose.Schema({}, { strict: false }), 'plans');
  const plan = await Plan.findOne();
  
  if (!plan) {
    console.log('Nenhum plano encontrado');
    process.exit(1);
  }
  
  // Criar assinatura
  const Subscription = mongoose.model('Subscription', new mongoose.Schema({
    tenantId: String,
    planId: String,
    status: String,
    amount: Number,
    startDate: Date,
    nextBillingDate: Date,
    paymentStatus: String,
    createdAt: Date,
    updatedAt: Date
  }));
  
  const subscription = new Subscription({
    tenantId: tenant._id.toString(),
    planId: plan._id.toString(),
    status: 'active',
    amount: plan.valor || 99.90,
    startDate: new Date(),
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    paymentStatus: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  await subscription.save();
  console.log('✅ Assinatura criada:', subscription._id);
  console.log('Tenant:', tenant.provedor?.nome || tenant._id);
  console.log('Plano:', plan.nome);
  console.log('Valor: R$', subscription.amount);
  
  process.exit(0);
}).catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
