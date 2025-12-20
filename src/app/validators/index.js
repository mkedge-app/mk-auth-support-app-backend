import { body, param, query } from 'express-validator';

/**
 * Validações para ClientController
 */
export const clientValidations = {
  /**
   * Validação para atualização de cliente
   */
  update: [
    param('id')
      .notEmpty()
      .withMessage('ID do cliente é obrigatório'),
    
    body('email')
      .optional()
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail(),
    
    body('celular')
      .optional()
      .matches(/^\d{10,11}$/)
      .withMessage('Celular deve conter 10 ou 11 dígitos'),
    
    body('fone')
      .optional()
      .matches(/^\d{10,11}$/)
      .withMessage('Telefone deve conter 10 ou 11 dígitos'),
    
    body('latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude inválida'),
    
    body('longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude inválida'),
    
    body('numero_res')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 10 })
      .withMessage('Número deve ter no máximo 10 caracteres'),
    
    body('complemento_res')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Complemento deve ter no máximo 100 caracteres'),
  ],

  /**
   * Validação para buscar cliente
   */
  show: [
    param('id')
      .notEmpty()
      .withMessage('ID do cliente é obrigatório'),
  ],

  /**
   * Validação para listagem de clientes
   */
  index: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Página deve ser um número inteiro maior que 0'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limite deve ser entre 1 e 100'),
    
    query('search')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Busca deve ter no máximo 100 caracteres'),
  ],
};

/**
 * Validações para RequestController (Chamados)
 */
export const requestValidations = {
  /**
   * Validação para criar chamado
   */
  store: [
    body('login')
      .notEmpty()
      .withMessage('Login do cliente é obrigatório')
      .isString()
      .trim(),
    
    body('assunto')
      .notEmpty()
      .withMessage('Assunto é obrigatório')
      .isString()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Assunto deve ter no máximo 255 caracteres'),
    
    body('descricao')
      .notEmpty()
      .withMessage('Descrição é obrigatória')
      .isString()
      .trim()
      .isLength({ min: 1, max: 5000 })
      .withMessage('Descrição deve ter entre 1 e 5000 caracteres'),
    
    body('tipo')
      .optional()
      .isIn(['suporte', 'instalacao', 'comercial'])
      .withMessage('Tipo inválido'),
  ],

  /**
   * Validação para atualizar chamado
   */
  update: [
    param('id')
      .notEmpty()
      .isInt()
      .withMessage('ID do chamado deve ser um número'),
    
    body('status')
      .optional()
      .isIn(['aberto', 'em_andamento', 'aguardando', 'resolvido', 'fechado'])
      .withMessage('Status inválido'),
    
    body('resposta')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Resposta deve ter no máximo 5000 caracteres'),
  ],
};

/**
 * Validações para SessionController (Login)
 */
export const sessionValidations = {
  store: [
    body('login')
      .notEmpty()
      .withMessage('Login é obrigatório')
      .isString()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Login deve ter no máximo 100 caracteres'),
    
    body('senha')
      .notEmpty()
      .withMessage('Senha é obrigatória')
      .isString()
      .isLength({ min: 6, max: 100 })
      .withMessage('Senha deve ter entre 6 e 100 caracteres'),
  ],
};

/**
 * Validações para AdminSessionController (Login Admin)
 */
export const adminSessionValidations = {
  store: [
    body('username')
      .notEmpty()
      .withMessage('Usuário é obrigatório')
      .isString()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Usuário deve ter entre 3 e 100 caracteres'),

    body('password')
      .notEmpty()
      .withMessage('Senha é obrigatória')
      .isString()
      .isLength({ min: 6 })
      .withMessage('Senha deve ter no mínimo 6 caracteres'),
  ],
};
