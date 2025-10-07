const { Resend } = require('resend');

// use variável de ambiente no Railway: RESEND_API_KEY
const resend = new Resend(process.env.RESEND_API_KEY || 're_gdcsTonW_2eC1ZmtmkvMYnmcxfXvJ8pTx');

async function enviarEmail(denuncia) {
  try {
    const data = await resend.emails.send({
      from: 'Sistema de Denúncias <enviosdenuncia@gmail.com>',
      to: ['jvitor071298@gmail.com'],
      subject: 'Nova denúncia registrada',
      html: `
        <h2>Nova denúncia recebida</h2>
        <p><strong>Descrição:</strong> ${denuncia.descricao}</p>
        <p><strong>Identificação:</strong> ${denuncia.identificacao}</p>
        ${denuncia.arquivo ? `<p><strong>Arquivo:</strong> ${denuncia.arquivo}</p>` : ''}
        <p>Data: ${new Date().toLocaleString()}</p>
      `
    });

    console.log('E-mail enviado com sucesso!', data);
  } catch (err) {
    console.error('Erro ao enviar e-mail:', err);
  }
}

module.exports = enviarEmail;
