import 'dotenv/config';
import fetch from 'node-fetch';

async function calcularDistancia(cepOrigem, cepDestino) {
  try {
    console.log(`Calculando distância entre CEP ${cepOrigem} e CEP ${cepDestino}`);

    // Obter a chave da API do Google Maps
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      throw new Error('Chave da API Google Maps não configurada');
    }

    // 1. Obter coordenadas do CEP de origem usando Geocoding API
    console.log(`Obtendo coordenadas do CEP de origem: ${cepOrigem}`);
    const origemResponse = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${cepOrigem}&region=br&key=${apiKey}`
    );
    const origemData = await origemResponse.json();

    if (origemData.status !== 'OK') {
      console.error('Erro ao geocodificar CEP de origem:', origemData);
      throw new Error(`Erro ao geocodificar CEP de origem: ${origemData.status}`);
    }

    const origemCoords = origemData.results[0].geometry.location;
    console.log('Coordenadas de origem:', origemCoords);
    console.log('Endereço de origem:', origemData.results[0].formatted_address);

    // 2. Obter coordenadas do CEP de destino usando Geocoding API
    console.log(`Obtendo coordenadas do CEP de destino: ${cepDestino}`);
    const destinoResponse = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${cepDestino}&region=br&key=${apiKey}`
    );
    const destinoData = await destinoResponse.json();

    if (destinoData.status !== 'OK') {
      console.error('Erro ao geocodificar CEP de destino:', destinoData);
      throw new Error(`Erro ao geocodificar CEP de destino: ${destinoData.status}`);
    }

    const destinoCoords = destinoData.results[0].geometry.location;
    console.log('Coordenadas de destino:', destinoCoords);
    console.log('Endereço de destino:', destinoData.results[0].formatted_address);

    // 3. Calcular a distância usando Distance Matrix API
    console.log('Calculando distância...');
    const distanceResponse = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origemCoords.lat},${origemCoords.lng}&destinations=${destinoCoords.lat},${destinoCoords.lng}&mode=driving&language=pt-BR&key=${apiKey}`
    );
    const distanceData = await distanceResponse.json();

    if (distanceData.status !== 'OK') {
      console.error('Erro ao calcular distância:', distanceData);
      throw new Error(`Erro ao calcular distância: ${distanceData.status}`);
    }

    // Verificar se há resultados válidos
    if (!distanceData.rows[0] || !distanceData.rows[0].elements[0] ||
        distanceData.rows[0].elements[0].status !== 'OK') {
      console.error('Resposta inválida da API Distance Matrix:', distanceData);
      throw new Error('Não foi possível calcular a distância entre os CEPs');
    }

    // Extrair a distância em km e o tempo estimado
    const distanciaMetros = distanceData.rows[0].elements[0].distance.value;
    const distanciaKm = Math.round(distanciaMetros / 100) / 10; // Arredonda para 1 casa decimal
    const tempoEstimado = Math.round(distanceData.rows[0].elements[0].duration.value / 60); // Tempo em minutos

    console.log(`Distância calculada: ${distanciaKm} km (${distanciaMetros} metros)`);
    console.log(`Tempo estimado: ${tempoEstimado} minutos`);
    console.log(`Detalhes da distância: ${JSON.stringify(distanceData.rows[0].elements[0].distance)}`);
    console.log(`Detalhes do tempo: ${JSON.stringify(distanceData.rows[0].elements[0].duration)}`);

    return {
      origem: {
        cep: cepOrigem,
        endereco: origemData.results[0].formatted_address,
        coordenadas: origemCoords
      },
      destino: {
        cep: cepDestino,
        endereco: destinoData.results[0].formatted_address,
        coordenadas: destinoCoords
      },
      distancia: {
        metros: distanciaMetros,
        km: distanciaKm,
        texto: distanceData.rows[0].elements[0].distance.text
      },
      tempo: {
        minutos: tempoEstimado,
        segundos: distanceData.rows[0].elements[0].duration.value,
        texto: distanceData.rows[0].elements[0].duration.text
      }
    };
  } catch (error) {
    console.error(`Erro ao calcular distância: ${error.message}`);
    throw error;
  }
}

// Executar o cálculo
const cepOrigem = '12315331';
const cepDestino = '12316550';

calcularDistancia(cepOrigem, cepDestino)
  .then(resultado => {
    console.log('\nResultado final:');
    console.log(JSON.stringify(resultado, null, 2));
  })
  .catch(error => {
    console.error('Erro:', error);
  });
