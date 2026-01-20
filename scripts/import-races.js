/**
 * Import races from the existing dashboard into the new database
 */
const { PrismaClient } = require('@prisma/client');

const DASHBOARD_API = 'https://film-my-run-dashboard-production.up.railway.app/api/data';

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('Fetching data from existing dashboard...');
    const response = await fetch(DASHBOARD_API);
    const result = await response.json();

    if (!result.ok) {
      throw new Error('Failed to fetch data from dashboard');
    }

    console.log(`Fetched ${result.data.length} races`);

    // Clear existing races
    console.log('Clearing existing races...');
    await prisma.race.deleteMany({});

    // Insert races
    console.log('Inserting races...');
    const races = result.data.map((race) => ({
      date: race.date ? new Date(race.date) : new Date(),
      event: race.event,
      type: race.type || null,
      distanceKm: race.distanceKm || null,
      timeHms: race.timeHms || null,
      timeSeconds: race.secs || null,
      elevation: race.elev || null,
      position: race.pos || null,
      terrain: race.terrain || null,
      videoUrl: race.video || null,
      stravaUrl: race.strava || null,
      resultsUrl: race.results || null,
    }));

    const created = await prisma.race.createMany({
      data: races,
    });

    console.log(`Successfully imported ${created.count} races`);

    // Show some stats
    const marathons = await prisma.race.count({ where: { type: 'Marathon' } });
    const ultras = await prisma.race.count({ where: { type: 'Ultra' } });
    console.log(`\nStats:`);
    console.log(`- Total races: ${created.count}`);
    console.log(`- Marathons: ${marathons}`);
    console.log(`- Ultras: ${ultras}`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
