module.exports = {
  development: {
    username: 'postgres',
    password: 'Falcon2931',
    database: 'mkedge',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    define: {
      timestamps: true,
      underscored: true,
      underscoredAll: true,
    },
  },
  production: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Falcon2931',
    database: process.env.DB_NAME || 'mkedge',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    define: {
      timestamps: true,
      underscored: true,
      underscoredAll: true,
    },
  },
};
