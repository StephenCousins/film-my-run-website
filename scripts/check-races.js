const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.race.count();
    console.log('Race count:', count);

    if (count > 0) {
      const sample = await prisma.race.findFirst();
      console.log('Sample race:', sample?.event);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
