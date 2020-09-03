let models = [];
let connection = null;

class DBSwitcher {
  init(sequelize, appModels) {
    connection = sequelize;
    models = appModels;
  }

  changeDatabase(req, res, next) {
    models.map(model => model.init(connection[1]));

    next();
  }
}

export default new DBSwitcher();
