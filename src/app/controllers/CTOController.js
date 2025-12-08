/* eslint-disable no-await-in-loop */
import { Op } from 'sequelize';

import CTO from '../models/CTO';
import Client from '../models/Client';

class CTOController {
  async index(req, res) {
    try {
      const CTOs = await CTO.findAll({
        where: {
          longitude: {
            [Op.ne]: '',
          },
          capacidade: {
            [Op.gt]: 0, // Apenas CTOs com capacidade > 0
          },
        },
      });

    // Verifica se exitem CTOs
    if (!CTOs) {
      return res.status(204).json({ message: 'No CTOs to be listed' });
    }

    function deg2rad(deg) {
      return deg * (Math.PI / 180);
    }

    function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
      const R = 6371; // Radius of the earth in km
      const dLat = deg2rad(lat2 - lat1); // deg2rad below
      const dLon = deg2rad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) *
          Math.cos(deg2rad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const d = R * c; // Distance in km
      return d;
    }

    const newCTO_array = [];

    // Verifica quantos clientes estão conectados a cada uma das CTOs
    for (let i = 0; i < CTOs.length; i += 1) {
      const d = getDistanceFromLatLonInKm(
        CTOs[i].latitude,
        CTOs[i].longitude,
        req.params.latitude,
        req.params.longitude
      );

      if (d <= 0.35) {
        const connection_amount = await Client.findAll({
          where: {
            caixa_herm: CTOs[i].nome,
            cli_ativado: 's',
          },
        });

        CTOs[i] = {
          id: CTOs[i].id,
          nome: CTOs[i].nome,
          latitude: CTOs[i].latitude,
          longitude: CTOs[i].longitude,
          connection_amount: connection_amount.length,
        };

        newCTO_array.push(CTOs[i]);
      }
    }

    return res.json(newCTO_array);
    } catch (error) {
      console.error('Erro ao buscar CTOs:', error);
      return res.status(500).json({ error: 'Erro ao buscar CTOs' });
    }
  }

  async show(req, res) {
    try {
      const cto = await CTO.findOne({
        where: {
          nome: req.query.cto_name,
        },
      });

    if (!cto) {
      return res.status(204).json({ message: 'No CTOs to be listed' });
    }

    const connection_amount = await Client.findAll({
      where: {
        caixa_herm: cto.nome,
        cli_ativado: 's',
      },
    });

    const cto_obj = {
      id: cto.id,
      nome: cto.nome,
      latitude: cto.latitude,
      longitude: cto.longitude,
      connection_amount: connection_amount.length,
    };

    return res.json(cto_obj);
    } catch (error) {
      console.error('Erro ao buscar CTO:', error);
      return res.status(500).json({ error: 'Erro ao buscar CTO' });
    }
  }

  async map(req, res) {
    const { latitude, longitude } = req.params;
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Buscar CTOs
    const CTOs = await CTO.findAll({
      where: {
        longitude: { [Op.ne]: '' },
        capacidade: { [Op.gt]: 0 }, // Apenas CTOs com capacidade > 0
      },
    });

    function deg2rad(deg) {
      return deg * (Math.PI / 180);
    }

    function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = deg2rad(lat2 - lat1);
      const dLon = deg2rad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) *
          Math.cos(deg2rad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const d = R * c;
      return d;
    }

    // Filtrar CTOs próximas (300 metros = 0.3 km)
    const nearbyCTOs = [];
    for (const cto of CTOs) {
      const d = getDistanceFromLatLonInKm(
        cto.latitude,
        cto.longitude,
        lat,
        lng
      );
      if (d <= 0.3) {
        const clients = await Client.findAll({
          where: {
            caixa_herm: cto.nome,
            cli_ativado: 's',
          },
          attributes: ['nome', 'login', 'coordenadas', 'endereco_res', 'numero_res'],
        });

        nearbyCTOs.push({
          nome: cto.nome,
          latitude: cto.latitude,
          longitude: cto.longitude,
          clients: clients.map(c => ({
            nome: c.nome,
            login: c.login,
            endereco: `${c.endereco_res}, ${c.numero_res}`,
            coordenadas: c.coordenadas,
          })),
        });
      }
    }

    // Gerar HTML com mapa
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mapa de CTOs e Clientes</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        #map { height: 100vh; width: 100%; }
        .info-panel {
            position: absolute;
            top: 10px;
            right: 10px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            max-width: 300px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 1000;
        }
        .info-panel h3 { margin: 0 0 10px 0; color: #333; }
        .cto-item { margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 5px; }
        .cto-name { font-weight: bold; color: #2196F3; margin-bottom: 5px; }
        .client-list { font-size: 12px; color: #666; }
        .stats { background: #e3f2fd; padding: 10px; border-radius: 5px; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div id="map"></div>
    <div class="info-panel">
        <h3>📍 CTOs e Clientes</h3>
        <div class="stats">
            <strong>${nearbyCTOs.length}</strong> CTOs no raio de 300m<br>
            <strong>${nearbyCTOs.reduce((sum, cto) => sum + cto.clients.length, 0)}</strong> Clientes ativos
        </div>
        <div id="cto-list"></div>
    </div>

    <script>
        const map = L.map('map').setView([${lat}, ${lng}], 16);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        // Adicionar círculo de 300m
        L.circle([${lat}, ${lng}], {
            color: 'blue',
            fillColor: '#30f',
            fillOpacity: 0.1,
            radius: 300
        }).addTo(map);

        // Marcador da posição central
        L.marker([${lat}, ${lng}], {
            icon: L.divIcon({
                html: '<div style="background: red; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white;"></div>',
                className: '',
                iconSize: [20, 20]
            })
        }).addTo(map).bindPopup('<b>Você está aqui</b>');

        const ctos = ${JSON.stringify(nearbyCTOs)};
        const ctoListDiv = document.getElementById('cto-list');

        ctos.forEach(cto => {
            // Adicionar marcador CTO no mapa
            const ctoMarker = L.marker([cto.latitude, cto.longitude], {
                icon: L.divIcon({
                    html: '<div style="background: green; color: white; padding: 5px; border-radius: 5px; font-weight: bold; font-size: 10px; text-align: center; min-width: 60px;">' + cto.nome + '</div>',
                    className: '',
                    iconSize: [70, 30]
                })
            }).addTo(map);
            
            let popupContent = '<b>' + cto.nome + '</b><br>' + cto.clients.length + ' clientes';
            ctoMarker.bindPopup(popupContent);

            // Adicionar clientes ao mapa
            cto.clients.forEach(client => {
                if (client.coordenadas) {
                    const coords = client.coordenadas.split(',');
                    if (coords.length === 2) {
                        const cLat = parseFloat(coords[0].trim());
                        const cLng = parseFloat(coords[1].trim());
                        if (cLat && cLng && !isNaN(cLat) && !isNaN(cLng)) {
                            L.circleMarker([cLat, cLng], {
                                radius: 5,
                                fillColor: '#ff7800',
                                color: '#000',
                                weight: 1,
                                opacity: 1,
                                fillOpacity: 0.8
                            }).addTo(map).bindPopup(
                                '<b>' + client.nome + '</b><br>' +
                                'Login: ' + client.login + '<br>' +
                                'CTO: ' + cto.nome + '<br>' +
                                client.endereco
                            );
                        }
                    }
                }
            });

            // Adicionar à lista lateral
            const ctoDiv = document.createElement('div');
            ctoDiv.className = 'cto-item';
            ctoDiv.innerHTML = '<div class="cto-name">' + cto.nome + '</div>' +
                '<div class="client-list">' + cto.clients.length + ' clientes ativos</div>';
            ctoListDiv.appendChild(ctoDiv);
        });
    </script>
</body>
</html>
    `;

    return res.send(html);
  }
}

export default new CTOController();
