import 'dotenv/config';

export default {
  mongodb_auth_source: 'admin',
  mongodb_url: process.env.MONGODB_URL,
  mongodb_user: process.env.MONGODB_USER,
  mongodb_password: process.env.MONGODB_PASSWORD,
}
