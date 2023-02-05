const mongoUrl =
  'mongodb://root:Falcon2931@localhost:27017/mkedgetenants?authSource=admin&authMechanism=SCRAM-SHA-256&readPreference=primary&appname=MongoDB%20Compass&ssl=false';

export default {
  mongodb_auth_source: 'admin',
  mongodb_url: mongoUrl,
  mongodb_user: 'root',
  mongodb_password: 'Falcon2931',
}
