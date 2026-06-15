const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'mi_usuario',
    password: 'mi_clave',  // ← ¡CÁMBIALA!
    database: 'preseleccion_verano',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();
module.exports = promisePool;
