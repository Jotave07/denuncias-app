const bcrypt = require('bcrypt');

async function generateHash() {
    const suaSenha = 'admin';

    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(suaSenha, saltRounds);
        console.log(`Senha original: ${suaSenha}`);
        console.log(`Senha criptografada (hash): ${hashedPassword}`);
        console.log('Copie a senha criptografada (a linha que começa com "$2b$...")');
    } catch (error) {
        console.error('Erro ao gerar hash:', error);
    }
}

generateHash();
