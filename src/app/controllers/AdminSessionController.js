import jwt from 'jsonwebtoken';
import AdminUser from '../models/AdminUser';

class AdminSessionController {
  async store(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
      }

      // Buscar admin com password incluído
      const admin = await AdminUser.findOne({ username: username.toLowerCase() }).select('+password');

      if (!admin) {
        return res.status(401).json({ error: 'Usuário ou senha inválidos' });
      }

      // Verificar se está ativo
      if (!admin.active) {
        return res.status(401).json({ error: 'Usuário inativo' });
      }

      // Verificar senha
      const passwordMatch = await admin.checkPassword(password);

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Usuário ou senha inválidos' });
      }

      // Atualizar último login
      admin.lastLogin = new Date();
      await admin.save();

      // Gerar token JWT
      const token = jwt.sign(
        { 
          id: admin._id,
          username: admin.username,
          type: admin.type,
        },
        process.env.JWT_SECRET || 'mk-edge-super-secret-key-2024',
        { expiresIn: '7d' }
      );

      return res.json({
        user: {
          id: admin._id,
          username: admin.username,
          name: admin.name,
          email: admin.email,
          type: admin.type,
        },
        token,
      });
    } catch (error) {
      console.error('Erro no login admin:', error);
      return res.status(500).json({ error: 'Erro ao realizar login' });
    }
  }

  async validate(req, res) {
    try {
      // O usuário já foi validado no middleware
      const admin = await AdminUser.findById(req.adminId);

      if (!admin || !admin.active) {
        return res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
      }

      return res.json({
        user: {
          id: admin._id,
          username: admin.username,
          name: admin.name,
          email: admin.email,
          type: admin.type,
        },
      });
    } catch (error) {
      console.error('Erro ao validar token:', error);
      return res.status(500).json({ error: 'Erro ao validar token' });
    }
  }
}

export default new AdminSessionController();
