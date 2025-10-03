const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session); // +++
const db = require('./models');
require('dotenv').config();
const { Pool } = require('pg');
const encryptResponse = require('./Middleware/encryption');


const app = express();

// CORS: permita cookies se houver front separado
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Se estiver atrás de proxy/LB (Vercel/Render/NGINX), habilite:
app.set('trust proxy', 1); // +++

// Sessão com Postgres (elimina MemoryStore)
app.use(session({
  name: 'sid',
  store: new pgSession({
    conString: process.env.POSTGRES_URL,
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET, // remova default inseguro
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // exige HTTPS em prod
    sameSite: 'lax', // use 'none' se front em domínio diferente + HTTPS
    maxAge: 24 * 60 * 60 * 1000
  },
  proxy: true
}));

// Body parser: aplique globalmente, exceto webhook
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook') return next();
  return express.json()(req, res, next);
});

const webhookRouter = require('./routes/webhook');
app.use('/webhook', webhookRouter);

app.use((req, res, next) => {
  if (req.originalUrl === '/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Aplicar
app.use(encryptResponse);
const authRouter = require('./routes/auth');
const modelsRouter = require('./routes/models');
const contentRouter = require('./routes/content');
const reportsRouter = require('./routes/reports');
const i18nRouter = require('./routes/i18n');
const { router: ageVerificationRouter, ageVerificationMiddleware } = require('./routes/ageVerification');
const purchaseRouter = require('./routes/Purchase');
const billingRouter = require('./routes/Billing');
const commentsRouter = require('./routes/comments');
const likesRouter = require('./routes/likes');
const { router: notificationsRouter } = require('./routes/notifications');
const adminRouter = require('./routes/admin');
const recommendationsRouter = require('./routes/recommendations');
const rateLimit = require('express-rate-limit');

app.use('/auth', authRouter);
app.use('/age-verification', ageVerificationRouter);
app.use('/i18n', i18nRouter);

// Aplicar verificação de idade para rotas de conteúdo adulto
app.use('/models', modelsRouter);
app.use('/content' , contentRouter);
app.use('/reports', reportsRouter);
app.use('/purchase', purchaseRouter);
app.use('/billing', billingRouter);
app.use('/comments', commentsRouter);
app.use('/likes', likesRouter);
app.use('/notifications', notificationsRouter);
app.use('/admin', adminRouter);
app.use('/recommendations', recommendationsRouter);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: 'Ip bloqueado.',
});

app.use(limiter); 


app.use((req, res, next) => {
  const ua = req.headers['user-agent'] || '';
  if (/curl|wget|bot|spider/i.test(ua)) {
    return res.status(403).send('Forbidden');
  }
  next();
});

app.use((req, res, next) => {
  const url = decodeURIComponent(req.originalUrl);

  const bloqueios = [
    /\.bak$/i,
    /\.old$/i,
    /nice ports/i,
    /trinity/i,
    /\.git/i,
    /\.env/i,
    /wp-admin/i,
    /phpmyadmin/i
  ];

  for (const pattern of bloqueios) {
    if (pattern.test(url)) {
      console.warn(`try suspect: ${url}`);
      return res.status(403).send('Access denied.');
    }
  }

  next();
});



const pool = new Pool({
  connectionString: process.env.POSTGRES_URL, 
  max: 3, // Máximo de conexões no pool
  min: 0,
  idle: 5000,
  connectionTimeoutMillis: 60000,
  idleTimeoutMillis: 30000,
  allowExitOnIdle: true,
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
});

// Teste de conexão mais robusto
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Conexão bem-sucedida ao banco de dados');
    client.release();
  } catch (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
  }
};

// Configuração mais robusta do Sequelize
const initializeDatabase = async () => {
  try {
    // Teste de autenticação com timeout
    await Promise.race([
      db.sequelize.authenticate(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout na autenticação')), 10000)
      )
    ]);
    console.log('Conexão Sequelize estabelecida com sucesso.');
    
    // Criar tabelas se não existirem (tanto dev quanto prod)
    const tablesCreated = await Promise.race([
      db.createTablesIfNotExist(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout na criação de tabelas')), 30000)
      )
    ]);
    
    if (tablesCreated) {
      console.log('✅ Database initialization completed.');
    } else {
      console.warn('⚠️ Algumas tabelas podem não ter sido criadas corretamente.');
    }
    
    return true;
  } catch (error) {
    console.error('Erro na inicialização do banco:', error.message);
    
    // Tenta continuar mesmo com erro de sync
    console.log('⚠️ Continuando sem sync completo...');
    return true;
  }
};

// Inicialização assíncrona
(async () => {
  try {
    // Testa conexão do pool
    await testConnection();
    
    // Inicializa Sequelize
    const dbInitialized = await initializeDatabase();
    
    if (dbInitialized) {
      const PORT = process.env.PORT || 3001;
      const server = app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}...`);
      });
      
      // Graceful shutdown
      process.on('SIGTERM', async () => {
        console.log('SIGTERM recebido, fechando servidor...');
        server.close(async () => {
          await db.sequelize.close();
          await pool.end();
          process.exit(0);
        });
      });
      
      process.on('SIGINT', async () => {
        console.log('SIGINT recebido, fechando servidor...');
        server.close(async () => {
          await db.sequelize.close();
          await pool.end();
          process.exit(0);
        });
      });
    } else {
      console.error('Falha na inicialização do banco de dados');
      process.exit(1);
    }
  } catch (error) {
    console.error('Erro fatal na inicialização:', error);
    process.exit(1);
  }
})();

  module.exports = app;