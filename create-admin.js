const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/mkedgetenants';

// Definir schema diretamente
const AdminUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  type: { type: String, enum: ['super', 'admin'], default: 'admin' },
  active: { type: Boolean, default: true },
  lastLogin: { type: Date },
}, { timestamps: true });

const AdminUser = mongoose.model('AdminUser', AdminUserSchema);

async function createAdmin() {
  try {
    await mongoose.connect(mongoUrl);

    console.log('✅ Conectado ao MongoDB');

    // Verificar se já existe algum admin
    const existingAdmin = await AdminUser.findOne({});
    
    if (existingAdmin) {
      console.log('⚠️  Já existe um admin cadastrado:');
      console.log('   Username:', existingAdmin.username);
      console.log('   Name:', existingAdmin.name);
      console.log('   Email:', existingAdmin.email);
      process.exit(0);
    }

    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || Math.random().toString(36).slice(-12) + 'A1!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    // Criar admin padrão
    const admin = await AdminUser.create({
      username: 'admin',
      name: 'Administrador',
      email: 'admin@mk-edge.com.br',
      password: hashedPassword,
      type: 'super',
      active: true,
    });

    console.log('✅ Admin criado com sucesso!');
    console.log('');
    console.log('📋 Credenciais de acesso:');
    console.log('   Username: admin');
    console.log('   Password:', defaultPassword);
    console.log('');
    console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error);
    process.exit(1);
  }
}

createAdmin();
