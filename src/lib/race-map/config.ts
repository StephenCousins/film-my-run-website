// Race Map Configuration

export const config = {
  // Google Spreadsheet ID
  spreadsheetId: process.env.NEXT_PUBLIC_RACE_SPREADSHEET_ID || '1WVpQhFTZxoxGptF8mn16eRPOm6OUsm8di5bQ96_90uk',

  // Strava API credentials
  strava: {
    clientId: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    accessToken: process.env.STRAVA_ACCESS_TOKEN,
    refreshToken: process.env.STRAVA_REFRESH_TOKEN,
  },

  // Google Maps API Key
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',

  // Map configuration
  map: {
    defaultCenter: { lat: 51.5074, lng: -0.1278 }, // London
    defaultZoom: 6,
  },

  // Cache settings
  cache: {
    enabled: true,
    expiryDays: 7,
  },
};

// Dark mode map style
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#3f3f46' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#71717a' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#27272a' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#71717a' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1f2f1f' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#27272a' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#18181b' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3f3f46' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#27272a' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#27272a' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0c1929' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3b82f6' }],
  },
];
