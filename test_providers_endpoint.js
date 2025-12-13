const fetch = require('node-fetch');

async function testEndpoint() {
    try {
        // Primeiro fazer login para pegar token
        const loginRes = await fetch('http://localhost:3333/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'Falcon2931'
            })
        });
        
        if (!loginRes.ok) {
            console.log('❌ Login falhou');
            return;
        }
        
        const loginData = await loginRes.json();
        console.log('✅ Login OK, token obtido');
        
        // Agora buscar providers
        const providersRes = await fetch('http://localhost:3333/admin/providers', {
            headers: {
                'Authorization': `Bearer ${loginData.token}`
            }
        });
        
        if (!providersRes.ok) {
            console.log('❌ Erro ao buscar providers:', providersRes.status);
            return;
        }
        
        const providers = await providersRes.json();
        console.log('\n📊 Total de providers:', providers.length);
        console.log('🎁 Com cortesia:', providers.filter(p => p.cortesia === true).length);
        
        console.log('\nProviders com cortesia:');
        providers.filter(p => p.cortesia === true).forEach(p => {
            console.log('  -', p.provedor?.nome || p.razao_social, 'CNPJ:', p.cnpj);
        });
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
    
    process.exit(0);
}

testEndpoint();
