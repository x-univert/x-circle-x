/**
 * Helper pour convertir les sélections géographiques en IDs du système
 */

// Mapping des régions vers leurs IDs (1000-1012)
export const REGION_TO_ID: { [key: string]: number } = {
  'Auvergne-Rhône-Alpes': 1000,
  'Bourgogne-Franche-Comté': 1001,
  'Bretagne': 1002,
  'Centre-Val de Loire': 1003,
  'Corse': 1004,
  'Grand Est': 1005,
  'Hauts-de-France': 1006,
  'Île-de-France': 1007,
  'Normandie': 1008,
  'Nouvelle-Aquitaine': 1009,
  'Occitanie': 1010,
  'Pays de la Loire': 1011,
  'Provence-Alpes-Côte d\'Azur': 1012
};

// Mapping des départements vers leurs IDs (2000+)
export const DEPARTEMENT_TO_ID: { [key: string]: number } = {
  '01 - Ain': 2001,
  '02 - Aisne': 2002,
  '03 - Allier': 2003,
  '04 - Alpes-de-Haute-Provence': 2004,
  '05 - Hautes-Alpes': 2005,
  '06 - Alpes-Maritimes': 2006,
  '07 - Ardèche': 2007,
  '08 - Ardennes': 2008,
  '09 - Ariège': 2009,
  '10 - Aube': 2010,
  '11 - Aude': 2011,
  '12 - Aveyron': 2012,
  '13 - Bouches-du-Rhône': 2013,
  '14 - Calvados': 2014,
  '15 - Cantal': 2015,
  '16 - Charente': 2016,
  '17 - Charente-Maritime': 2017,
  '18 - Cher': 2018,
  '19 - Corrèze': 2019,
  '21 - Côte-d\'Or': 2021,
  '22 - Côtes-d\'Armor': 2022,
  '23 - Creuse': 2023,
  '24 - Dordogne': 2024,
  '25 - Doubs': 2025,
  '26 - Drôme': 2026,
  '27 - Eure': 2027,
  '28 - Eure-et-Loir': 2028,
  '29 - Finistère': 2029,
  '30 - Gard': 2030,
  '31 - Haute-Garonne': 2031,
  '32 - Gers': 2032,
  '33 - Gironde': 2033,
  '34 - Hérault': 2034,
  '35 - Ille-et-Vilaine': 2035,
  '36 - Indre': 2036,
  '37 - Indre-et-Loire': 2037,
  '38 - Isère': 2038,
  '39 - Jura': 2039,
  '40 - Landes': 2040,
  '41 - Loir-et-Cher': 2041,
  '42 - Loire': 2042,
  '43 - Haute-Loire': 2043,
  '44 - Loire-Atlantique': 2044,
  '45 - Loiret': 2045,
  '46 - Lot': 2046,
  '47 - Lot-et-Garonne': 2047,
  '48 - Lozère': 2048,
  '49 - Maine-et-Loire': 2049,
  '50 - Manche': 2050,
  '51 - Marne': 2051,
  '52 - Haute-Marne': 2052,
  '53 - Mayenne': 2053,
  '54 - Meurthe-et-Moselle': 2054,
  '55 - Meuse': 2055,
  '56 - Morbihan': 2056,
  '57 - Moselle': 2057,
  '58 - Nièvre': 2058,
  '59 - Nord': 2059,
  '60 - Oise': 2060,
  '61 - Orne': 2061,
  '62 - Pas-de-Calais': 2062,
  '63 - Puy-de-Dôme': 2063,
  '64 - Pyrénées-Atlantiques': 2064,
  '65 - Hautes-Pyrénées': 2065,
  '66 - Pyrénées-Orientales': 2066,
  '67 - Bas-Rhin': 2067,
  '68 - Haut-Rhin': 2068,
  '69 - Rhône': 2069,
  '70 - Haute-Saône': 2070,
  '71 - Saône-et-Loire': 2071,
  '72 - Sarthe': 2072,
  '73 - Savoie': 2073,
  '74 - Haute-Savoie': 2074,
  '75 - Paris': 2075,
  '76 - Seine-Maritime': 2076,
  '77 - Seine-et-Marne': 2077,
  '78 - Yvelines': 2078,
  '79 - Deux-Sèvres': 2079,
  '80 - Somme': 2080,
  '81 - Tarn': 2081,
  '82 - Tarn-et-Garonne': 2082,
  '83 - Var': 2083,
  '84 - Vaucluse': 2084,
  '85 - Vendée': 2085,
  '86 - Vienne': 2086,
  '87 - Haute-Vienne': 2087,
  '88 - Vosges': 2088,
  '89 - Yonne': 2089,
  '90 - Territoire de Belfort': 2090,
  '91 - Essonne': 2091,
  '92 - Hauts-de-Seine': 2092,
  '93 - Seine-Saint-Denis': 2093,
  '94 - Val-de-Marne': 2094,
  '95 - Val-d\'Oise': 2095,
  '2A - Corse-du-Sud': 2096,
  '2B - Haute-Corse': 2097
};

