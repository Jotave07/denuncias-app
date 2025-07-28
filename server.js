const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const basicAuth = require('express-basic-auth');
const db = require('./db');
const enviarEmail = require('./mailer');
const moment = require('moment');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurando EJS
app.set('view engine', 'ejs');
app.set('views', __dirname); // ou a pasta onde estiver admin.ejs

// Pasta para uploads
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static('uploads'));

// Protegendo o /admin com autenticação básica
app.use('/admin', basicAuth({
  users: { 'admin': 'novesete' },
  challenge: true
}));

// Configurando multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Rota pública: formulário
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Rota admin: renderiza com dados do banco via EJS
app.get('/admin', (req, res) => {
  db.query('SELECT * FROM denuncias ORDER BY data_envio DESC', (err, results) => {
    if (err) return res.status(500).send('Erro ao buscar denúncias.');

    results.forEach(d => {
      d.data_formatada = moment(d.data_envio).format('DD/MM/YYYY HH:mm:ss');
    });

    res.render('admin', { denuncias: results });
  });
});

// Envio de denúncia
app.post('/submit-denuncia', upload.single('arquivo'), (req, res) => {
  const descricao = req.body.descricao;
  const identificacao = req.body.identificacao || 'Anônimo';
  const arquivo = req.file ? req.file.filename : null;

  // Data com fuso de São Paulo
  const data_envio = moment().tz('America/Sao_Paulo').format('YYYY-MM-DD HH:mm:ss');

  db.query(
    'INSERT INTO denuncias (descricao, identificacao, arquivo, data_envio) VALUES (?, ?, ?, ?)',
    [descricao, identificacao, arquivo, data_envio],
    (err, results) => {
      if (err) {
        console.error('Erro ao inserir no banco:', err.message);
        return res.status(500).send('Erro ao registrar denúncia.');
      }

      enviarEmail({ descricao, identificacao, arquivo });

      res.send('Denúncia registrada com sucesso!');
    }
  );
});


// Atualizar status
app.post('/admin/status/:id', (req, res) => {
  const id = req.params.id;
  const novoStatus = req.body.status;

  db.query(
    'UPDATE denuncias SET status = ? WHERE id = ?',
    [novoStatus, id],
    (err, result) => {
      if (err) {
        console.error('Erro ao atualizar status:', err.message);
        return res.status(500).send('Erro ao atualizar denúncia.');
      }
      res.redirect('/admin');
    }
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
