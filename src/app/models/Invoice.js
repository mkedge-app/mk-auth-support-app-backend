import Sequelize, { Model } from 'sequelize';

class Invoice extends Model {
  static init(sequelize) {
    super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
        },
        uuid_lanc: Sequelize.STRING,
        datavenc: Sequelize.DATE,
        datapag: Sequelize.DATE,
        datadel: Sequelize.DATE,
        valor: Sequelize.STRING,
        status: Sequelize.STRING,
        login: Sequelize.STRING,
        tipo: Sequelize.STRING,
        obs: Sequelize.STRING,
        linhadig: Sequelize.STRING,
        coletor: Sequelize.STRING,
        formapag: Sequelize.STRING,
        valorpag: Sequelize.STRING, // Valor efetivamente pago
        // Campos novos - comentados até rodar migrations
        // formapag_extra: Sequelize.STRING,
        // acrescimo: Sequelize.DECIMAL(10, 2),
        // multa_mora: Sequelize.DECIMAL(10, 2),
        // desconto: Sequelize.DECIMAL(10, 2),
        // valor_pago: Sequelize.DECIMAL(10, 2),
        // cartao_bandeira: Sequelize.STRING,
        // cartao_numero: Sequelize.STRING,
        // cheque_banco: Sequelize.STRING,
        // cheque_numero: Sequelize.STRING,
        // cheque_agcc: Sequelize.STRING,
      },
      {
        sequelize,
        tableName: 'sis_lanc',
        timestamps: false,
      }
    );

    return this;
  }
}

export default Invoice;