// Mapping des intercommunalités vers leurs IDs (3000+)
export const INTERCOMMUNALITE_TO_ID: { [key: string]: number } = {
  'Métropole du Grand Paris': 3000,
  'Métropole de Lyon': 3001,
  'Métropole Aix-Marseille-Provence': 3002,
  'Toulouse Métropole': 3003,
  'Bordeaux Métropole': 3004,
  'Métropole Européenne de Lille': 3005,
  'Nantes Métropole': 3006,
  'Métropole Nice Côte d\'Azur': 3007,
  'Eurométropole de Strasbourg': 3008,
  'Montpellier Méditerranée Métropole': 3009,
  'CC de l\'Est Lyonnais': 3010,
  'CC des Monts du Lyonnais': 3011,
  'CC Terre de Provence': 3012,
  'CC du Sicoval': 3013,
  'CC des Coteaux du Girou': 3014,
  'CC Médoc Atlantique': 3015,
  'CA de Valenciennes Métropole': 3016,
  'CC d\'Erdre et Gesvres': 3017,
  'CA Cannes Pays de Lérins': 3018,
  'CA de Haguenau': 3019,
  'CA Béziers Méditerranée': 3020
};

// Mapping des communes vers leurs IDs (10000+)
export const COMMUNE_TO_ID: { [key: string]: number } = {
  // Paris
  'Paris 1er': 10001,
  'Paris 2ème': 10002,
  'Paris 3ème': 10003,
  'Paris 4ème': 10004,
  'Paris 5ème': 10005,
  'Paris 6ème': 10006,
  'Paris 7ème': 10007,
  'Paris 8ème': 10008,
  'Paris 9ème': 10009,
  'Paris 10ème': 10010,
  'Paris 11ème': 10011,
  'Paris 12ème': 10012,
  'Paris 13ème': 10013,
  'Paris 14ème': 10014,
  'Paris 15ème': 10015,
  'Paris 16ème': 10016,
  'Paris 17ème': 10017,
  'Paris 18ème': 10018,
  'Paris 19ème': 10019,
  'Paris 20ème': 10020,

  // Métropole de Lyon
  'Lyon': 10021,
  'Villeurbanne': 10022,
  'Vénissieux': 10023,
  'Caluire-et-Cuire': 10024,
  'Vaulx-en-Velin': 10025,
  'Bron': 10026,
  'Oullins': 10027,

  // Bouches-du-Rhône
  'Marseille': 10028,
  'Aix-en-Provence': 10029,
  'Arles': 10030,
  'Martigues': 10031,
  'Aubagne': 10032,
  'Salon-de-Provence': 10033,

  // Haute-Garonne
  'Toulouse': 10034,
  'Colomiers': 10035,
  'Tournefeuille': 10036,
  'Blagnac': 10037,
  'Muret': 10038,

  // Gironde
  'Bordeaux': 10039,
  'Mérignac': 10040,
  'Pessac': 10041,
  'Talence': 10042,
  'Villenave-d\'Ornon': 10043,

  // Nord
  'Lille': 10044,
  'Roubaix': 10045,
  'Tourcoing': 10046,
  'Dunkerque': 10047,
  'Villeneuve-d\'Ascq': 10048,

  // Loire-Atlantique
  'Nantes': 10049,
  'Saint-Nazaire': 10050,
  'Saint-Herblain': 10051,
  'Rezé': 10052,

  // Alpes-Maritimes
  'Nice': 10053,
  'Cannes': 10054,
  'Antibes': 10055,
  'Grasse': 10056,

  // Bas-Rhin
  'Strasbourg': 10057,
  'Haguenau': 10058,
  'Schiltigheim': 10059,

  // Hérault
  'Montpellier': 10060,
  'Béziers': 10061,
  'Sète': 10062,

  // Hauts-de-Seine
  'Boulogne-Billancourt': 10063,
  'Nanterre': 10064,
  'Courbevoie': 10065,
  'Levallois-Perret': 10066,

  // Seine-Saint-Denis
  'Montreuil': 10067,
  'Saint-Denis': 10068,
  'Aubervilliers': 10069,

  // Val-de-Marne
  'Créteil': 10070,
  'Vitry-sur-Seine': 10071,
  'Champigny-sur-Marne': 10072
};

