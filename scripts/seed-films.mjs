import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * YouTube only generates maxresdefault.jpg for uploads above 720p, and serves a
 * ~1KB grey placeholder for some other sizes. Probe for the best one that is a
 * real image so older films don't get a dead thumbnail URL.
 */
async function bestThumbnail(youtubeId) {
  for (const quality of ['maxresdefault', 'sddefault', 'hqdefault']) {
    const url = `https://img.youtube.com/vi/${youtubeId}/${quality}.jpg`;
    try {
      const res = await fetch(url);
      if (res.ok && (await res.arrayBuffer()).byteLength > 5000) return url;
    } catch {
      // try the next size down
    }
  }
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}


const films = [
  {
    title: 'Cape Wrath Ultra 2024 | 8 Days Across the Scottish Highlands',
    slug: 'cape-wrath-ultra-2024',
    description: 'An 8-day, 400km stage race through the remotest parts of the Scottish Highlands — from Fort William to the Cape Wrath lighthouse, the most northwesterly point of mainland Britain.',
    youtube_id: 'rWFTnOzMSdI',
    year: 2024,
    featured: false,
    meta: {
      synopsis: `The Cape Wrath Ultra had been on my bucket list for years. In 2023 I went as part of the Event Team — filming, marshalling, and soaking it all in. That only made me want to run it more.

In May 2024 I returned as a racer. Eight days. 400 kilometres. Some of the most remote and breathtaking terrain in the British Isles.

What followed was the hardest thing I have ever done. Day 3 nearly broke me — 67km through the mountains with 2,300m of elevation, finishing in the dark, nearly timed out. I called my wife from a checkpoint, not sure if I could carry on. The tears came. The dark places came. But somehow, the next morning, I started moving again.

Each day brought new landscapes — from Harry Potter country at Glenfinnan, through Torridon's ancient mountains, past Beinn Eighe, and finally the endless expanse towards Cape Wrath. The series follows every stage of the journey.`,
      credits: 'Directed & Filmed by Stephen Cousins\nRace: Cape Wrath Ultra 2024\nA Film My Run Production',
    },
  },
  {
    title: 'Swiss Alps 100 | In the Footsteps of my Great Uncle',
    slug: 'swiss-alps-100-great-uncle',
    description: 'A 100km ultra through the Swiss Alps, running past the Matterhorn — the mountain my great uncle Edward Whymper was the first to climb in 1865, in an ascent where four men died.',
    youtube_id: 'xg7mbWI52io',
    year: 2024,
    featured: false,
    meta: {
      synopsis: `In August 2024 I arrived in the small Swiss town of Fiesch for the Swiss Alps 100 — a 100km ultra marathon through some of the most spectacular mountain scenery in the world.

But this race was about more than running. My great uncle, Edward Whymper, was in the first team to climb the Matterhorn in 1865. Four men died on the descent in one of mountaineering's most famous tragedies. Running past that same mountain, alongside the Aletsch Glacier, and crossing a terrifying suspension bridge high above a valley — every step carried the weight of family history.

The race pushed me to my absolute limit. Extreme heat, sickness, the constant threat of time cut-offs. But the experience of tracing my great uncle's footsteps through these mountains made it one of the most meaningful races I have ever run.`,
      credits: 'Directed & Filmed by Stephen Cousins\nRace: Swiss Alps 100, 2024\nA Film My Run Production',
    },
  },
  {
    title: 'Arc of Attrition 100 | 100 Miles Through the Cornish Night',
    slug: 'arc-of-attrition-2017',
    description: 'My first attempt at the Arc of Attrition — 100 miles along the Cornwall coast path in February. I was the last person to receive the gold buckle, finishing with just 10 minutes to spare.',
    youtube_id: 'cA_Q-F4I3LU',
    year: 2017,
    featured: false,
    meta: {
      synopsis: `The Arc of Attrition is 100 miles along the South West Coast Path — from Coverack to Porthtowan, hugging the rugged Cornish coastline. It takes place in February, which means long hours of darkness, brutal weather, and cliff-edge trails in the middle of the night.

I crossed the finish line with just 10 minutes to spare before the 36-hour cut-off, making me the last person to receive the gold buckle. The race had thrown everything at me — hallucinations, mud, exhaustion, and the constant psychological battle of running through the night on paths that drop hundreds of feet to the sea.

There were moments where I genuinely didn't think I'd make it. Moments where the only thing keeping me moving was the thought of that buckle and the knowledge that my crew were waiting at the next checkpoint. This was the race that taught me what 100 miles really means.`,
      credits: 'Directed & Filmed by Stephen Cousins\nRace: Arc of Attrition 100, February 2017\nA Film My Run Production',
    },
  },
  {
    title: 'South Downs Way 100 | Our First 100 Miler',
    slug: 'south-downs-way-100-first',
    description: 'The race that changed everything — my first ever 100-mile ultra marathon. Running through the night across the South Downs with my best mate Richard.',
    youtube_id: 'Bmiqina9ZRE',
    year: 2016,
    featured: false,
    meta: {
      synopsis: `One hundred miles. How do you even run 100 miles? That was the question I kept asking myself in the months before the Centurion South Downs Way 100 in June 2016.

Richard and I had been building up to this for years — from our first marathons to 50-milers, each race pushing the boundary a little further. But 100 miles was a different beast entirely. The distance beyond 70 miles was completely unknown territory.

The film follows our entire journey — from the nervous start at Winchester, through the long hot afternoon across Hampshire, into the darkness of the night section, and the emotional final miles into Eastbourne as the sun came back up. Hallucinations, laughter, tears, and the overwhelming feeling of crossing a line we never thought possible.

This was the race that turned me from a marathon runner into an ultra runner. Nothing was ever quite the same after this.`,
      credits: 'Directed & Filmed by Stephen Cousins\nRace: Centurion South Downs Way 100, June 2016\nA Film My Run Production',
    },
  },
  {
    title: 'Transgrancanaria 128km | Toughest One Yet?',
    slug: 'transgrancanaria-2020',
    description: 'A night start on Las Palmas beach, 128km across the volcanic island of Gran Canaria, and a camera that ran out of memory at the worst possible moment.',
    youtube_id: 'Qct7tNxkLK8',
    year: 2020,
    featured: false,
    meta: {
      synopsis: `The Transgrancanaria Classic is one of the great mountain ultras. 128 kilometres from the south of Gran Canaria to the north, climbing through volcanic landscapes, pine forests, and mountain ridges. Of the 800 runners who started, only just over half would finish.

Richard and I travelled to Gran Canaria with our families — part holiday, part race. The start was spectacular: midnight on Las Palmas beach, 800 head torches lighting up the sand before disappearing into the darkness.

What followed was 26 hours of the most demanding running I've ever experienced. The heat was relentless, the climbs never-ending, and my body started rebelling in ways I hadn't planned for. And then, within sight of the finish, my camera ran out of memory. The one moment I needed to capture — gone.

Despite it all, crossing that finish line remains one of the proudest moments of my running career.`,
      credits: 'Directed & Filmed by Stephen Cousins\nRace: Transgrancanaria Classic, March 2020\nA Film My Run Production',
    },
  },
  {
    title: 'Transgrancanaria 2022 | When Paradise Turned to Survival',
    slug: 'transgrancanaria-2022',
    description: 'What started as a sunshine holiday race turned into a survival epic — freezing temperatures, runners in bivvy bags, and the toughest Transgrancanaria in years.',
    youtube_id: 'NPY5jqd9XAk',
    year: 2022,
    featured: false,
    meta: {
      synopsis: `Two years after the heat of 2020, I returned to Transgrancanaria expecting another warm race in the Canary Islands sunshine. What we got was a weather disaster.

Freezing temperatures hit the mountains. Runners were pulling out their emergency bivvy bags on exposed ridgelines. What had been billed as a sunshine holiday race became a genuine survival challenge. The contrast with 2020 — where extreme heat was the enemy — couldn't have been more stark.

The race pushed me in completely different ways. Cold hands, frozen water bottles, wind that cut through every layer. But there's something about Transgrancanaria that keeps pulling me back — the volcanic landscapes, the camaraderie of the runners, and the feeling of crossing an entire island on foot.`,
      credits: 'Directed & Filmed by Stephen Cousins\nRace: Transgrancanaria Classic, March 2022\nA Film My Run Production',
    },
  },
  {
    title: 'Transvulcania Ultra 2016 | I Destroyed My Quads',
    slug: 'transvulcania-2016',
    description: 'My first Transvulcania — 74km across the volcanic ridge of La Palma in the Canary Islands. The most spectacular race location I had ever seen.',
    youtube_id: 'CyvOqUUzoC4',
    year: 2016,
    featured: false,
    meta: {
      synopsis: `Transvulcania is a 74-kilometre race along the volcanic spine of La Palma, one of the Canary Islands. The course starts at the lighthouse on the southern tip, climbs nearly 4,400 metres through pine forests and over the volcanic ridge, and finishes in the town of Los Llanos de Aridane.

Standing at the start line at midnight, watching 2,000 head torches snake up the volcano in a procession of light, remains one of the most spectacular sights I've witnessed in running. The climb to the Roque de los Muchachos at 2,426m above sea level, and the brutal 30km descent that follows, is unlike anything else in ultra running.

My quads were completely destroyed. The descent is relentless — thousands of metres of steep, technical volcanic trail that leaves your legs in pieces. But the scenery, the atmosphere, and the sheer scale of the race make Transvulcania one of the most addictive races on the planet.`,
      credits: 'Directed & Filmed by Stephen Cousins\nRace: Transvulcania Ultra, May 2016\nA Film My Run Production',
    },
  },
  {
    title: 'Transvulcania Ultra 2017 | A Procession of Stars',
    slug: 'transvulcania-2017',
    description: 'Returning to La Palma\'s volcanic ultra — running alongside Kilian Jornet, Emily Forsberg, and the world\'s best. This time, over an hour faster.',
    youtube_id: '5mqM84h2Hvg',
    year: 2017,
    featured: false,
    meta: {
      synopsis: `After my first Transvulcania in 2016 left my quads in ruins, I knew I had to come back. The race had got under my skin in a way few races do. The combination of the volcanic landscape, the Skyrunning World Series atmosphere, and the sheer brutality of the course was irresistible.

In 2017 I returned to La Palma with a plan: run smarter, manage the descent better, and beat my previous time by a significant margin. The race delivered — I crossed the line over an hour faster than the year before.

But the real magic of Transvulcania is the field. This is a Skyrunning World Series race, and sharing the course with athletes like Kilian Jornet, Emily Forsberg, and Luis Alberto Hernando gives the whole event an electric atmosphere. Standing at the Roque de los Muchachos as the dawn breaks over La Palma — it doesn't get better than that.`,
      credits: 'Directed & Filmed by Stephen Cousins\nRace: Transvulcania Ultra, May 2017\nA Film My Run Production',
    },
  },
  {
    title: 'Ben Nevis Ultra 2021 | The Race I Can\'t Finish',
    slug: 'ben-nevis-ultra-2021',
    description: 'I was timed out in 2019. Now I\'m back to settle a score with Britain\'s highest mountain. "I am starting to get addicted to this race... I can\'t seem to finish it."',
    youtube_id: 'ot1kQ_EcXgs',
    year: 2021,
    featured: false,
    meta: {
      synopsis: `I am starting to get addicted to this race. I can't seem to finish it.

In 2019, I was timed out at the bottom of Ben Nevis — despite being a sub-3-hour marathon runner. The Ben Nevis Ultra's cut-offs are brutal. The mountain doesn't care about your road credentials.

When the 2021 race came around, I had unfinished business. Skyline Scotland. Kinlochleven. The Mamores. And Ben Nevis itself — Britain's highest peak, waiting at the far end of the course like a final exam.

This race has a hold on me that I can't quite explain. Maybe it's the Scottish mountain scenery. Maybe it's the technical terrain that strips away any illusion of control. Or maybe it's just the stubborn refusal to let a race beat me twice.`,
      credits: 'Directed & Filmed by Stephen Cousins\nRace: Salomon Ben Nevis Ultra, Skyline Scotland 2021\nA Film My Run Production',
    },
  },
  {
    title: 'Ben Nevis Ultra 2022 | Third Time Lucky?',
    slug: 'ben-nevis-ultra-2022',
    description: 'Timed out in 2019. Unfinished business in 2021. The Ben Nevis Ultra has beaten me twice — can I finally reach the finish?',
    youtube_id: 'tSco2FEgtGQ',
    year: 2022,
    featured: false,
    meta: {
      synopsis: `This is the race that won't let me go. After being timed out in 2019 and struggling again in 2021, the Ben Nevis Ultra has become an obsession. A 32-mile mountain ultra through the Scottish Highlands, finishing with a climb up Britain's highest peak.

The 2022 race at Skyline Scotland was my third attempt. The cut-offs are savage — designed to keep you moving through some of the most technical mountain terrain in the UK. Every previous attempt had ended in frustration, and every failed attempt only deepened my determination to come back.

The Ben Nevis Ultra taught me that ultra running isn't just about endurance — it's about mountain craft, pace judgement, and the mental resilience to keep believing after repeated failure.`,
      credits: 'Directed & Filmed by Stephen Cousins\nRace: Salomon Ben Nevis Ultra, Skyline Scotland 2022\nA Film My Run Production',
    },
  },
  {
    title: 'How I Broke 3 Hours in the Marathon',
    slug: 'goodwood-sub-3-marathon',
    description: 'The 8-year journey from a 3:43 first marathon to finally breaking the sub-3-hour barrier at Goodwood in December 2020.',
    youtube_id: 'I451mB-1aBU',
    year: 2020,
    featured: false,
    meta: {
      synopsis: `In 2012, I ran my first marathon in Paris in 3 hours 43 minutes. I had no idea what I was doing. But from that moment, a quiet ambition took hold — could I one day run under 3 hours?

Eight years later, after dozens of marathons, countless training plans, and a revelation about the 80/20 training method during lockdown, I stood on the start line at Goodwood Motor Circuit knowing I was in the best shape of my life.

The Goodwood Marathon is flat, fast, and honest. No crowds, no spectacle — just you against the clock. On a cold December morning in 2020, I crossed the line in 2 hours 58 minutes and 57 seconds.

Breaking 3 hours felt like the culmination of everything. Years of 5am runs, failed attempts, and gradual improvement all compressed into one perfect race. This film tells the full story — from that first marathon in Paris to the moment the clock finally showed a 2 at the front.`,
      credits: 'Directed & Filmed by Stephen Cousins\nRace: Goodwood Marathon, December 2020\nA Film My Run Production',
    },
  },
  {
    title: 'Hardmoors 60 | Comedy and Chaos on the Cleveland Way',
    slug: 'hardmoors-60-2017',
    description: '62 miles along the Yorkshire coast and Cleveland Way — where everything that could go wrong, did. Tent flooding, missing the start, a DHL van on the trail, and a finish through Whitby tourists.',
    youtube_id: 'RzEjw50Qr10',
    year: 2017,
    featured: false,
    meta: {
      synopsis: `The Hardmoors 60 is a 62-mile race along the Yorkshire coast and Cleveland Way. On paper, a straightforward ultra. In practice, one of the most hilariously disaster-prone adventures of my running career.

It started the night before — our tent flooded in biblical rain. We nearly missed the race start entirely. Then, out on the course, a DHL delivery van somehow ended up blocking the trail. Fog rolled in at the summit. And the final miles took us straight through crowds of bemused Whitby tourists.

But that's what makes these races special. The Hardmoors 60 isn't just about the distance — it's about the stories you collect along the way. The Yorkshire coast is spectacular, the race organisation is brilliant, and even when everything goes wrong, you're running through some of the most dramatic scenery in England.`,
      credits: 'Directed & Filmed by Stephen Cousins\nRace: Hardmoors 60, September 2017\nA Film My Run Production',
    },
  },
  {
    title: 'Devon Coast to Coast Ultra | 117 Miles from Dartmoor to Exmoor',
    slug: 'devon-coast-to-coast-ultra-2018',
    description: 'The inaugural Devon Coast to Coast — 117 miles through two national parks in 33 hours of relentless mud, snow on Dartmoor, and a soul-destroying night section.',
    youtube_id: 'HX7QgvvDZao',
    year: 2018,
    featured: false,
    meta: {
      synopsis: `Ok, I admit it. I had little to no idea what I was getting into.

The Devon Coast to Coast Ultra was a brand new race — 117 miles from the south coast to the north, crossing both Dartmoor and Exmoor. Nobody had done it before. Nobody knew quite what to expect.

What we got was 33 hours of the most challenging terrain I've ever encountered. Snow on Dartmoor. Fields of mud so deep you'd lose your shoes. A night section through endless farmland that tested every ounce of mental resilience.

The film captures it all — the excitement of running an inaugural race, the camaraderie between runners forging a path nobody had run before, and the sheer bloody-mindedness required to keep moving when every part of your body is begging you to stop. This film also includes perspectives from the race winner, the ladies' winner, and other runners who shared the journey.`,
      credits: 'Directed & Filmed by Stephen Cousins\nRace: Devon Coast to Coast Ultra, March 2018\nA Film My Run Production',
    },
  },
  {
    title: 'Grim Reaper Ultra 70 | Swimming, Vomiting, and Winning',
    slug: 'grim-reaper-ultra-2015',
    description: 'The 70-mile Grim Reaper Ultra at Grimsthorpe Castle — where Richard and I ran our first ultra together, went swimming in the lake, and somehow won.',
    youtube_id: 'w0Wd74QR27I',
    year: 2015,
    featured: false,
    meta: {
      synopsis: `The Grim Reaper Ultra is a 70-mile race around the grounds of Grimsthorpe Castle in Lincolnshire. Flat, looped, and deceptively brutal — the kind of race where the distance grinds you down one lap at a time.

This was one of the most memorable ultra races Richard and I have ever run together. We went in with no expectations, swam in the lake mid-race to cool down, experienced a bout of hilariously synchronized vomiting, and somehow, against all odds, found ourselves catching the leaders in the closing miles.

The film captures the joy of running an ultra with your best mate — the conversations that keep you going through the dark hours, the shared suffering, and the absurd decision-making that only makes sense at mile 60. A race where the journey matters infinitely more than the result.`,
      credits: 'Directed & Filmed by Stephen Cousins\nRace: Grim Reaper Ultra 70 Mile, July 2015\nA Film My Run Production',
    },
  },
  {
    title: 'Wendover Woods 50 | Centurion Running',
    slug: 'wendover-woods-50-2016',
    description: 'The Centurion Wendover Woods 50 — five laps of the Chiltern Hills, each one harder than the last. My first Centurion event and a stepping stone to the 100-mile dream.',
    youtube_id: 'dLehgKF4Hcc',
    year: 2016,
    featured: false,
    meta: {
      synopsis: `The Wendover Woods 50 is a Centurion Running event — 50 miles through the Chiltern Hills, run as five laps of a 10-mile loop. It sounds simple. It isn't.

Each lap starts with hope and ends with a negotiation — one more lap, just one more. The woods are beautiful in autumn, but by lap four you've stopped noticing the scenery and started counting the minutes.

This was my first Centurion event, and it opened the door to their whole Grand Slam series. The organisation is incredible, the aid stations are legendary, and the community of runners who turn up to these events made me feel like I'd found my people.

The Wendover Woods 50 was the race that convinced me I could handle 100 miles. If I could survive five laps of those hills, surely I could survive the South Downs.`,
      credits: 'Directed & Filmed by Stephen Cousins\nRace: Centurion Wendover Woods 50, November 2016\nA Film My Run Production',
    },
  },
  {
    title: 'Two Secrets of the Beachy Head Marathon',
    slug: 'beachy-head-marathon-secrets',
    description: 'The Beachy Head Marathon across the Seven Sisters — a race I\'ve run almost every year since 2014, watching my time drop from 4:55 to 3:38.',
    youtube_id: 'OMm2s5Krn0g',
    year: 2022,
    featured: false,
    meta: {
      synopsis: `The Beachy Head Marathon is one of the most iconic trail marathons in the south of England. 26.2 miles across the Seven Sisters, the white chalk cliffs of the South Downs, and some of the most breathtaking coastal scenery in the UK.

I've run this race almost every year since 2014. My first attempt was a blow-up — 4 hours 55 minutes, completely destroyed by the hills. Over the years, I've watched my time come down: 4:32, 4:12, 3:55, all the way to a 3:38 PB.

The Beachy Head Marathon has become my annual benchmark — the race that tells me exactly where I am as a runner. The course never changes, the hills never get easier, but every year I learn something new about how to run them.`,
      credits: 'Directed & Filmed by Stephen Cousins\nRace: Beachy Head Marathon, October 2022\nA Film My Run Production',
    },
  },
  {
    title: 'Jurassic Coast Challenge | Three Marathons in Three Days',
    slug: 'jurassic-coast-challenge-2017',
    description: 'Three consecutive marathons along the Jurassic Coast — a UNESCO World Heritage Site of dramatic cliffs, fossil beaches, and relentless hills.',
    youtube_id: 'SVPmoJhzGL4',
    year: 2017,
    featured: false,
    meta: {
      synopsis: `The Jurassic Coast Challenge is three marathons in three days along the Dorset and Devon coastline — a UNESCO World Heritage Site with some of the most dramatic coastal scenery in Britain.

It's not a race, it's a challenge. That distinction matters. The daily distances are marathon length, but the terrain — with its constant cliff ascents and descents — makes every mile feel like two. The Jurassic Coast path doesn't do flat.

Over three days, the challenge takes you past Durdle Door, Lulworth Cove, the Undercliff, and countless other landmarks. Your legs accumulate fatigue with each day, and by the third marathon you're running on willpower alone. But the coastline is so stunning that you somehow keep moving, propelled by the next headland, the next cove, the next glimpse of ancient fossil-studded cliffs.`,
      credits: 'Directed & Filmed by Stephen Cousins\nRace: Jurassic Coast Challenge, March 2017\nA Film My Run Production',
    },
  },
  {
    title: 'Val d\'Aran by UTMB | 100 Miles in the Pyrenees',
    slug: 'val-daran-100-utmb',
    description: '100 miles and 10,000 metres of ascent in the Pyrenees — the gnarliest terrain, a 48-hour cutoff, and an automatic entry to the UTMB 100.',
    youtube_id: 'Vo020VQJKA4',
    year: 2021,
    featured: false,
    meta: {
      synopsis: `The Val d'Aran by UTMB is a 100-mile mountain ultra in the Spanish Pyrenees with over 10,000 metres of elevation gain and a 48-hour cutoff. The terrain is some of the gnarliest in European ultra running.

For one year only, finishers of Val d'Aran were given automatic entry to the full UTMB 100-mile race in Chamonix — bypassing the lottery that keeps thousands of runners waiting for years. That carrot was impossible to resist.

The race delivered everything the Pyrenees promised — towering peaks, technical scrambles, endless climbs, and scenery that made you stop and stare even when you should have been running. Nearly 47 hours after starting, I crossed the finish line. The experience opened the door to UTMB, and it remains one of the most challenging and rewarding races I have ever completed.`,
      credits: 'Directed & Filmed by Stephen Cousins\nRace: Val d\'Aran by UTMB, July 2021\nA Film My Run Production',
    },
  },
];

async function main() {
  console.log(`Seeding ${films.length} films...`);

  for (const film of films) {
    const existing = await prisma.films.findUnique({ where: { slug: film.slug } });
    if (existing) {
      console.log(`  ⏭  ${film.slug} already exists, skipping`);
      continue;
    }

    await prisma.films.create({
      data: {
        title: film.title,
        slug: film.slug,
        description: film.description,
        youtube_id: film.youtube_id,
        thumbnail_url: await bestThumbnail(film.youtube_id),
        year: film.year,
        featured: film.featured,
        awards: [],
        meta: film.meta,
      },
    });
    console.log(`  ✅ ${film.slug}`);
  }

  const total = await prisma.films.count();
  console.log(`\nDone. ${total} total films in database.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
