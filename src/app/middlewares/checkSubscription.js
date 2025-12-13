import Tenant from '../schemas/Tenant';
import Subscription from '../schemas/Subscription';

/**
 * Middleware para verificar se tenant tem assinatura ativa
 * Clientes com cortesia=true são SEMPRE liberados
 */
export const checkSubscription = async (req, res, next) => {
  try {
    const tenant_id = req.tenant_id || req.body.tenant_id || req.params.tenant_id;

    if (!tenant_id) {
      return res.status(400).json({ error: 'Tenant ID não fornecido' });
    }

    const tenant = await Tenant.findById(tenant_id);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant não encontrado' });
    }

    // ✅ Clientes em cortesia sempre passam
    if (tenant.cortesia) {
      console.log('✅ Cliente em cortesia - acesso liberado:', tenant_id);
      req.tenant = tenant;
      req.is_cortesia = true;
      return next();
    }

    // Verificar se tem assinatura ativa
    const subscription = await Subscription.findOne({
      tenant_id,
      status: { $in: ['active', 'trial'] }
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return res.status(402).json({
        error: 'Assinatura inativa',
        message: 'Sua assinatura está inativa. Por favor, regularize seu pagamento.'
      });
    }

    // Verificar se está no trial
    if (subscription.status === 'trial' && subscription.trial_end < new Date()) {
      return res.status(402).json({
        error: 'Trial expirado',
        message: 'Seu período de teste expirou. Por favor, efetue o pagamento.'
      });
    }

    req.tenant = tenant;
    req.subscription = subscription;
    req.is_cortesia = false;

    next();
  } catch (error) {
    console.error('❌ Erro ao verificar assinatura:', error);
    return res.status(500).json({ error: 'Erro ao verificar assinatura' });
  }
};

export default { checkSubscription };