type GeographicLevel = 'pays' | 'region' | 'departement' | 'intercommunalite' | 'commune';

interface GeographicFilters {
  pays: string;
  region: string;
  departement: string;
  intercommunalite: string;
  commune: string;
}

/**
 * Calcule l'ID géographique en fonction du niveau et des filtres sélectionnés
 */
export function calculateGeographicId(
  level: GeographicLevel,
  filters: GeographicFilters
): number {
  // National (France)
  if (level === 'pays') {
    return 0;
  }

  // Régional (1000-1999)
  if (level === 'region' && filters.region) {
    return REGION_TO_ID[filters.region] || 0;
  }

  // Départemental (2000-2999)
  if (level === 'departement' && filters.departement) {
    return DEPARTEMENT_TO_ID[filters.departement] || 0;
  }

  // Intercommunal (3000-3999)
  if (level === 'intercommunalite' && filters.intercommunalite) {
    return INTERCOMMUNALITE_TO_ID[filters.intercommunalite] || 0;
  }

  // Communal (10000+)
  if (level === 'commune' && filters.commune) {
    return COMMUNE_TO_ID[filters.commune] || 0;
  }

  // Default fallback
  return 0;
}

/**
 * Récupère le nom de l'intercommunalité à partir de l'ID
 */
export function getIntercommunaliteName(communeId: number): string | null {
  // Chercher dans le mapping inversé
  for (const [name, id] of Object.entries(INTERCOMMUNALITE_TO_ID)) {
    if (id === communeId) {
      return name;
    }
  }
  return null;
}

/**
 * Récupère le nom du département à partir de l'ID
 */
export function getDepartementName(communeId: number): string | null {
  for (const [name, id] of Object.entries(DEPARTEMENT_TO_ID)) {
    if (id === communeId) {
      return name;
    }
  }
  return null;
}

/**
 * Récupère le nom de la région à partir de l'ID
 */
export function getRegionName(communeId: number): string | null {
  for (const [name, id] of Object.entries(REGION_TO_ID)) {
    if (id === communeId) {
      return name;
    }
  }
  return null;
}

/**
 * Récupère le nom de la commune à partir de l'ID
 */
export function getCommuneName(communeId: number): string | null {
  for (const [name, id] of Object.entries(COMMUNE_TO_ID)) {
    if (id === communeId) {
      return name;
    }
  }
  return null;
}
