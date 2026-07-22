#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG = {
  stravaAccessToken: process.env.STRAVA_ACCESS_TOKEN,
  stravaRefreshToken: process.env.STRAVA_REFRESH_TOKEN,
  stravaClientId: process.env.STRAVA_CLIENT_ID,
  stravaClientSecret: process.env.STRAVA_CLIENT_SECRET,
  spreadsheetId: process.env.RACE_SPREADSHEET_ID || '1WVpQhFTZxoxGptF8mn16eRPOm6OUsm8di5bQ96_90uk',
  routesDataPath: path.join(__dirname, '../public/routes-data.json'),
  racesDataPath: path.join(__dirname, '../public/races-data.json'),
  rateLimit: 600
};

let currentAccessToken = CONFIG.stravaAccessToken;

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

function httpsPost(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try { resolve(JSON.parse(responseData)); } catch { resolve(responseData); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function refreshStravaToken() {
  console.log('Refreshing Strava access token...');
  try {
    const response = await httpsPost('https://www.strava.com/oauth/token', {
      client_id: CONFIG.stravaClientId,
      client_secret: CONFIG.stravaClientSecret,
      refresh_token: CONFIG.stravaRefreshToken,
      grant_type: 'refresh_token'
    });
    currentAccessToken = response.access_token;
    console.log('Token refreshed successfully');
    return true;
  } catch (error) {
    console.error('Failed to refresh token:', error.message);
    return false;
  }
}

async function fetchSpreadsheetData() {
  console.log('Fetching spreadsheet data...');
  const url = `https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}/gviz/tq?tqx=out:json`;
  const response = await httpsGet(url);
  const jsonString = response.substring(47).slice(0, -2);
  const data = JSON.parse(jsonString);

  const races = [];
  data.table.rows.forEach(row => {
    if (!row.c || !row.c[0]) return;
    const stravaUrl = row.c[9]?.v || '';
    if (stravaUrl) {
      const match = stravaUrl.match(/activities\/(\d+)/);
      if (match) {
        races.push({
          activityId: match[1],
          number: row.c[0]?.v || '',
          date: row.c[1]?.f || row.c[1]?.v || '',
          name: row.c[2]?.v || '',
          distance: row.c[3]?.v || '',
          time: row.c[4]?.v || '',
          position: row.c[5]?.v || '',
          elevation: row.c[6]?.v || '',
          video: row.c[7]?.v || '',
          report: row.c[8]?.v || '',
          strava: stravaUrl,
          officialResults: row.c[10]?.v || '',
          type: row.c[11]?.v || '',
          terrain: row.c[12]?.v || '',
          marathonCount: row.c[13]?.v || '',
          ultraCount: row.c[14]?.v || '',
          roadCount: row.c[15]?.v || '',
          trailCount: row.c[16]?.v || '',
          hundredMilers: row.c[17]?.v || '',
          raceCount: row.c[18]?.v || ''
        });
      }
    }
  });

  console.log(`Found ${races.length} races with Strava links`);
  return races;
}

function saveRacesData(races) {
  fs.writeFileSync(
    CONFIG.racesDataPath,
    JSON.stringify({ lastUpdated: new Date().toISOString(), races }, null, 2),
    'utf8'
  );
  console.log(`Saved ${races.length} races to ${CONFIG.racesDataPath}`);
}

async function fetchStravaRoute(activityId, retried = false) {
  const url = `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=latlng&key_by_type=true`;
  try {
    const data = await httpsGet(url, { 'Authorization': `Bearer ${currentAccessToken}` });
    const latlngData = data.latlng?.data || [];
    return latlngData
      .filter((_, i) => i % 3 === 0)
      .map(coord => ({
        lat: Math.round(coord[0] * 100000) / 100000,
        lng: Math.round(coord[1] * 100000) / 100000
      }));
  } catch (error) {
    if (error.message.includes('401') && !retried) {
      console.log('Token expired, refreshing...');
      const refreshed = await refreshStravaToken();
      if (refreshed) return fetchStravaRoute(activityId, true);
    }
    console.error(`Error fetching activity ${activityId}:`, error.message);
    return null;
  }
}

function loadExistingRoutes() {
  try {
    if (fs.existsSync(CONFIG.routesDataPath)) {
      return JSON.parse(fs.readFileSync(CONFIG.routesDataPath, 'utf8'));
    }
  } catch {
    console.log('Could not load existing routes, starting fresh');
  }
  return { lastUpdated: null, routes: {} };
}

async function main() {
  console.log('Starting route fetch process...\n');

  await refreshStravaToken();

  const routesData = loadExistingRoutes();
  console.log(`Loaded ${Object.keys(routesData.routes).length} existing routes\n`);

  const races = await fetchSpreadsheetData();
  saveRacesData(races);

  const existingIds = new Set(Object.keys(routesData.routes));
  const newRaces = races.filter(r => !existingIds.has(r.activityId));

  // Update metadata for existing routes
  let metadataUpdates = 0;
  for (const race of races) {
    const existing = routesData.routes[race.activityId];
    if (existing && (existing.name !== race.name || existing.date !== race.date)) {
      routesData.routes[race.activityId] = { ...existing, name: race.name, date: race.date, updatedAt: new Date().toISOString() };
      metadataUpdates++;
    }
  }

  // Remove routes no longer in spreadsheet
  const currentIds = new Set(races.map(r => r.activityId));
  const removedIds = Object.keys(routesData.routes).filter(id => !currentIds.has(id));
  removedIds.forEach(id => delete routesData.routes[id]);

  console.log(`\nNew races: ${newRaces.length}`);
  console.log(`Metadata updates: ${metadataUpdates}`);
  console.log(`Removed: ${removedIds.length}`);

  if (newRaces.length === 0) {
    if (metadataUpdates > 0 || removedIds.length > 0) {
      routesData.lastUpdated = new Date().toISOString();
      fs.writeFileSync(CONFIG.routesDataPath, JSON.stringify(routesData, null, 2), 'utf8');
      console.log('Saved metadata updates');
    } else {
      console.log('\nAll routes are up to date!');
    }
    return;
  }

  console.log(`\nFetching ${newRaces.length} new routes...\n`);

  let fetched = 0;
  let failed = 0;

  for (const race of newRaces) {
    console.log(`Fetching ${fetched + failed + 1}/${newRaces.length}: ${race.name}`);
    const coordinates = await fetchStravaRoute(race.activityId);
    if (coordinates && coordinates.length > 0) {
      routesData.routes[race.activityId] = {
        activityId: race.activityId,
        name: race.name,
        date: race.date,
        coordinates,
        fetchedAt: new Date().toISOString()
      };
      console.log(`  ${coordinates.length} coordinates`);
      fetched++;
    } else {
      console.log(`  Failed`);
      failed++;
    }
    if (fetched + failed < newRaces.length) await delay(CONFIG.rateLimit);
  }

  routesData.lastUpdated = new Date().toISOString();
  fs.writeFileSync(CONFIG.routesDataPath, JSON.stringify(routesData, null, 2), 'utf8');

  console.log(`\nDone: ${fetched} fetched, ${failed} failed, ${Object.keys(routesData.routes).length} total routes`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
