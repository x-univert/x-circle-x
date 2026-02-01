import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCircleInfo, getAllContracts, getActiveContracts, getPeripheralIndex, getMyContract } from '../services/circleOfLifeService';
import { getAllProfilesWithAddresses, PostalAddress, geocodeAddress } from '../services/profileService';
import { CIRCLE_OF_LIFE_ADDRESS } from '../config/contracts';
import { explorerUrl } from '../config';

// Helper to get explorer link for an address
const getExplorerLink = (address: string) => `${explorerUrl}/accounts/${address}`;

// Interfaces
interface PeripheralContract {
  address: string;
  index: number;
  isActive: boolean;
  location: {
    city: string;
    country: string;
    lat: number;
    lng: number;
  };
}

interface MemberProfile {
  address: string;
  displayName: string;
  postalAddress: PostalAddress;
  avatarUrl?: string;
  peripheralIndex?: number; // SC périphérique auquel le membre est rattaché (1-based)
  memberContract?: string; // Adresse du SC périphérique du membre
}

interface CircleStats {
  totalMembers: number;
  activeMembers: number;
  peripheralCount: number;
  activePeripheralCount: number;
}

// Default locations for SCs with coordinates
// NOTE: Ces villes sont assignées par défaut aux SC périphériques dans l'ordre de déploiement.
// Dans une version future, chaque SC pourrait avoir sa propre localisation configurée on-chain
// basée sur la localisation géographique majoritaire de ses membres.
// Pour l'instant: SC1=Amsterdam, SC2=Barcelona, SC3=Vienna, SC4=Paris, etc.
const DEFAULT_SC_LOCATIONS = [
  { city: 'Geneva', country: 'Switzerland', lat: 46.2044, lng: 6.1432 }, // SC0 - Centre (Siège)
  { city: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041 }, // SC1
  { city: 'Barcelona', country: 'Spain', lat: 41.3851, lng: 2.1734 }, // SC2
  { city: 'Vienna', country: 'Austria', lat: 48.2082, lng: 16.3738 }, // SC3
  { city: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 }, // SC4
  { city: 'Berlin', country: 'Germany', lat: 52.5200, lng: 13.4050 }, // SC5
  { city: 'Rome', country: 'Italy', lat: 41.9028, lng: 12.4964 }, // SC6
  { city: 'Madrid', country: 'Spain', lat: 40.4168, lng: -3.7038 }, // SC7
  { city: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 }, // SC8
  { city: 'Brussels', country: 'Belgium', lat: 50.8503, lng: 4.3517 }, // SC9
  { city: 'Prague', country: 'Czech Republic', lat: 50.0755, lng: 14.4378 }, // SC10
  { city: 'Warsaw', country: 'Poland', lat: 52.2297, lng: 21.0122 }, // SC11
  { city: 'Lisbon', country: 'Portugal', lat: 38.7223, lng: -9.1393 }, // SC12
];

// SC0 location (center)
const SC0_LOCATION = DEFAULT_SC_LOCATIONS[0];

