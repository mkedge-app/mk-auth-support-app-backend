module.exports = {
  dialect: 'mariadb',
  host: '127.0.0.1',
  username: 'root',
  password: 'vertrigo',
  database: 'mkradius',
  define: {
    timestamps: false,
    underscored: true,
    underscoredAll: true,
  },
};
