import 'dotenv/config';

export default {
  dialect: process.env.DATABASE_DIALECT,
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  define: {
    timestamps: false,
    underscored: true,
    underscoredAll: true,
  },
  mongodb_auth_source: process.env.MONGODB_AUTH_SOURCE,
  mongodb_url: process.env.MONGODB_URL,
  mongodb_user: process.env.MONGODB_USER,
  mongodb_password: process.env.MONGODB_PASSWORD,
};
