import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import path from 'path';
import routes from './routes';

import './database';

class App {
  constructor() {
    this.app = express();
    this.server = http.Server(this.app);

    this.middlewares();
    this.routes();
  }

  middlewares() {
    // Security Headers
    this.app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginOpenerPolicy: false, // Desabilita COOP para evitar avisos em HTTP
      crossOriginResourcePolicy: false, // Desabilita CORP para evitar avisos em HTTP
      originAgentCluster: false, // Desabilita Origin-Agent-Cluster
    }));

    // CORS configurado
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
    this.app.use(cors({
      origin: (origin, callback) => {
        // Permite requisições sem origin (mobile apps, Postman)
        if (!origin) return callback(null, true);
        
        // Se * está na lista, permite qualquer origem
        if (allowedOrigins.includes('*')) return callback(null, true);
        
        // Verifica se a origin está na lista de permitidas
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      optionsSuccessStatus: 200,
    }));

    // Configurar trust proxy para funcionar atrás do Apache
    this.app.set('trust proxy', 1);

    // Rate Limiting Global
    const globalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 1000, // Máximo 1000 requisições por IP
      message: 'Muitas requisições deste IP, tente novamente em 15 minutos',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(globalLimiter);

    // Rate Limiting específico para login (mais restritivo)
    const loginLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 10, // Máximo 10 tentativas de login
      message: 'Muitas tentativas de login, tente novamente em 15 minutos',
      skipSuccessfulRequests: true, // Não conta requisições bem-sucedidas
    });
    this.app.use('/sessions', loginLimiter);

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Desabilita header X-Powered-By
    this.app.disable('x-powered-by');

    // Serve arquivos estáticos (Landing Page, Admin, Portal)
    this.app.use(express.static(path.join(__dirname, '..', 'public')));
  }

  routes() {
    // Serve arquivos estáticos primeiro (antes das rotas de API)
    // Já configurado em middlewares()
    
    // Ignora favicon.ico para evitar erro 401
    this.app.get('/favicon.ico', (req, res) => {
      res.status(204).end();
    });
    
    // Redireciona /admin para /admin/login.html
    this.app.get('/admin', (req, res) => {
      res.redirect('/admin/login.html');
    });
    
    // Redireciona /portal para /portal/index.html  
    this.app.get('/portal', (req, res) => {
      res.redirect('/portal/index.html');
    });
    
    // Rotas da API (com ou sem /api)
    this.app.use(routes);

    // 404 handler para rotas de API
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({ error: 'API endpoint not found' });
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'Origin not allowed by CORS policy' });
      }
      
      // Log apenas em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.error('Error:', err);
      }
      
      return res.status(500).json({ 
        error: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : err.message 
      });
    });
  }
}

export default new App().server;
