require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST_NAME,
    user: process.env.MYSQL_USER,
    port: process.env.MYSQL_PORT,
    database: process.env.MYSQL_DATABASE,
    password: process.env.MYSQL_PASSWORD,
    connectionLimit: 10,
    idleTimeout: 60000,
    enableKeepAlive: true,
});

module.exports = pool;