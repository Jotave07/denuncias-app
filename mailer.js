const nodemailer = require('nodemailer');

const resendApiKey = 're_gdcsTonW_2eC1ZmtmkvMYnmcxfXvJ8pTx'; 


const transporter = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: 465,
  secure: true,
  auth: {
    user: "resend", // sempre "resend"
    pass: resendApiKey
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




