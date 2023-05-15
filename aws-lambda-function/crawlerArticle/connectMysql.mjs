import mysql from 'mysql'
export const con = mysql.createConnection({
  host: process.env.RDS_HOST,
  user: process.env.RDS_USER,
  password: process.env.RDS_PASSWORD,
  PORT: 3306,
  database: process.env.RDS_DATABASE
})
