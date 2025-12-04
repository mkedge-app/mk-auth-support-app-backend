/**
 * Helper para gerar URLs de mapas estáticos do Google Maps
 */
import SisOpcao from '../models/SisOpcao';

class StaticMapHelper {
  /**
   * Gera URL do Google Static Maps API
   * @param {number} latitude - Latitude da localização
   * @param {number} longitude - Longitude da localização
   * @param {string} apiKey - API Key do Google Maps (opcional, busca no banco se não fornecida)
   * @returns {Promise<string|null>} URL do mapa estático ou null se não houver coordenadas válidas
   */
  static async generateStaticMapUrl(latitude, longitude, apiKey = null) {
    // Validar se latitude e longitude existem e são números válidos
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      return null;
    }

    // Usar API Key fornecida, buscar no banco ou buscar da variável de ambiente
    let key = apiKey || process.env.GOOGLE_MAPS_API_KEY;

    // Se não houver API Key, buscar da tabela sis_opcao
    if (!key) {
      try {
        const opcao = await SisOpcao.findOne({
          where: { nome: 'key_googlemaps' },
          attributes: ['valor'],
          raw: true,
        });
        if (opcao && opcao.valor) {
          key = opcao.valor;
        }
      } catch (error) {
        // Se der erro, continua sem a chave
      }
    }

    // Se ainda não houver API Key, retornar null silenciosamente
    if (!key) {
      return null;
    }

    // Construir URL do Google Static Maps API
    const url = 
      `https://maps.googleapis.com/maps/api/staticmap?` +
      `center=${latitude},${longitude}` +
      `&zoom=15` +
      `&size=600x400` +
      `&markers=color:red%7C${latitude},${longitude}` +
      `&key=${key}`;

    return url;
  }
}

export default StaticMapHelper;
