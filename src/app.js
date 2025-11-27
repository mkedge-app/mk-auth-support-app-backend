import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
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
      contentSecurityPolicy: false, // Desabilita apenas se necessário para o app
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
  }

  routes() {
    this.app.use(routes);

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
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
