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
  mongodb_auth_source: "admin",
  mongodb_url: "mongodb://root:Falcon2931@mk-edge.com.br:27017/mkedgetenants?authSource=admin&authMechanism=SCRAM-SHA-256&readPreference=primary&appname=MongoDB%20Compass&ssl=false",
  mongodb_user: "root",
  mongodb_password: "Falcon2931",
};