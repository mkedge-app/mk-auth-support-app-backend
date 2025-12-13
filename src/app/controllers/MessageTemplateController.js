import MessageTemplate from '../schemas/MessageTemplate';

class MessageTemplateController {
  /**
   * Listar todos os templates
   * GET /admin/message-templates
   */
  async index(req, res) {
    try {
      const templates = await MessageTemplate.find().sort({ type: 1 });
      return res.json(templates);
    } catch (error) {
      console.error('❌ Erro ao listar templates:', error);
      return res.status(500).json({ error: 'Erro ao listar templates' });
    }
  }

  /**
   * Criar ou atualizar template
   * POST /admin/message-templates
   */
  async store(req, res) {
    try {
      const {
        type,
        name,
        subject,
        whatsapp_message,
        email_message,
        trigger,
        variables,
      } = req.body;

      // Validações
      if (!type || !name || !whatsapp_message || !trigger) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: type, name, whatsapp_message, trigger' 
        });
      }

      // Atualizar se já existe, criar se não
      const template = await MessageTemplate.findOneAndUpdate(
        { type },
        {
          name,
          subject: subject || '',
          whatsapp_message,
          email_message: email_message || '',
          trigger,
          variables: variables || [],
        },
        { upsert: true, new: true, runValidators: true }
      );

      console.log(`✅ Template "${name}" salvo:`, type);

      return res.json({
        success: true,
        template,
      });
    } catch (error) {
      console.error('❌ Erro ao salvar template:', error);
      return res.status(500).json({ 
        error: 'Erro ao salvar template',
        details: error.message 
      });
    }
  }

  /**
   * Buscar template específico
   * GET /admin/message-templates/:type
   */
  async show(req, res) {
    try {
      const { type } = req.params;
      
      const template = await MessageTemplate.findOne({ type });
      
      if (!template) {
        return res.status(404).json({ error: 'Template não encontrado' });
      }

      return res.json(template);
    } catch (error) {
      console.error('❌ Erro ao buscar template:', error);
      return res.status(500).json({ error: 'Erro ao buscar template' });
    }
  }

  /**
   * Deletar template
   * DELETE /admin/message-templates/:type
   */
  async delete(req, res) {
    try {
      const { type } = req.params;
      
      const template = await MessageTemplate.findOneAndDelete({ type });
      
      if (!template) {
        return res.status(404).json({ error: 'Template não encontrado' });
      }

      console.log(`🗑️ Template deletado: ${type}`);

      return res.json({ 
        success: true,
        message: 'Template deletado com sucesso' 
      });
    } catch (error) {
      console.error('❌ Erro ao deletar template:', error);
      return res.status(500).json({ error: 'Erro ao deletar template' });
    }
  }

  /**
   * Renderizar template com variáveis
   * POST /admin/message-templates/:type/render
   */
  async render(req, res) {
    try {
      const { type } = req.params;
      const variables = req.body;

      const template = await MessageTemplate.findOne({ type });
      
      if (!template) {
        return res.status(404).json({ error: 'Template não encontrado' });
      }

      // Substituir variáveis no template
      let whatsapp = template.whatsapp_message;
      let email = template.email_message;
      let subject = template.subject;

      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        whatsapp = whatsapp.replace(regex, variables[key]);
        email = email.replace(regex, variables[key]);
        subject = subject.replace(regex, variables[key]);
      });

      return res.json({
        subject,
        whatsapp_message: whatsapp,
        email_message: email,
      });
    } catch (error) {
      console.error('❌ Erro ao renderizar template:', error);
      return res.status(500).json({ error: 'Erro ao renderizar template' });
    }
  }
}

export default new MessageTemplateController();
