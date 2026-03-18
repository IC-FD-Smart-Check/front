import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para ícones do Leaflet em React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  radius?: number; // Raio em metros
  onChange: (latitude: number | undefined, longitude: number | undefined, radius: number | undefined) => void;
  disabled?: boolean;
}

// Componente para capturar cliques no mapa
const MapClickHandler: React.FC<{
  onLocationSelect: (lat: number, lng: number) => void;
}> = ({ onLocationSelect }) => {
  useMapEvents({
    click: (e: L.LeafletMouseEvent) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const LocationPicker: React.FC<LocationPickerProps> = ({
  latitude,
  longitude,
  radius,
  onChange,
  disabled = false,
}) => {
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mapKey, setMapKey] = useState(0); // Para forçar re-render do mapa

  // Posição padrão
  const defaultPosition: [number, number] = [-24.621209, -53.712502];
  const currentPosition: [number, number] = 
    latitude && longitude ? [latitude, longitude] : defaultPosition;

  const handleLocationSelect = (lat: number, lng: number) => {
    if (!disabled) {
      onChange(lat, lng, radius);
    }
  };

  const handleClearLocation = () => {
    onChange(undefined, undefined, undefined);
    setSearchAddress('');
    setSearchError(null);
  };

  // Busca por endereço usando Nominatim (OpenStreetMap)
  const handleSearchAddress = async () => {
    if (!searchAddress.trim()) {
      setSearchError('Digite um endereço para buscar');
      return;
    }

    try {
      setIsSearching(true);
      setSearchError(null);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1`
      );
      
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        onChange(lat, lng, radius);
        setMapKey(prev => prev + 1); // Re-renderiza o mapa para centralizar
      } else {
        setSearchError('Endereço não encontrado. Tente ser mais específico.');
      }
    } catch (error) {
      console.error('Erro ao buscar endereço:', error);
      setSearchError('Erro ao buscar endereço. Tente novamente.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchAddress();
    }
  };

  const handleRadiusChange = (newRadius: number | undefined) => {
    onChange(latitude, longitude, newRadius);
  };

  return (
    <div className="space-y-3">
      {/* Busca por endereço */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Buscar Endereço
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ex: Avenida Paulista, São Paulo"
            disabled={disabled || isSearching}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
          />
          <button
            type="button"
            onClick={handleSearchAddress}
            disabled={disabled || isSearching}
            className="px-4 py-2 bg-[#B7294A] text-white rounded-lg hover:bg-[#9a2139] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
          >
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
        {searchError && (
          <p className="mt-1 text-sm text-red-600">{searchError}</p>
        )}
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          Clique no mapa para selecionar uma localização ou use a busca por endereço acima
        </p>
      </div>

      {/* Campo de Raio */}
      {latitude && longitude && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Raio de Alcance (metros)
          </label>
          <input
            type="number"
            value={radius ?? ''}
            onChange={(e) => handleRadiusChange(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="Ex: 100"
            min="0"
            step="1"
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B7294A] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Define o raio em metros ao redor da localização (opcional)
          </p>
        </div>
      )}

      {/* Mapa */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <MapContainer
          key={mapKey}
          center={currentPosition as L.LatLngExpression}
          zoom={latitude && longitude ? 15 : 14}
          style={{ height: '400px', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {!disabled && (
            <MapClickHandler onLocationSelect={handleLocationSelect} />
          )}
          {latitude && longitude && (
            <>
              <Marker position={[latitude, longitude] as L.LatLngExpression} />
              {radius && radius > 0 && (
                <Circle
                  center={[latitude, longitude] as L.LatLngExpression}
                  radius={radius}
                  pathOptions={{
                    color: '#B7294A',
                    fillColor: '#B7294A',
                    fillOpacity: 0.2,
                  }}
                />
              )}
            </>
          )}
        </MapContainer>
      </div>

      {/* Coordenadas selecionadas */}
      {latitude && longitude ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800 mb-1">
                Localização Selecionada
              </p>
              <p className="text-sm text-green-700">
                Latitude: {latitude.toFixed(6)} | Longitude: {longitude.toFixed(6)}
              </p>
              {radius && radius > 0 && (
                <p className="text-sm text-green-700 mt-1">
                  Raio: {radius} metros
                </p>
              )}
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={handleClearLocation}
                className="text-green-700 hover:text-green-900 text-sm font-medium underline whitespace-nowrap"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-sm text-gray-600">
            Nenhuma localização selecionada
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
