import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const VALID_GENDERS = ['men', 'women'];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const gender = searchParams.get('gender');
  const event = searchParams.get('event');
  const age = searchParams.get('age');

  try {
    // Validate gender if provided
    if (gender && !VALID_GENDERS.includes(gender)) {
      return NextResponse.json({ error: 'Invalid gender (use men or women)' }, { status: 400 });
    }

    // Validate event if provided (alphanumeric, spaces, slashes — e.g. "5K", "Half Marathon", "100mi")
    if (event && !/^[A-Za-z0-9 /.()-]+$/.test(event)) {
      return NextResponse.json({ error: 'Invalid event name' }, { status: 400 });
    }

    // Validate age if provided
    if (age !== null && age !== undefined) {
      const parsedAge = parseInt(age, 10);
      if (isNaN(parsedAge) || parsedAge < 5 || parsedAge > 120) {
        return NextResponse.json({ error: 'Invalid age (5-120)' }, { status: 400 });
      }
    }

    // If all params provided, return specific factor
    if (gender && event && age) {
      const factor = await prisma.age_grading_factors.findUnique({
        where: {
          gender_event_age: {
            gender,
            event,
            age: parseInt(age, 10),
          },
        },
      });

      if (!factor) {
        return NextResponse.json({ error: 'Factor not found' }, { status: 404 });
      }

      return NextResponse.json({
        gender: factor.gender,
        event: factor.event,
        age: factor.age,
        factor: Number(factor.factor),
        openRecord: Number(factor.open_record),
      });
    }

    // If gender and event provided, return all ages for that event
    if (gender && event) {
      const factors = await prisma.age_grading_factors.findMany({
        where: { gender, event },
        orderBy: { age: 'asc' },
      });

      if (factors.length === 0) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      const openRecord = Number(factors[0].open_record);
      const ageFactors: Record<string, number> = {};

      factors.forEach((f) => {
        ageFactors[f.age.toString()] = Number(f.factor);
      });

      return NextResponse.json({
        gender,
        event,
        openRecord,
        ageFactors,
      });
    }

    // Otherwise, return list of available events
    const events = await prisma.age_grading_factors.findMany({
      select: {
        gender: true,
        event: true,
        open_record: true,
      },
      distinct: ['gender', 'event'],
      orderBy: [{ gender: 'asc' }, { event: 'asc' }],
    });

    // Group by gender
    const grouped: Record<string, { event: string; openRecord: number }[]> = {};
    events.forEach((e) => {
      if (!grouped[e.gender]) {
        grouped[e.gender] = [];
      }
      grouped[e.gender].push({
        event: e.event,
        openRecord: Number(e.open_record),
      });
    });

    return NextResponse.json(grouped);
  } catch (error) {
    console.error('Age grading API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
