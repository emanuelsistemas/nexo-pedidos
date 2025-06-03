// Script para testar o cálculo de distância entre dois CEPs usando Google Maps API
const cepOrigem = '12315331';
const cepDestino = '12316550';
const apiKey = 'AIzaSyAYWNXBIfl5d0prbiHdbeV1zsik0MR8gKs'; // Chave da API do arquivo .env

console.log(`Chave API: ${apiKey ? 'Configurada' : 'Não configurada'}`);
console.log(`Calculando distância entre CEP ${cepOrigem} e CEP ${cepDestino}`);

// 1. Obter coordenadas do CEP de origem
async function getOrigemCoords() {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${cepOrigem}&region=br&key=${apiKey}`;
  console.log(`Consultando: ${url}`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Erro ao geocodificar CEP de origem:', data);
      return null;
    }

    const coords = data.results[0].geometry.location;
    const endereco = data.results[0].formatted_address;

    console.log('Coordenadas de origem:', coords);
    console.log('Endereço de origem:', endereco);

    return { coords, endereco };
  } catch (error) {
    console.error('Erro ao obter coordenadas de origem:', error);
    return null;
  }
}

// 2. Obter coordenadas do CEP de destino
async function getDestinoCoords() {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${cepDestino}&region=br&key=${apiKey}`;
  console.log(`Consultando: ${url}`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Erro ao geocodificar CEP de destino:', data);
      return null;
    }

    const coords = data.results[0].geometry.location;
    const endereco = data.results[0].formatted_address;

    console.log('Coordenadas de destino:', coords);
    console.log('Endereço de destino:', endereco);

    return { coords, endereco };
  } catch (error) {
    console.error('Erro ao obter coordenadas de destino:', error);
    return null;
  }
}

// 3. Calcular distância entre os pontos
async function calcularDistancia(origem, destino) {
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origem.coords.lat},${origem.coords.lng}&destinations=${destino.coords.lat},${destino.coords.lng}&mode=driving&language=pt-BR&key=${apiKey}`;
  console.log(`Consultando: ${url}`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Erro ao calcular distância:', data);
      return null;
    }

    const element = data.rows[0].elements[0];

    if (element.status !== 'OK') {
      console.error('Erro no elemento de distância:', element);
      return null;
    }

    const distanciaMetros = element.distance.value;
    const distanciaKm = Math.round(distanciaMetros / 100) / 10; // Arredonda para 1 casa decimal
    const tempoEstimado = Math.round(element.duration.value / 60); // Tempo em minutos

    console.log(`Distância calculada: ${distanciaKm} km (${distanciaMetros} metros)`);
    console.log(`Tempo estimado: ${tempoEstimado} minutos`);
    console.log(`Texto da distância: ${element.distance.text}`);
    console.log(`Texto do tempo: ${element.duration.text}`);

    return {
      distancia: {
        metros: distanciaMetros,
        km: distanciaKm,
        texto: element.distance.text
      },
      tempo: {
        minutos: tempoEstimado,
        segundos: element.duration.value,
        texto: element.duration.text
      }
    };
  } catch (error) {
    console.error('Erro ao calcular distância:', error);
    return null;
  }
}

// Executar o teste
async function executarTeste() {
  try {
    const origem = await getOrigemCoords();
    if (!origem) {
      console.error('Não foi possível obter coordenadas de origem');
      return;
    }

    const destino = await getDestinoCoords();
    if (!destino) {
      console.error('Não foi possível obter coordenadas de destino');
      return;
    }

    const resultado = await calcularDistancia(origem, destino);
    if (!resultado) {
      console.error('Não foi possível calcular a distância');
      return;
    }

    console.log('\nResultado final:');
    console.log(JSON.stringify({
      origem: {
        cep: cepOrigem,
        endereco: origem.endereco,
        coordenadas: origem.coords
      },
      destino: {
        cep: cepDestino,
        endereco: destino.endereco,
        coordenadas: destino.coords
      },
      ...resultado
    }, null, 2));
  } catch (error) {
    console.error('Erro durante a execução do teste:', error);
  }
}

executarTeste();
