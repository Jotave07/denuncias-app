const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcrypt');
const db = require('./db');
const enviarEmail = require('./mailer');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: 'chave_secreta',
    resave: false,
    saveUninitialized: true
}));

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'uploads')));

// Middleware para passar mensagens da sessao para o template
app.use((req, res, next) => {
    res.locals.message = req.session.message;
    delete req.session.message;
    next();
});

// Rota para a página principal (formulário de denúncia)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para a página de login
app.get('/login', (req, res) => {
    if (req.session.logado) {
        return res.redirect('/admin');
    }
    res.render('login');
});

// Rota para a página de registro de administrador
app.get('/register-admin', (req, res) => {
    if (!req.session.logado) {
        return res.redirect('/login');
    }
    res.render('register');
});

// Rota para processar o registro de um novo administrador
app.post('/register-admin', async (req, res) => {
    if (!req.session.logado) {
        req.session.message = { text: 'Acesso negado para registrar um novo administrador.', type: 'error' };
        return res.status(403).redirect('/login');
    }

    const { usuario, senha } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(senha, 10);
        const query = 'INSERT INTO administradores (usuario, senha) VALUES (?, ?)';
        db.query(query, [usuario, hashedPassword], (err) => {
            if (err) {
                console.error('Erro ao registrar novo administrador:', err);
                req.session.message = { text: 'Erro ao registrar administrador. Tente novamente.', type: 'error' };
                return res.redirect('/register-admin');
            }
            req.session.message = { text: `Administrador ${usuario} registrado com sucesso!`, type: 'success' };
            res.redirect('/admin');
        });
    } catch (error) {
        console.error('Erro ao processar a senha:', error);
        req.session.message = { text: 'Erro ao processar a senha.', type: 'error' };
        res.redirect('/register-admin');
    }
});

// Rota para processar o login
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;

    const query = 'SELECT * FROM administradores WHERE usuario = ?';
    db.query(query, [usuario], async (err, results) => {
        if (err) {
            console.error('Erro ao buscar usuário:', err);
            req.session.message = { text: 'Erro no servidor, tente novamente.', type: 'error' };
            return res.status(500).redirect('/login');
        }

        if (results.length > 0) {
            const admin = results[0];
            const match = await bcrypt.compare(senha, admin.senha);
            if (match) {
                req.session.logado = true;
                req.session.message = { text: 'Login realizado com sucesso!', type: 'success' };
                return res.redirect('/admin');
            }
        }
        req.session.message = { text: 'Credenciais inválidas.', type: 'error' };
        res.redirect('/login');
    });
});

// Rota para o painel administrativo
app.get('/admin', (req, res) => {
    if (req.session.logado) {
        // Agora a consulta SQL inclui a nova coluna 'motivo_resolucao'
        db.query('SELECT *, anexo_nome_original, anexo_nome_salvo, motivo_resolucao FROM denuncias ORDER BY data_envio DESC', (err, results) => {
            if (err) {
                console.error('Erro ao buscar denúncias:', err);
                return res.status(500).send('Erro ao buscar denúncias');
            }
            res.render('admin', { denuncias: results, message: res.locals.message });
        });
    } else {
        req.session.message = { text: 'Acesso negado. Por favor, faça login.', type: 'error' };
        res.redirect('/login');
    }
});

// Rota para envio da denúncia
app.post('/enviar', upload.single('anexo'), (req, res) => {
    const { identificado, nome, telefone, email, tipo, descricao } = req.body;
    const identificacao = identificado === 'sim';
    const nomeFinal = identificacao ? nome || null : null;
    const telefoneFinal = identificacao ? telefone || null : null;
    const emailFinal = identificacao ? email || null : null;

    const anexoNomeOriginal = req.file ? req.file.originalname : null;
    const anexoNomeSalvo = req.file ? req.file.filename : null;

    const query = `
        INSERT INTO denuncias (identificacao, nome, telefone, email, tipo, descricao, status, anexo_nome_original, anexo_nome_salvo, data_envio)
        VALUES (?, ?, ?, ?, ?, ?, 'Pendente', ?, ?, NOW())
    `;

    db.query(query, [identificacao, nomeFinal, telefoneFinal, emailFinal, tipo, descricao, anexoNomeOriginal, anexoNomeSalvo], (err, result) => {
        if (err) {
            console.error('Erro ao salvar:', err);
            return res.status(500).json({ message: 'Erro ao enviar denúncia.' });
        }

        const denunciaParaEmail = {
            id: result.insertId,
            descricao: descricao,
            identificacao: identificacao ? 'Sim' : 'Não',
            arquivo: anexoNomeOriginal
        };
        
        enviarEmail(denunciaParaEmail);

        res.json({ message: 'Denúncia enviada com sucesso!' });
    });
});

// ----- INÍCIO DA ALTERAÇÃO -----

// Nova rota POST para resolver denúncias
app.post('/admin/resolver/:id', (req, res) => {
    if (!req.session.logado) {
        return res.status(403).json({ success: false, message: 'Acesso negado.' });
    }

    const denunciaId = req.params.id;
    const { reason } = req.body;

    if (!reason) {
        return res.status(400).json({ success: false, message: 'O motivo da resolução é obrigatório.' });
    }

    // A consulta SQL agora atualiza o status E o motivo da resolução
    const query = 'UPDATE denuncias SET status = "Resolvido", motivo_resolucao = ? WHERE id = ?';
    db.query(query, [reason, denunciaId], (err, result) => {
        if (err) {
            console.error('Erro ao atualizar status e motivo:', err);
            return res.status(500).json({ success: false, message: 'Erro ao atualizar o status da denúncia.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Denúncia não encontrada.' });
        }

        // Resposta de sucesso para o frontend (JSON, em vez de redirect)
        res.json({ success: true, message: `Denúncia #${denunciaId} marcada como resolvida.` });
    });
});

// As rotas antigas de marcar como 'resolvido' e 'pendente' foram removidas
// porque a nova lógica do frontend e backend trata a resolução como uma ação final.

// ----- FIM DA ALTERAÇÃO -----

// Rota para download de anexos
app.get('/admin/anexo/:filename', (req, res) => {
    if (!req.session.logado) {
        return res.status(403).send('Acesso negado.');
    }

    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    const query = 'SELECT anexo_nome_original FROM denuncias WHERE anexo_nome_salvo = ?';
    db.query(query, [filename], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).send('Arquivo não encontrado ou erro no banco de dados.');
        }
        const originalname = results[0].anexo_nome_original;

        res.download(filePath, originalname, (err) => {
            if (err) {
                console.error('Erro ao enviar o arquivo para download:', err);
                res.status(500).send('Erro ao fazer o download do arquivo.');
            }
        });
    });
});

// Rota de logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
