import jwt from 'jsonwebtoken';

import User from '../models/User';
import Employee from '../models/Employee';
import Tenant from '../schemas/Tenant';

import authConfig from '../../config/auth';

class SessionController {
  // Login do portal do cliente (CNPJ + Email)
  async storePortal(req, res) {
    try {
      const { cnpj, email } = req.body;

      if (!cnpj || !email) {
        return res.status(400).json({ error: 'CNPJ e Email são obrigatórios' });
      }

      // Buscar tenant por CNPJ e Email
      const tenant = await Tenant.findOne({ 
        cnpj: cnpj.replace(/\D/g, ''),
        email: email.toLowerCase()
      });

      if (!tenant) {
        return res.status(401).json({ error: 'CNPJ ou Email incorretos' });
      }

      // Gerar token JWT
      const token = jwt.sign(
        { 
          tenant_id: tenant._id,
          cnpj: tenant.cnpj,
          type: 'client'
        },
        authConfig.secret,
        {
          expiresIn: authConfig.expiresIn,
        }
      );

      return res.json({
        token,
        tenant: {
          id: tenant._id,
          nome: tenant.provedor?.nome || tenant.razao_social,
          cnpj: tenant.cnpj,
          email: tenant.email,
          status: tenant.status,
          cortesia: tenant.cortesia || false,
          assinatura: tenant.assinatura
        }
      });
    } catch (error) {
      console.error('Erro no login do portal:', error);
      return res.status(500).json({ error: 'Erro ao realizar login' });
    }
  }

  async store(req, res) {
    try {
      const { login, password } = req.body;

      const user = await User.findOne({
        where: { login },
      });

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Password validation with SHA256 + bcrypt support
      if (!user.checkPassword(password)) {
        console.log('Password does not match');
        return res.status(401).json({ error: 'Password does not match' });
      }

      const { idacesso, nome, email, cli_grupos } = user;

      const employee_id = await Employee.findOne({
        where: {
          email,
        },
      });

      if (!employee_id) {
        return res.status(401).json({ error: 'User is not an employee' });
      }

      const isAdmin = cli_grupos.includes('full_clientes', 0);

      const { tenant_id } = req.query;

      return res.json({
        user: {
          idacesso,
          nome,
          employee_id: employee_id.id,
          isAdmin,
          tenant_id,
        },
        token: jwt.sign({ idacesso }, authConfig.secret, {
          expiresIn: authConfig.expiresIn,
        }),
      });
    } catch (error) {
      console.error('Erro ao realizar login:', error);
      return res.status(500).json({ error: 'Erro interno ao processar login' });
    }
  }
}

export default new SessionController();