function SatelliteMap() {
  const { t } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CircleStats>({
    totalMembers: 0,
    activeMembers: 0,
    peripheralCount: 0,
    activePeripheralCount: 0
  });
  const [peripheralContracts, setPeripheralContracts] = useState<PeripheralContract[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<MemberProfile[]>([]);

  // Fetch data from smart contracts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch circle info
        const circleInfo = await getCircleInfo();

        // Fetch all contracts and active contracts
        const allContracts = await getAllContracts();
        const activeContracts = await getActiveContracts();

        // Create peripheral contracts list with locations
        const peripherals: PeripheralContract[] = allContracts.map((addr, index) => ({
          address: addr,
          index: index + 1,
          isActive: activeContracts.includes(addr),
          location: DEFAULT_SC_LOCATIONS[(index + 1) % DEFAULT_SC_LOCATIONS.length] || DEFAULT_SC_LOCATIONS[1]
        }));

        // Get member profiles with addresses
        const profiles = getAllProfilesWithAddresses();
        console.log('[SatelliteMap] Raw profiles:', profiles);

        // Geocode profiles and get peripheral index
        const geocodedProfiles = await Promise.all(
          profiles.map(async (profile) => {
            // Get the peripheral index and contract for this member from the smart contract
            let peripheralIndex = 0;
            let memberContract: string | null = null;
            try {
              // First, get the member's contract address
              memberContract = await getMyContract(profile.address);
              console.log('[SatelliteMap] Member contract for', profile.displayName, ':', memberContract);

              // Then get the peripheral index
              peripheralIndex = await getPeripheralIndex(profile.address);
              console.log('[SatelliteMap] Peripheral index for', profile.displayName, ':', peripheralIndex);

              // Debug: if member has contract but index is 0, there might be an issue
              if (memberContract && peripheralIndex === 0) {
                console.warn('[SatelliteMap] WARNING:', profile.displayName, 'has contract', memberContract, 'but peripheral index is 0!');
                // Try to find the contract in the peripheral list to get its index
                const contractIndex = allContracts.findIndex(c => c.toLowerCase() === memberContract?.toLowerCase());
                if (contractIndex >= 0) {
                  peripheralIndex = contractIndex + 1; // 1-based index
                  console.log('[SatelliteMap] Found contract at index', peripheralIndex, 'in allContracts');
                }
              }
            } catch (e) {
              console.error('[SatelliteMap] Error getting peripheral index:', e);
            }

            // If already has coordinates, use them
            if (profile.postalAddress.latitude && profile.postalAddress.longitude) {
              return { ...profile, peripheralIndex, memberContract: memberContract || undefined };
            }

            // Otherwise, try to geocode the city/country
            if (profile.postalAddress.city || profile.postalAddress.country) {
              console.log('[SatelliteMap] Geocoding:', profile.displayName, profile.postalAddress.city, profile.postalAddress.country);
              const coords = await geocodeAddress(
                profile.postalAddress.city,
                profile.postalAddress.country
              );

              if (coords) {
                console.log('[SatelliteMap] Geocoded result:', coords);
                return {
                  ...profile,
                  peripheralIndex,
                  memberContract: memberContract || undefined,
                  postalAddress: {
                    ...profile.postalAddress,
                    latitude: coords.lat,
                    longitude: coords.lng
                  }
                };
              }
            }

            return { ...profile, peripheralIndex, memberContract: memberContract || undefined };
          })
        );

        console.log('[SatelliteMap] Geocoded profiles with peripheral index:', geocodedProfiles);

        setStats({
          totalMembers: circleInfo?.totalMembers || 0,
          activeMembers: circleInfo?.activeMembers || 0,
          peripheralCount: allContracts.length,
          activePeripheralCount: activeContracts.length
        });

        setPeripheralContracts(peripherals);
        setMemberProfiles(geocodedProfiles);

      } catch (error) {
        console.error('Error fetching satellite map data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || loading) return;

    // Don't reinitialize if map already exists
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Create map
    const map = L.map(mapContainerRef.current, {
      center: [SC0_LOCATION.lat, SC0_LOCATION.lng],
      zoom: 5,
      scrollWheelZoom: true
    });

    // Add dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    // SC0 Marker (yellow)
    const sc0Icon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 15px rgba(251, 191, 36, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: #1a1a2e;
        font-size: 12px;
      ">SC0</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    L.marker([SC0_LOCATION.lat, SC0_LOCATION.lng], { icon: sc0Icon })
      .addTo(map)
      .bindPopup(`
        <div style="text-align: center; padding: 8px; min-width: 200px;">
          <strong style="color: #fbbf24; font-size: 16px;">SC0 - Centre</strong><br/>
          <span style="color: #666;">${SC0_LOCATION.city}, ${SC0_LOCATION.country}</span><br/>
          <a href="${getExplorerLink(CIRCLE_OF_LIFE_ADDRESS)}" target="_blank" rel="noopener noreferrer"
             style="font-size: 10px; color: #60a5fa; text-decoration: underline; word-break: break-all;">
            ${CIRCLE_OF_LIFE_ADDRESS.slice(0, 25)}...
          </a>
        </div>
      `);

    // Peripheral SC Markers
    peripheralContracts.forEach((sc) => {
      const scIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: 32px;
          height: 32px;
          background: ${sc.isActive ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #6b7280, #4b5563)'};
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 10px ${sc.isActive ? 'rgba(34, 197, 94, 0.5)' : 'rgba(107, 114, 128, 0.3)'};
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          font-size: 10px;
        ">SC${sc.index}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      L.marker([sc.location.lat, sc.location.lng], { icon: scIcon })
        .addTo(map)
        .bindPopup(`
          <div style="text-align: center; padding: 8px; min-width: 180px;">
            <strong style="color: ${sc.isActive ? '#22c55e' : '#6b7280'}; font-size: 14px;">SC${sc.index}</strong><br/>
            <span style="color: #666;">${sc.location.city}, ${sc.location.country}</span><br/>
            <span style="color: ${sc.isActive ? '#22c55e' : '#ef4444'}; font-size: 12px;">
              ${sc.isActive ? 'Actif' : 'Inactif'}
            </span><br/>
            <a href="${getExplorerLink(sc.address)}" target="_blank" rel="noopener noreferrer"
               style="font-size: 10px; color: #60a5fa; text-decoration: underline; word-break: break-all;">
              ${sc.address.slice(0, 20)}...
            </a>
          </div>
        `);

      // Line from SC0 to peripheral SC
      L.polyline(
        [[SC0_LOCATION.lat, SC0_LOCATION.lng], [sc.location.lat, sc.location.lng]],
        {
          color: sc.isActive ? '#22c55e' : '#6b7280',
          weight: 2,
          opacity: 0.6,
          dashArray: sc.isActive ? undefined : '5, 10'
        }
      ).addTo(map);
    });

    // Member Markers
    console.log('[SatelliteMap] Creating member markers for:', memberProfiles.length, 'profiles');
    memberProfiles.forEach((member) => {
      console.log('[SatelliteMap] Member:', member.displayName, 'lat:', member.postalAddress.latitude, 'lng:', member.postalAddress.longitude);
      if (!member.postalAddress.latitude || !member.postalAddress.longitude) {
        console.log('[SatelliteMap] Skipping member (no coords):', member.displayName);
        return;
      }

      const memberIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 8px rgba(236, 72, 153, 0.4);
        "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      console.log('[SatelliteMap] Adding marker for:', member.displayName, 'at', member.postalAddress.latitude, member.postalAddress.longitude, 'peripheral:', member.peripheralIndex);

      // Find the assigned peripheral SC for this member (from smart contract)
      // peripheralIndex is 1-based (SC1, SC2, etc.), array index is 0-based
      const assignedSC = member.peripheralIndex && member.peripheralIndex > 0
        ? peripheralContracts.find(sc => sc.index === member.peripheralIndex)
        : null;

      // If no assigned SC, fall back to SC0 (center)
      const connectedSC = assignedSC || null;

      L.marker([member.postalAddress.latitude, member.postalAddress.longitude], { icon: memberIcon })
        .addTo(map)
        .bindPopup(`
          <div style="text-align: center; padding: 8px; min-width: 200px;">
            <strong style="color: #ec4899; font-size: 14px;">${member.displayName}</strong><br/>
            <span style="color: #666;">${member.postalAddress.city || ''}${member.postalAddress.country ? ', ' + member.postalAddress.country : ''}</span><br/>
            ${member.peripheralIndex && member.peripheralIndex > 0
              ? `<span style="color: #22c55e; font-size: 12px; font-weight: bold;">
                  Rattache a SC${member.peripheralIndex}
                  ${connectedSC ? ` (${connectedSC.location.city})` : ''}
                </span><br/>`
              : `<span style="color: #fbbf24; font-size: 11px;">Rattache a SC0 (Centre)</span><br/>`
            }
            <a href="${getExplorerLink(member.address)}" target="_blank" rel="noopener noreferrer"
               style="font-size: 10px; color: #60a5fa; text-decoration: underline; word-break: break-all;">
              ${member.address.slice(0, 20)}...
            </a>
          </div>
        `);

      // Draw line from member to their assigned SC
      if (connectedSC) {
        // Line to peripheral SC
        L.polyline(
          [[member.postalAddress.latitude, member.postalAddress.longitude], [connectedSC.location.lat, connectedSC.location.lng]],
          {
            color: '#ec4899',
            weight: 2,
            opacity: 0.6,
            dashArray: '4, 8'
          }
        ).addTo(map);
      } else {
        // Line to SC0 (center) if not assigned to any peripheral SC
        L.polyline(
          [[member.postalAddress.latitude, member.postalAddress.longitude], [SC0_LOCATION.lat, SC0_LOCATION.lng]],
          {
            color: '#fbbf24',
            weight: 2,
            opacity: 0.5,
            dashArray: '4, 8'
          }
        ).addTo(map);
      }
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [loading, peripheralContracts, memberProfiles]);

  return (
    <div className="min-h-screen satellite-map-page">
      {/* Header */}
      <div className="bg-secondary/50 backdrop-blur-sm border-b border-white/10 p-4">
        <h1 className="text-2xl font-bold text-primary text-center">
          {t('satelliteMap.title', 'Carte Satellite X-CIRCLE-X')}
        </h1>
        <p className="text-secondary text-center text-sm mt-1">
          {t('satelliteMap.subtitle', 'Vue globale du reseau Circle of Life')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-secondary/50 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
            <p className="text-2xl font-bold text-yellow-400">{stats.totalMembers}</p>
            <p className="text-secondary text-xs">{t('satelliteMap.totalMembers', 'Membres Total')}</p>
          </div>
          <div className="bg-secondary/50 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
            <p className="text-2xl font-bold text-green-400">{stats.activeMembers}</p>
            <p className="text-secondary text-xs">{t('satelliteMap.activeMembers', 'Membres Actifs')}</p>
          </div>
          <div className="bg-secondary/50 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
            <p className="text-2xl font-bold text-pink-400">{stats.peripheralCount}</p>
            <p className="text-secondary text-xs">{t('satelliteMap.peripheralSCs', 'SC Peripheriques')}</p>
          </div>
          <div className="bg-secondary/50 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
            <p className="text-2xl font-bold text-purple-400">
              {memberProfiles.filter(m => m.postalAddress.latitude && m.postalAddress.longitude).length}
            </p>
            <p className="text-secondary text-xs">{t('satelliteMap.profilesOnMap', 'Profils sur la carte')}</p>
          </div>
        </div>

        {/* Interactive Map */}
        <div className="rounded-xl overflow-hidden border border-white/10 mb-4" style={{ height: '500px' }}>
          {loading ? (
            <div className="h-full bg-secondary/50 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-secondary">{t('common.loading', 'Chargement...')}</p>
              </div>
            </div>
          ) : (
            <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
          )}
        </div>

        {/* SC0 Info Card */}
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-500/30 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 border-2 border-yellow-300 flex items-center justify-center text-black font-bold">
              SC0
            </div>
            <div>
              <h3 className="text-yellow-400 font-bold text-lg">Circle of Life Center</h3>
              <p className="text-secondary text-sm">{SC0_LOCATION.city}, {SC0_LOCATION.country}</p>
            </div>
          </div>
          <a
            href={getExplorerLink(CIRCLE_OF_LIFE_ADDRESS)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary text-sm break-all hover:text-yellow-400 transition block"
          >
            <code className="text-xs text-yellow-400 hover:underline">{CIRCLE_OF_LIFE_ADDRESS}</code>
          </a>
        </div>

        {/* Peripheral SCs List */}
        {!loading && (
          <div className="mb-4">
            <h3 className="text-primary font-semibold mb-3">{t('satelliteMap.peripheralSCs', 'SC Peripheriques')}</h3>
            {peripheralContracts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {peripheralContracts.map((sc) => (
                  <div
                    key={sc.address}
                    className={`bg-secondary/50 backdrop-blur-sm rounded-xl p-3 border ${
                      sc.isActive ? 'border-green-500/30' : 'border-gray-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        sc.isActive
                          ? 'bg-gradient-to-br from-green-500 to-green-600'
                          : 'bg-gradient-to-br from-gray-500 to-gray-600'
                      }`}>
                        SC{sc.index}
                      </div>
                      <div>
                        <p className={`font-semibold ${sc.isActive ? 'text-green-400' : 'text-gray-400'}`}>
                          {sc.location?.city || `SC${sc.index}`}
                        </p>
                        <p className="text-secondary text-xs">
                          {sc.location?.country || 'Unknown'} - {sc.isActive ? 'Actif' : 'Inactif'}
                        </p>
                      </div>
                    </div>
                    <a
                      href={getExplorerLink(sc.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-secondary break-all hover:text-blue-400 transition block"
                    >
                      <code className="hover:underline">{sc.address.slice(0, 30)}...</code>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-secondary/30 rounded-xl p-6 text-center border border-white/10">
                <p className="text-secondary">Aucun SC peripherique</p>
              </div>
            )}
          </div>
        )}

        {/* Members List */}
        {!loading && (
          <div className="mb-4">
            <h3 className="text-primary font-semibold mb-3">{t('satelliteMap.members', 'Membres sur la carte')}</h3>
            {memberProfiles.filter(m => m.postalAddress.latitude && m.postalAddress.longitude).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {memberProfiles
                  .filter(m => m.postalAddress.latitude && m.postalAddress.longitude)
                  .map((member) => {
                    const assignedSC = member.peripheralIndex && member.peripheralIndex > 0
                      ? peripheralContracts.find(sc => sc.index === member.peripheralIndex)
                      : null;

                    return (
                      <div
                        key={member.address}
                        className="bg-secondary/50 backdrop-blur-sm rounded-xl p-3 border border-pink-500/30"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={member.displayName}
                              className="w-10 h-10 rounded-full object-cover border-2 border-pink-500"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 border-2 border-white flex items-center justify-center text-white font-bold text-sm">
                              {member.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-semibold text-pink-400">{member.displayName}</p>
                            <p className="text-secondary text-xs">
                              {member.postalAddress.city || ''}{member.postalAddress.country ? `, ${member.postalAddress.country}` : ''}
                            </p>
                          </div>
                          {/* SC Badge */}
                          <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                            member.peripheralIndex && member.peripheralIndex > 0
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            {member.peripheralIndex && member.peripheralIndex > 0
                              ? `SC${member.peripheralIndex}`
                              : 'SC0'
                            }
                          </div>
                        </div>
                        {assignedSC && (
                          <p className="text-xs text-green-400 mb-1">
                            Rattache a SC{member.peripheralIndex} ({assignedSC.location.city})
                          </p>
                        )}
                        {(!member.peripheralIndex || member.peripheralIndex === 0) && (
                          <p className="text-xs text-yellow-400 mb-1">
                            Rattache a SC0 (Centre)
                            {member.memberContract && (
                              <span className="text-red-400"> (a un contrat mais index=0!)</span>
                            )}
                          </p>
                        )}
                        {member.memberContract && (
                          <p className="text-xs text-blue-400 mb-1 truncate" title={member.memberContract}>
                            SC: {member.memberContract.slice(0, 20)}...
                          </p>
                        )}
                        <a
                          href={getExplorerLink(member.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-secondary break-all hover:text-pink-400 transition block"
                        >
                          <code className="hover:underline">{member.address.slice(0, 30)}...</code>
                        </a>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="bg-secondary/30 rounded-xl p-6 text-center border border-white/10">
                <p className="text-secondary">{t('satelliteMap.noMembers', 'Aucun membre avec adresse postale')}</p>
                <p className="text-secondary text-xs mt-2">
                  {t('satelliteMap.addAddress', 'Les membres peuvent ajouter leur ville dans leur profil pour apparaitre sur la carte')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 bg-secondary/50 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <h3 className="text-primary font-semibold mb-3">{t('satelliteMap.legend', 'Legende')}</h3>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 border-2 border-white"></div>
              <span className="text-secondary text-sm">SC0 - Centre</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-500 to-green-600 border-2 border-white"></div>
              <span className="text-secondary text-sm">SC Peripherique Actif</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 border-2 border-white"></div>
              <span className="text-secondary text-sm">SC Peripherique Inactif</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 border-2 border-white"></div>
              <span className="text-secondary text-sm">Membre</span>
            </div>
          </div>

          {/* Lines Legend */}
          <div className="flex flex-wrap gap-4 mb-4 pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-green-500"></div>
              <span className="text-secondary text-sm">Connexion SC0 ↔ SC actif</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-gray-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #6b7280 0, #6b7280 5px, transparent 5px, transparent 10px)' }}></div>
              <span className="text-secondary text-sm">Connexion SC0 ↔ SC inactif</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-pink-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #ec4899 0, #ec4899 4px, transparent 4px, transparent 8px)' }}></div>
              <span className="text-secondary text-sm">Membre → SC peripherique rattache</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-yellow-500" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #fbbf24 0, #fbbf24 4px, transparent 4px, transparent 8px)' }}></div>
              <span className="text-secondary text-sm">Membre → SC0 (Centre)</span>
            </div>
          </div>

          {/* Info about SC locations */}
          <div className="pt-3 border-t border-white/10">
            <p className="text-xs text-secondary">
              <span className="text-yellow-400">Info:</span> Les SC peripheriques sont assignes a des villes europeennes par defaut (Amsterdam, Barcelona, Vienna, Paris...).
              Chaque membre est relie au SC peripherique auquel il est <span className="text-green-400">rattache dans le smart contract</span>.
              Les membres sans SC peripherique sont relies au <span className="text-yellow-400">SC0 (Centre)</span>.
              Cliquez sur une adresse pour voir les details sur l'Explorer MultiversX.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SatelliteMap;
