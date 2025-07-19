/**
 * Serviço para cálculo de distância e taxa de entrega
 * Integração com Google Routes API e fallback para cálculo Haversine
 */

interface Coordinates {
  lat: number;
  lng: number;
}

interface DistanceResult {
  distance: number; // em metros
  duration: number; // em segundos
  success: boolean;
  method: 'routes_api' | 'haversine' | 'cached';
  error?: string;
}

interface CacheEntry {
  result: DistanceResult;
  timestamp: number;
  expiresIn: number; // em milissegundos
}

class DistanceService {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas
  private readonly API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  /**
   * Calcula distância entre dois pontos usando Routes API com fallback
   */
  async calculateDistance(
    origin: string | Coordinates,
    destination: string | Coordinates
  ): Promise<DistanceResult> {
    try {
      // Verificar cache primeiro
      const cacheKey = this.generateCacheKey(origin, destination);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return { ...cached, method: 'cached' };
      }

      // Tentar Routes API primeiro
      const routesResult = await this.calculateWithRoutesAPI(origin, destination);
      if (routesResult.success) {
        this.saveToCache(cacheKey, routesResult);
        return routesResult;
      }

      // Fallback para Haversine se Routes API falhar
      console.warn('Routes API falhou, usando fallback Haversine:', routesResult.error);
      const haversineResult = await this.calculateWithHaversine(origin, destination);
      
      // Cache o resultado do fallback por menos tempo
      this.saveToCache(cacheKey, haversineResult, 60 * 60 * 1000); // 1 hora
      return haversineResult;

    } catch (error) {
      console.error('Erro no cálculo de distância:', error);
      return {
        distance: 0,
        duration: 0,
        success: false,
        method: 'haversine',
        error: 'Erro interno no cálculo de distância'
      };
    }
  }

  /**
   * Calcula distância usando Google Routes API
   */
  private async calculateWithRoutesAPI(
    origin: string | Coordinates,
    destination: string | Coordinates
  ): Promise<DistanceResult> {
    try {
      if (!this.API_KEY) {
        throw new Error('Google Maps API Key não configurada');
      }

      const requestBody = {
        origins: [this.formatLocation(origin)],
        destinations: [this.formatLocation(destination)],
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        units: 'METRIC'
      };

      console.log('🚗 Calculando distância via Routes API:', {
        origin: typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`,
        destination: typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`
      });

      const response = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.API_KEY,
          'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Routes API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📊 Resposta Routes API:', data);

      if (data.length > 0 && data[0].distanceMeters && data[0].duration) {
        const result = {
          distance: data[0].distanceMeters,
          duration: parseInt(data[0].duration.replace('s', '')),
          success: true,
          method: 'routes_api' as const
        };

        console.log('✅ Distância calculada via Routes API:', {
          distance: `${(result.distance / 1000).toFixed(2)} km`,
          duration: `${Math.round(result.duration / 60)} min`
        });

        return result;
      } else {
        throw new Error('Resposta inválida da Routes API');
      }

    } catch (error) {
      console.error('❌ Erro na Routes API:', error);
      return {
        distance: 0,
        duration: 0,
        success: false,
        method: 'routes_api',
        error: error instanceof Error ? error.message : 'Erro desconhecido na Routes API'
      };
    }
  }

  /**
   * Calcula distância usando fórmula Haversine (fallback)
   */
  private async calculateWithHaversine(
    origin: string | Coordinates,
    destination: string | Coordinates
  ): Promise<DistanceResult> {
    try {
      const originCoords = await this.getCoordinates(origin);
      const destCoords = await this.getCoordinates(destination);

      if (!originCoords || !destCoords) {
        throw new Error('Não foi possível obter coordenadas');
      }

      const distance = this.haversineDistance(originCoords, destCoords);
      
      // Aplicar fator de correção para aproximar distância real (+35%)
      const realDistance = Math.round(distance * 1.35);
      
      // Estimar duração baseada na velocidade média urbana (25 km/h)
      const duration = Math.round((realDistance / 1000) * 60 * 60 / 25);

      console.log('📐 Distância calculada via Haversine:', {
        distance: `${(realDistance / 1000).toFixed(2)} km`,
        duration: `${Math.round(duration / 60)} min`,
        note: 'Distância em linha reta + 35% de correção'
      });

      return {
        distance: realDistance,
        duration,
        success: true,
        method: 'haversine'
      };

    } catch (error) {
      console.error('❌ Erro no cálculo Haversine:', error);
      return {
        distance: 0,
        duration: 0,
        success: false,
        method: 'haversine',
        error: error instanceof Error ? error.message : 'Erro no cálculo Haversine'
      };
    }
  }

  /**
   * Obtém coordenadas de um endereço usando ViaCEP ou Geocoding API
   */
  private async getCoordinates(location: string | Coordinates): Promise<Coordinates | null> {
    if (typeof location === 'object') {
      return location;
    }

    // Se for CEP, usar ViaCEP primeiro
    const cepRegex = /^\d{5}-?\d{3}$/;
    if (cepRegex.test(location.replace(/\D/g, ''))) {
      try {
        const cep = location.replace(/\D/g, '');
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        
        if (!data.erro && data.logradouro) {
          // ViaCEP não retorna coordenadas, usar Geocoding API
          const address = `${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf}, Brasil`;
          return await this.geocodeAddress(address);
        }
      } catch (error) {
        console.warn('Erro ao consultar ViaCEP:', error);
      }
    }

    // Usar Geocoding API para endereços
    return await this.geocodeAddress(location);
  }

  /**
   * Geocodifica endereço usando Google Geocoding API
   */
  private async geocodeAddress(address: string): Promise<Coordinates | null> {
    try {
      if (!this.API_KEY) {
        throw new Error('Google Maps API Key não configurada');
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.API_KEY}`
      );

      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return { lat: location.lat, lng: location.lng };
      }

      throw new Error(`Geocoding failed: ${data.status}`);
    } catch (error) {
      console.error('Erro na geocodificação:', error);
      return null;
    }
  }

  /**
   * Calcula distância usando fórmula Haversine
   */
  private haversineDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371000; // Raio da Terra em metros
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLng = this.toRadians(coord2.lng - coord1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(coord1.lat)) * Math.cos(this.toRadians(coord2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Formata localização para a API
   */
  private formatLocation(location: string | Coordinates) {
    if (typeof location === 'string') {
      return { address: location };
    } else {
      return { location: { latLng: { latitude: location.lat, longitude: location.lng } } };
    }
  }

  /**
   * Gera chave para cache
   */
  private generateCacheKey(origin: string | Coordinates, destination: string | Coordinates): string {
    const originStr = typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`;
    const destStr = typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`;
    return `${originStr}|${destStr}`;
  }

  /**
   * Recupera resultado do cache
   */
  private getFromCache(key: string): DistanceResult | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() < entry.timestamp + entry.expiresIn) {
      console.log('📦 Usando resultado do cache');
      return entry.result;
    }
    
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Salva resultado no cache
   */
  private saveToCache(key: string, result: DistanceResult, customDuration?: number): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      expiresIn: customDuration || this.CACHE_DURATION
    });
  }

  /**
   * Limpa cache expirado
   */
  public clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.timestamp + entry.expiresIn) {
        this.cache.delete(key);
      }
    }
  }
}

// Instância singleton
export const distanceService = new DistanceService();
export type { DistanceResult, Coordinates };
