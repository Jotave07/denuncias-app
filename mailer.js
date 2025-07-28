const nodemailer = require('nodemailer');

// Substitua pelos seus dados
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'enviosdenuncia@gmail.com',
    pass: 'dmhienjrpnmzmmmz'
  }
});

// Função para enviar o e-mail
function enviarEmail(denuncia) {
  const mailOptions = {
    from: 'Sistema de Denúncias <enviosdenuncia@gmail.com>',
    to: 'jvitor071298@gmail.com',
    subject: 'Nova denúncia registrada',
    html: `
      <h2>Nova denúncia recebida</h2>
      <p><strong>Descrição:</strong> ${denuncia.descricao}</p>
      <p><strong>Identificação:</strong> ${denuncia.identificacao}</p>
      ${denuncia.arquivo ? `<p><strong>Arquivo:</strong> ${denuncia.arquivo}</p>` : ''}
      <p>Data: ${new Date().toLocaleString()}</p>
    `
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('Erro ao enviar e-mail:', err.message);
    } else {
      console.log('E-mail enviado:', info.response);
    }
  });
}

module.exports = enviarEmail;
