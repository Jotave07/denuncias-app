const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
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

// Rota para a página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para o painel administrativo
app.get('/admin', (req, res) => {
    if (req.session.logado) {
        // A query foi alterada para selecionar os novos campos de anexo
        db.query('SELECT *, anexo_nome_original, anexo_nome_salvo FROM denuncias ORDER BY data_envio DESC', (err, results) => {
            if (err) {
                console.error('Erro ao buscar denúncias:', err);
                return res.status(500).send('Erro ao buscar denúncias');
            }
            res.render('admin', { denuncias: results });
        });
    } else {
        res.sendFile(path.join(__dirname, 'login.html'));
    }
});

// Rota para processar o login
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    if (usuario === 'admin' && senha === '1234') {
        req.session.logado = true;
        res.redirect('/admin');
    } else {
        res.send('Credenciais inválidas');
    }
});

// Rota para envio da denúncia
app.post('/enviar', upload.single('anexo'), (req, res) => {
    const { identificado, nome, telefone, email, tipo, descricao } = req.body;
    const identificacao = identificado === 'sim';
    const nomeFinal = identificacao ? nome || null : null;
    const telefoneFinal = identificacao ? telefone || null : null;
    const emailFinal = identificacao ? email || null : null;

    // Novos campos para anexo
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
            arquivo: anexoNomeOriginal // Usa o nome original para o e-mail
        };
        
        enviarEmail(denunciaParaEmail);

        // Não remove o anexo temporário, pois ele será usado para download.
        // if (req.file) {
        //     fs.unlink(req.file.path, () => {});
        // }

        res.json({ message: 'Denúncia enviada com sucesso!' });
    });
});

// Rota para marcar denúncia como resolvida
app.post('/admin/marcar/:id/resolvido', (req, res) => {
    if (!req.session.logado) {
        return res.status(403).send('Acesso negado.');
    }

    const denunciaId = req.params.id;
    const query = 'UPDATE denuncias SET status = "Resolvido" WHERE id = ?';

    db.query(query, [denunciaId], (err) => {
        if (err) {
            console.error('Erro ao atualizar status:', err);
            return res.status(500).send('Erro ao atualizar o status da denúncia.');
        }
        
        res.redirect('/admin');
    });
});

// Rota para marcar denúncia como pendente
app.post('/admin/marcar/:id/pendente', (req, res) => {
    if (!req.session.logado) {
        return res.status(403).send('Acesso negado.');
    }

    const denunciaId = req.params.id;
    const query = 'UPDATE denuncias SET status = "Pendente" WHERE id = ?';

    db.query(query, [denunciaId], (err) => {
        if (err) {
            console.error('Erro ao atualizar status:', err);
            return res.status(500).send('Erro ao atualizar o status da denúncia.');
        }
        
        res.redirect('/admin');
    });
});

// Nova rota para download de anexos
app.get('/admin/anexo/:filename', (req, res) => {
    if (!req.session.logado) {
        return res.status(403).send('Acesso negado.');
    }

    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    // Consulta no banco de dados para obter o nome original
    const query = 'SELECT anexo_nome_original FROM denuncias WHERE anexo_nome_salvo = ?';
    db.query(query, [filename], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).send('Arquivo não encontrado ou erro no banco de dados.');
        }
        const originalname = results[0].anexo_nome_original;

        // Envia o arquivo para download com o nome original
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

// Iniciar o servidor
app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
