import Sequelize, { Model } from 'sequelize';

class Employee extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
        },
        nome: Sequelize.STRING,
        email: Sequelize.STRING,
      },
      {
        sequelize,
        tableName: 'sis_func',
      }
    );

    return this;
  }
}

export default Employee;
