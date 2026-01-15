import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Globe, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { PresenceUser } from '@/hooks/usePresence';

// Fix for default marker icons in leaflet with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icon
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

interface UserLocation {
  userId: string;
  name: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  currentPage: string;
  isAdmin: boolean;
}

interface LocationStats {
  city: string;
  country: string;
  count: number;
  lat: number;
  lng: number;
}

// Map center adjuster component
function MapCenterAdjuster({ locations }: { locations: UserLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(loc => [loc.lat, loc.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }
  }, [locations, map]);

  return null;
}

interface UserLocationMapProps {
  onlineUsers: PresenceUser[];
}

export function UserLocationMap({ onlineUsers }: UserLocationMapProps) {
  const { t } = useTranslation();
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [locationStats, setLocationStats] = useState<LocationStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use a free IP geolocation API
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();

      if (data.error) {
        throw new Error(data.reason || 'Konum alınamadı');
      }

      // For now, show all online users at the same location (current user's location)
      // In production, each user's location would be tracked individually
      const nonAdminUsers = onlineUsers.filter(u => !u.isAdmin);
      
      if (nonAdminUsers.length > 0 && data.latitude && data.longitude) {
        // Create locations with slight offset to show multiple users
        const locations: UserLocation[] = nonAdminUsers.map((user, index) => {
          // Add small random offset to show multiple markers
          const offset = 0.001 * index;
          return {
            userId: user.id,
            name: user.name.charAt(0) + '***' + (user.name.split(' ')[1]?.charAt(0) || ''),
            lat: data.latitude + (Math.random() - 0.5) * offset,
            lng: data.longitude + (Math.random() - 0.5) * offset,
            city: data.city || 'Bilinmiyor',
            country: data.country_name || 'Bilinmiyor',
            currentPage: user.currentPage,
            isAdmin: user.isAdmin,
          };
        });

        setUserLocations(locations);

        // Calculate location stats
        const statsMap: Record<string, LocationStats> = {};
        locations.forEach(loc => {
          const key = `${loc.city}-${loc.country}`;
          if (!statsMap[key]) {
            statsMap[key] = {
              city: loc.city,
              country: loc.country,
              count: 0,
              lat: loc.lat,
              lng: loc.lng,
            };
          }
          statsMap[key].count++;
        });

        setLocationStats(Object.values(statsMap).sort((a, b) => b.count - a.count));
      } else {
        setUserLocations([]);
        setLocationStats([]);
      }
    } catch (err) {
      console.error('Error fetching location:', err);
      setError(t('admin.locationError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (onlineUsers.filter(u => !u.isAdmin).length > 0) {
      fetchLocations();
    } else {
      setUserLocations([]);
      setLocationStats([]);
    }
  }, [onlineUsers.length]);

  const nonAdminUsersCount = onlineUsers.filter(u => !u.isAdmin).length;

  if (nonAdminUsersCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-rose-500" />
            {t('admin.userLocationMap')}
          </CardTitle>
          <CardDescription>
            {t('admin.userLocationMapDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Globe className="h-12 w-12 mb-4 opacity-50" />
            <p>{t('admin.noOnlineUsers')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-rose-500" />
              {t('admin.userLocationMap')}
              <Badge variant="secondary" className="ml-2">
                {nonAdminUsersCount} {t('admin.usersCount')}
              </Badge>
            </CardTitle>
            <CardDescription>
              {t('admin.userLocationMapDesc')}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLocations}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Map */}
          <div className="rounded-lg overflow-hidden border border-border h-[400px]">
            {error ? (
              <div className="flex items-center justify-center h-full bg-muted/20 text-muted-foreground">
                <p>{error}</p>
              </div>
            ) : (
              <MapContainer
                center={[39.9334, 32.8597]} // Default: Ankara, Turkey
                zoom={6}
                className="h-full w-full"
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {userLocations.map((location) => (
                  <Marker
                    key={location.userId}
                    position={[location.lat, location.lng]}
                    icon={createCustomIcon('#10b981')}
                  >
                    <Popup>
                      <div className="p-2 min-w-[150px]">
                        <p className="font-medium">{location.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {location.city}, {location.country}
                        </p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {location.currentPage === '/dashboard' ? t('nav.dashboard') :
                           location.currentPage === '/accounts' ? t('nav.accounts') :
                           location.currentPage === '/cards' ? t('nav.cards') :
                           location.currentPage === '/transactions' ? t('nav.transactions') :
                           location.currentPage === '/settings' ? t('nav.settings') :
                           location.currentPage || '-'}
                        </Badge>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                {userLocations.length > 0 && (
                  <MapCenterAdjuster locations={userLocations} />
                )}
              </MapContainer>
            )}
          </div>

          {/* Location Stats */}
          {locationStats.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {locationStats.map((stat) => (
                <div
                  key={`${stat.city}-${stat.country}`}
                  className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border/50"
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{stat.city}</p>
                    <p className="text-sm text-muted-foreground">{stat.country}</p>
                  </div>
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {stat.count}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
