const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const db = require('./models');
require('dotenv').config();
const { Pool } = require('pg');
const encryptResponse = require('./Middleware/encryption');

const app = express();

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.set('trust proxy', 1);

// Sessão com Postgres — criar tabela se faltar (produção inclusive)
app.use(session({
  name: 'sid',
  store: new pgSession({
    conString: process.env.POSTGRES_URL,
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  },
  proxy: true
}));

// Body parser global, exceto webhook
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook') return next();
  return express.json()(req, res, next);
});

// Webhook
const webhookRouter = require('./routes/webhook');
app.use('/webhook', webhookRouter);

// Criptografia
app.use(encryptResponse);

// Rotas
const authRouter = require('./routes/auth');
const modelsRouter = require('./routes/models');
const contentRouter = require('./routes/content');
const reportsRouter = require('./routes/reports');
const i18nRouter = require('./routes/i18n');
const { router: ageVerificationRouter } = require('./routes/ageVerification');
const purchaseRouter = require('./routes/Purchase');
const billingRouter = require('./routes/Billing');
const commentsRouter = require('./routes/comments');
const likesRouter = require('./routes/likes');
const { router: notificationsRouter } = require('./routes/notifications');
const adminRouter = require('./routes/admin');
const recommendationsRouter = require('./routes/recommendations');

app.use('/auth', authRouter);
app.use('/age-verification', ageVerificationRouter);
app.use('/i18n', i18nRouter);
app.use('/models', modelsRouter);
app.use('/content', contentRouter);
app.use('/reports', reportsRouter);
app.use('/purchase', purchaseRouter);
app.use('/billing', billingRouter);
app.use('/comments', commentsRouter);
app.use('/likes', likesRouter);
app.use('/notifications', notificationsRouter);
app.use('/admin', adminRouter);
app.use('/recommendations', recommendationsRouter);

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Pool PG
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
pool.connect((err, client, done) => {
  if (err) { console.error('Erro ao conectar ao banco de dados:', err); return; }
  console.log('Conexão bem-sucedida ao banco de dados');
  done();
});

// Sequelize — criar tabelas automaticamente (produção incluída)
db.sequelize.authenticate()
  .then(async () => {
    console.log('Conexão Sequelize estabelecida.');
    await db.sequelize.sync({ force: false, alter: false }); // <— cria se não existir
    console.log('Sincronização de modelos concluída.');
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
  })
  .catch(err => {
    console.error('Erro ao conectar ao banco de dados Sequelize:', err);
  });

module.exports = app;
