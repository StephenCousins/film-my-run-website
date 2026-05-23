export type Axis = 'sur' | 'met' | 'dis' | 'spi';

export interface Ideology {
  name: string;
  target: [number, number, number, number];
  desc: string;
}

export const IDEOLOGIES: Ideology[] = [
  { name: 'Track Purist', target: [85, 80, 95, 90], desc: 'You live for the sub-5 mile, the polished spike, the perfectly even 400s. Splits down to the tenth. The track is honest in a way the trail never is.' },
  { name: 'Marathon Hunter', target: [80, 80, 35, 90], desc: 'Sub-3 chaser, World Majors collector. Training blocks measured in weeks-to-race-day. The clock is the only judge that counts.' },
  { name: 'Parkrun Faithful', target: [65, 45, 78, 20], desc: 'Saturday at 9am, no matter the weather. A barcode-pinned shirt, a 50-venue tourist tally, and probably as many volunteer credits as runs. Running as ritual.' },
  { name: 'Charity Marathoner', target: [75, 30, 25, 25], desc: 'One big-city marathon, one big cause, sequins and tutus very much encouraged. The cause matters more than the finish time — and that\'s the point.' },
  { name: 'Sky Racer', target: [15, 70, 55, 85], desc: 'Vertical kilometres, mountain marathons, the air at altitude. Lungs of a kestrel. Competitive, but the mountain is the real opponent.' },
  { name: 'Ultra Strategist', target: [20, 85, 15, 80], desc: 'UTMB spreadsheets. Gel-per-hour calculations. Drop-bag wizardry. The race is won in the planning long before the gun goes.' },
  { name: 'Fell Spirit', target: [10, 20, 50, 55], desc: 'Old-school British hill running. Boggy shoes, terse company, a vest and shorts in November. No fuss, no fanfare — just up, over, down.' },
  { name: 'Ultra Mystic', target: [15, 15, 10, 25], desc: 'Run through the night, watch the dawn arrive. The clock barely registers. Long-distance running as a form of meditation, or maybe pilgrimage.' },
  { name: 'Lab Rat', target: [55, 92, 50, 55], desc: 'Stryd pod, lactate testing, AI coach. Training is a data product. Every adaptation is logged, charted, and optimised toward the next number.' },
  { name: 'Pure Runner', target: [50, 8, 55, 40], desc: 'No watch, no app, no plan beyond the door. You knew you\'d had a good one without needing to check. Running as it was for thousands of years.' },
  { name: 'Club Heart', target: [65, 40, 50, 18], desc: 'Tuesday intervals. Post-run pint. Club kit. The relay. The club championship. The handicap race. Running, for you, is mostly the people.' },
  { name: 'Trail Wanderer', target: [20, 35, 35, 25], desc: 'Happy in the woods. Pace doesn\'t matter, views do. You go out for a 90-minute loop and come back four hours later, unbothered and entirely fine.' },
  { name: 'Speed Demon', target: [55, 60, 92, 70], desc: '5K and 10K racing. Anything that takes longer than an hour starts to feel like a chore. Sharp, fast, repeatable — and ideally on a Saturday morning.' },
  { name: 'Long Hauler', target: [40, 55, 8, 55], desc: 'Drawn always to the longer event. Anything under a marathon feels like a warm-up. Comfortable being uncomfortable for hours at a stretch.' },
  { name: 'All-Rounder', target: [50, 50, 50, 50], desc: 'Track Tuesday, club 10-mile Sunday, off-road relay next month, ultra in the autumn. The Swiss Army knife of runners — competent everywhere, dogmatic nowhere.' },
  { name: 'Joyful Plodder', target: [55, 20, 40, 15], desc: 'You run because it makes you feel good. Pace, distance, surface, time — none of it really matters. Out the door is the only metric that counts.' },
  { name: 'Streak Keeper', target: [55, 70, 55, 30], desc: 'Day one was years ago. The chain has not broken. Two miles in a thunderstorm, one lap around a hospital car park — doesn\'t matter. The streak is sacred.' },
  { name: 'Race Tourist', target: [40, 35, 40, 28], desc: 'You collect races like other people collect stamps. Half marathons abroad, weird-format ultras, midnight runs, themed events. The medal wall has questions to answer.' },
  { name: 'Backyard Brawler', target: [50, 75, 8, 88], desc: 'One loop, every hour, until only one runner stands. You\'d rather be eliminated at hour 36 than not be there at all. Mental warfare with a loop counter.' },
  { name: 'Mountain Goat', target: [10, 40, 50, 45], desc: 'Vertical metres are the only metric that really counts. Scree, scramble, ridge, summit. You\'d rather a 12K with 1,500m of climb than a flat marathon.' },
  { name: 'Couch-to-5K Convert', target: [70, 25, 55, 22], desc: 'Six months ago, running for a bus was a struggle. Now you\'re looking up local 5Ks. Running has just become part of your life, and you\'re still slightly surprised by it.' },
];

export function findClosestIdeology(surfaceL: number, methodL: number, distanceL: number, spiritL: number): Ideology {
  let best = IDEOLOGIES[0];
  let bestDist = Infinity;
  for (const id of IDEOLOGIES) {
    const d = Math.hypot(
      id.target[0] - surfaceL,
      id.target[1] - methodL,
      id.target[2] - distanceL,
      id.target[3] - spiritL
    );
    if (d < bestDist) { bestDist = d; best = id; }
  }
  return best;
}
