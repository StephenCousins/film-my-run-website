/**
 * Seed script to import age grading factors from JSON to PostgreSQL
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-age-grading.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface AgeGradingData {
  [gender: string]: {
    [event: string]: {
      open_record: number;
      age_grading_factors: {
        [age: string]: number;
      };
    };
  };
}

async function seedAgeGradingFactors() {
  console.log('Starting age grading factors seed...');

  // Read the JSON file
  const jsonPath = path.join(__dirname, '../../agegradingfactors.json');
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const data: AgeGradingData = JSON.parse(rawData);

  // Clear existing data
  console.log('Clearing existing age grading factors...');
  await prisma.ageGradingFactor.deleteMany({});

  // Prepare batch insert data
  const records: {
    gender: string;
    event: string;
    openRecord: number;
    age: number;
    factor: number;
  }[] = [];

  for (const gender of Object.keys(data)) {
    const genderData = data[gender];
    for (const event of Object.keys(genderData)) {
      const eventData = genderData[event];
      const openRecord = eventData.open_record;
      const factors = eventData.age_grading_factors;

      for (const ageStr of Object.keys(factors)) {
        const age = parseInt(ageStr, 10);
        const factor = factors[ageStr];

        records.push({
          gender,
          event,
          openRecord,
          age,
          factor,
        });
      }
    }
  }

  console.log(`Inserting ${records.length} age grading factors...`);

  // Batch insert in chunks of 1000
  const chunkSize = 1000;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    await prisma.ageGradingFactor.createMany({
      data: chunk,
    });
    console.log(`Inserted ${Math.min(i + chunkSize, records.length)} / ${records.length}`);
  }

  console.log('Age grading factors seed completed!');
}

seedAgeGradingFactors()
  .catch((e) => {
    console.error('Error seeding age grading factors:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
