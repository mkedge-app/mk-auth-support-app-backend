const mongoose = require('mongoose');

mongoose.connect('mongodb://root:Falcon2931@localhost:27017/mkedgetenants?authSource=admin', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const tenantSchema = new mongoose.Schema({}, { collection: 'tenants', strict: false });
const Tenant = mongoose.model('Tenant', tenantSchema);

setTimeout(async () => {
    try {
        const updata = await Tenant.findOne({ cnpj: '04038227000187' }).lean();
        console.log(JSON.stringify(updata, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Erro:', error.message);
        process.exit(1);
    }
}, 1000);
