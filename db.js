const mysql = require('mysql2');

// Altere essas credenciais conforme seu ambiente
const connection = mysql.createConnection({
  host: '65.109.171.110',
  user: 'novesete',
  password: 'Novesete@97',
  database: 'Denuncias_Novesete',
  port: 3306
});

connection.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao MySQL:', err.message);
    return;
  }
  console.log('Conectado ao MySQL com sucesso!');
});

module.exports = connection;


/*const mysql = require('mysql2');

// Altere essas credenciais conforme seu ambiente
const connection = mysql.createConnection({
  host: 'trolley.proxy.rlwy.net',
  user: 'root',
  password: 'JCbmlpmKXkEDmhUbSyGdURVkieEcxlMj',
  database: 'railway',
  port: 28527
});

connection.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao MySQL:', err.message);
    return;
  }
  console.log('Conectado ao MySQL com sucesso!');
});

module.exports = connection;*/
