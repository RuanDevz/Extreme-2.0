'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const allConfigs = require(path.join(__dirname, '..', 'config', 'config.json'));
const config = allConfigs[env] || {};
const db = {};

let sequelize;

// prioriza POSTGRES_URL; senão usa ponteiro de config.use_env_variable
const url = process.env.POSTGRES_URL || (config.use_env_variable ? process.env[config.use_env_variable] : null);

// opções base
const baseOptions = {
  dialect: config.dialect || 'postgres',
  logging: env === 'development' ? console.log : false,
  ...(config.dialectOptions ? { dialectOptions: config.dialectOptions } : {}),
  ...(config.pool ? { pool: config.pool } : {})
};

// Vercel: merge sem sobrescrever
if (process.env.VERCEL) {
  baseOptions.dialectOptions = {
    ...(baseOptions.dialectOptions || {}),
    ssl: { require: true, rejectUnauthorized: false }
  };
  baseOptions.pool = baseOptions.pool || { max: 5, min: 0, idle: 10000, acquire: 30000, evict: 1000 };
}

// instanciação única
if (url) {
  sequelize = new Sequelize(url, baseOptions);
} else {
  if (!config.database || !config.username) {
    throw new Error(`Config incompleta para "${env}". Defina POSTGRES_URL ou preencha config.json.`);
  }
  sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    port: config.port,
    ...baseOptions
  });
}

// autoimport de modelos
fs.readdirSync(__dirname)
  .filter(f => f.indexOf('.') !== 0 && f !== basename && f.endsWith('.js') && !f.endsWith('.test.js'))
  .forEach(f => {
    const model = require(path.join(__dirname, f))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(n => { if (typeof db[n].associate === 'function') db[n].associate(db); });

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
