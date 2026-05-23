export type Axis = 'sur' | 'met' | 'dis' | 'spi';

export interface Ideology {
  name: string;
  target: [number, number, number, number];
  desc: string;
  profile: string;
  traits: string[];
  famous: string;
  idealRace: string;
  mantra: string;
}

export const IDEOLOGIES: Ideology[] = [
  {
    name: 'Track Purist',
    target: [85, 80, 95, 90],
    desc: 'You live for the sub-5 mile, the polished spike, the perfectly even 400s. Splits down to the tenth. The track is honest in a way the trail never is.',
    profile: 'The track is your church and the stopwatch is your scripture. You can reel off your 400m splits from memory, debate the merits of Nike vs Adidas spikes with forensic detail, and you\'ve probably watched the 1972 Olympic 1500m final more times than is healthy. For you, running is the purest sport in the world — one lane, one clock, no excuses.',
    traits: ['Knows their 400m split from every race', 'Owns multiple pairs of spikes', 'Can debate shoe plate technology for hours', 'Has strong opinions about track surfaces'],
    famous: 'Jakob Ingebrigtsen, Mo Farah, Steve Cram',
    idealRace: 'A fast, paced 5000m on a warm summer evening',
    mantra: 'The clock doesn\'t lie.',
  },
  {
    name: 'Marathon Hunter',
    target: [80, 80, 35, 90],
    desc: 'Sub-3 chaser, World Majors collector. Training blocks measured in weeks-to-race-day. The clock is the only judge that counts.',
    profile: 'Your life is measured in 16-week training blocks and your wardrobe is 80% race T-shirts. You know the tangent line through every London Marathon corner, you\'ve compared the elevation profiles of all six World Marathon Majors, and you have a detailed spreadsheet tracking your fuelling strategy. The marathon is the perfect distance — long enough to demand respect, short enough to race properly.',
    traits: ['Has a pace band printed for every marathon', 'Owns more super shoes than regular shoes', 'Can recite the Berlin course elevation from memory', 'Plans annual leave around race calendars'],
    famous: 'Eliud Kipchoge, Paula Radcliffe, Meb Keflezighi',
    idealRace: 'Berlin Marathon — flat, fast, your PB course',
    mantra: 'Trust the training.',
  },
  {
    name: 'Parkrun Faithful',
    target: [65, 45, 78, 20],
    desc: 'Saturday at 9am, no matter the weather. A barcode-pinned shirt, a 50-venue tourist tally, and probably as many volunteer credits as runs. Running as ritual.',
    profile: 'Saturday at 9am isn\'t a choice, it\'s a calling. You\'ve run in hail, in heatwaves, and once on Christmas Day when you had to explain to the in-laws why you\'d be gone for 45 minutes. Your barcode is laminated, your tourist map is a source of pride, and you\'ve probably volunteered as often as you\'ve run. For you, parkrun isn\'t just a timed 5K — it\'s the best thing to happen to running since shoes.',
    traits: ['Laminated barcode in every jacket pocket', 'Volunteer credit list longer than their results', 'Knows the first-timers\' briefing by heart', 'Brings flapjacks for milestone celebrations'],
    famous: 'The entire parkrun community',
    idealRace: 'Your home parkrun, 9am Saturday, rain or shine',
    mantra: 'See you Saturday.',
  },
  {
    name: 'Charity Marathoner',
    target: [75, 30, 25, 25],
    desc: 'One big-city marathon, one big cause, sequins and tutus very much encouraged. The cause matters more than the finish time — and that\'s the point.',
    profile: 'You signed up for the distance because the cause moved you — and somewhere around mile 18, the distance moved you right back. Your fundraising page hit its target three weeks before race day, your costume has structural engineering challenges, and your finish line photo is the most liked post you\'ve ever made. The time on the clock is irrelevant. The number on the JustGiving page is everything.',
    traits: ['JustGiving page shared more than any photo', 'Fancy dress costume tested on long runs', 'Crowd support is non-negotiable fuel', 'Has raised more money than most people earn in a month'],
    famous: 'Eddie Izzard, Kevin Sinfield, Captain Tom',
    idealRace: 'London Marathon — the atmosphere, the crowds, the cause',
    mantra: 'Every mile means something.',
  },
  {
    name: 'Sky Racer',
    target: [15, 70, 55, 85],
    desc: 'Vertical kilometres, mountain marathons, the air at altitude. Lungs of a kestrel. Competitive, but the mountain is the real opponent.',
    profile: 'You measure runs in vertical metres, not horizontal distance. Your legs are spring-loaded from endless uphill repeats, your lungs could inflate a weather balloon, and your idea of a warm-up involves a gradient that would make a road runner cry. You\'re competitive — fiercely so — but the mountain is always the real opponent. The view from the summit is earned, never given.',
    traits: ['Measures runs in vertical metres gained', 'Can scramble a rocky ridge at pace', 'Owns more trail vests than road singlets', 'Has calves that could crack walnuts'],
    famous: 'Kilian Jornet, Nicky Spinks, Billy Bland',
    idealRace: 'Skyrunning World Series — steep, technical, relentless',
    mantra: 'Up is the only way.',
  },
  {
    name: 'Ultra Strategist',
    target: [20, 85, 15, 80],
    desc: 'UTMB spreadsheets. Gel-per-hour calculations. Drop-bag wizardry. The race is won in the planning long before the gun goes.',
    profile: 'For you, the race is won in the spreadsheet. Your drop bags are packed with military precision, your fuelling plan is calibrated to the gram per hour, and you\'ve recce\'d every aid station on Google Earth. You know that ultras aren\'t won by the fastest runner — they\'re won by the runner who falls apart the slowest. And you don\'t intend to fall apart at all.',
    traits: ['Drop bag packing takes longer than most people\'s races', 'Has a gel-per-hour calculation for every distance', 'Recces courses on Google Earth', 'Carries a laminated race plan on every ultra'],
    famous: 'Courtney Dauwalter, Jim Walmsley, Damian Hall',
    idealRace: 'UTMB — the ultimate test of preparation meets mountain',
    mantra: 'Plan the work, work the plan.',
  },
  {
    name: 'Fell Spirit',
    target: [10, 20, 50, 55],
    desc: 'Old-school British hill running. Boggy shoes, terse company, a vest and shorts in November. No fuss, no fanfare — just up, over, down.',
    profile: 'Boggy, terse, magnificent. You run the fells the way they\'ve been run for a hundred years — light kit, strong legs, no fuss. You can navigate in cloud, descend scree at a speed that terrifies road runners, and your idea of luxury is a cup of tea at the finish. The fell running community is tight, unpretentious, and quietly hard as nails. You wouldn\'t have it any other way.',
    traits: ['Navigates by contour and instinct', 'Descends like gravity is optional', 'Owns a pair of Walsh PBs or Mudclaws', 'Has strong opinions about the Bob Graham Round'],
    famous: 'Joss Naylor, Billy Bland, Jasmin Paris',
    idealRace: 'Borrowdale Fell Race — up, over, down, done',
    mantra: 'No fuss, no fanfare.',
  },
  {
    name: 'Ultra Mystic',
    target: [15, 15, 10, 25],
    desc: 'Run through the night, watch the dawn arrive. The clock barely registers. Long-distance running as a form of meditation, or maybe pilgrimage.',
    profile: 'For you, ultrarunning isn\'t a sport — it\'s a practice. The long miles strip everything back until there\'s nothing left but the rhythm of your breath and the sound of your feet. You\'ve watched the sun set and rise again on a single run, and something in that experience changed you in a way you can\'t quite articulate. You don\'t run ultras to race. You run them to understand.',
    traits: ['Has run through at least one full night', 'Doesn\'t wear a watch on long runs', 'Reads philosophy between training blocks', 'Finds meditation in the repetition of miles'],
    famous: 'Rickey Gates, Robbie Britton, the Tarahumara',
    idealRace: 'A self-supported multi-day crossing — no timing chip, no aid stations',
    mantra: 'The miles will teach you.',
  },
  {
    name: 'Lab Rat',
    target: [55, 92, 50, 55],
    desc: 'Stryd pod, lactate testing, AI coach. Training is a data product. Every adaptation is logged, charted, and optimised toward the next number.',
    profile: 'Your training log is a data product. Every session has a purpose, every recovery is tracked, and you can tell the difference between a 78% and 82% effort by heart rate alone. You\'ve done a lactate threshold test, you own a Stryd pod, and your Garmin Connect dashboard looks like mission control. For you, improvement isn\'t a feeling — it\'s a number, and that number only goes in one direction.',
    traits: ['Owns every wearable sensor on the market', 'Has a lactate curve saved on their phone', 'TrainingPeaks colour-coded to perfection', 'Debates training load metrics at the pub'],
    famous: 'Renato Canova\'s athletes, the Ineos 1:59 pace team',
    idealRace: 'A goal race chosen specifically for optimal PB conditions',
    mantra: 'What gets measured gets managed.',
  },
  {
    name: 'Pure Runner',
    target: [50, 8, 55, 40],
    desc: 'No watch, no app, no plan beyond the door. You knew you\'d had a good one without needing to check. Running as it was for thousands of years.',
    profile: 'You run the way humans have run for thousands of years — out the door, no plan, no watch, no pressure. Some days you run fast because it feels right. Some days you walk a bit. You\'ve forgotten your phone on purpose more than once, and your best runs are the ones you can\'t prove happened. Running, for you, is the antidote to everything that beeps, buzzes, and demands your attention.',
    traits: ['Frequently "forgets" their watch', 'Has no idea what their VO2 max is', 'Best runs have no Strava record', 'Routes chosen by whichever turn looks interesting'],
    famous: 'Haruki Murakami, Bruce Fordyce',
    idealRace: 'No race — just a trail, a sunset, and no agenda',
    mantra: 'Just run.',
  },
  {
    name: 'Club Heart',
    target: [65, 40, 50, 18],
    desc: 'Tuesday intervals. Post-run pint. Club kit. The relay. The club championship. The handicap race. Running, for you, is mostly the people.',
    profile: 'Tuesday track night, Thursday tempo, Sunday long run — but it\'s the post-run pint that really matters. You joined for the fitness and stayed for the people. Your club vest carries more emotional weight than any sponsor deal ever could, and the annual relay is circled in your diary months in advance. You\'ll pace a teammate to a PB before chasing one of your own, because that\'s what club runners do.',
    traits: ['Club vest is the most cherished item in the drawer', 'Annual relay circled in the diary months ahead', 'Has paced more PBs than they\'ve run', 'Post-run socialising is non-negotiable'],
    famous: 'Your club captain, the Tuesday night group',
    idealRace: 'The club championship, in the club vest, with the club cheering',
    mantra: 'Stronger together.',
  },
  {
    name: 'Trail Wanderer',
    target: [20, 35, 35, 25],
    desc: 'Happy in the woods. Pace doesn\'t matter, views do. You go out for a 90-minute loop and come back four hours later, unbothered and entirely fine.',
    profile: 'You went out for 90 minutes and came back four hours later, and you don\'t understand why anyone would find that unusual. Your idea of a good run involves at least one stream crossing, two wrong turns, and a view that makes you stop and just stand there for a while. Pace is irrelevant. Distance is approximate. The point is to be outside, moving through the landscape, unhurried and entirely content.',
    traits: ['GPS track looks like abstract art', 'Frequently returns later than promised', 'Has a mental catalogue of favourite viewpoints', 'Carries a flask of tea on winter runs'],
    famous: 'Alfred Wainwright, your own curiosity',
    idealRace: 'Not a race — a long, aimless run in an unfamiliar valley',
    mantra: 'Not all who wander are lost.',
  },
  {
    name: 'Speed Demon',
    target: [55, 60, 92, 70],
    desc: '5K and 10K racing. Anything that takes longer than an hour starts to feel like a chore. Sharp, fast, repeatable — and ideally on a Saturday morning.',
    profile: 'Anything that takes longer than an hour starts to feel like a chore. You live for the short, sharp, lung-burning effort — the 5K where every second counts, the park sprint finish, the 400m rep where you can taste metal. You\'re fast, you know you\'re fast, and you\'re not done getting faster. The starting gun is your favourite sound in the world.',
    traits: ['Parkrun PB is updated more often than their phone', 'Warm-up takes longer than the race', 'Knows their kick speed to the nearest second', 'Treats every traffic light as an interval session'],
    famous: 'Yohan Blake, Laura Muir, Josh Kerr',
    idealRace: 'A fast, flat 5K with a quality field and chip timing',
    mantra: 'Fast never gets old.',
  },
  {
    name: 'Long Hauler',
    target: [40, 55, 8, 55],
    desc: 'Drawn always to the longer event. Anything under a marathon feels like a warm-up. Comfortable being uncomfortable for hours at a stretch.',
    profile: 'Anything under a marathon feels like a warm-up. You\'re wired for endurance — the longer it goes, the better you get. While others start to unravel at mile 20, you\'re just finding your rhythm. Your weekday easy runs are other people\'s long runs, your weekend long runs need a packed lunch, and your toenail situation is a conversation for another day.',
    traits: ['Easy runs are other people\'s long runs', 'Toenail situation best not discussed', 'Has eaten every food imaginable mid-run', 'Packing for a run takes 20 minutes'],
    famous: 'Dean Karnazes, Camille Herron, Pat Farmer',
    idealRace: 'A 100-miler through the mountains — the longer, the better',
    mantra: 'The further I go, the better I feel.',
  },
  {
    name: 'All-Rounder',
    target: [50, 50, 50, 50],
    desc: 'Track Tuesday, club 10-mile Sunday, off-road relay next month, ultra in the autumn. The Swiss Army knife of runners — competent everywhere, dogmatic nowhere.',
    profile: 'Track Tuesday, club 10-mile on Sunday, off-road relay next month, an ultra in the autumn — you do it all, and you do it all reasonably well. You refuse to be pigeonholed, and your running wardrobe reflects it: road shoes, trail shoes, spikes, and something waterproof. The Swiss Army knife of runners — competent everywhere, dogmatic nowhere, and having a brilliant time.',
    traits: ['Has shoes for every surface known to running', 'Race calendar has no discernible pattern', 'Equally comfortable on track and trail', 'Will sign up for anything once'],
    famous: 'Sebastian Coe, Tom Evans',
    idealRace: 'Whatever\'s next on the calendar — variety is the point',
    mantra: 'Why choose?',
  },
  {
    name: 'Joyful Plodder',
    target: [55, 20, 40, 15],
    desc: 'You run because it makes you feel good. Pace, distance, surface, time — none of it really matters. Out the door is the only metric that counts.',
    profile: 'You don\'t run to race. You don\'t run to train. You run because it makes you feel alive. Your pace would make a speed demon weep, your running form would horrify a biomechanist, and absolutely none of that matters. You come back from every run happier than you left, and that, in the end, is the whole point of the exercise.',
    traits: ['Pace has never once been a concern', 'Smiles at every single runner they pass', 'Running playlist is a source of great pride', 'Has never DNF\'d — because they never DNS'],
    famous: 'Eddie Izzard, the back-of-the-pack legends',
    idealRace: 'A fun run with a medal, a banana, and zero time pressure',
    mantra: 'Out the door is the victory.',
  },
  {
    name: 'Streak Keeper',
    target: [55, 70, 55, 30],
    desc: 'Day one was years ago. The chain has not broken. Two miles in a thunderstorm, one lap around a hospital car park — doesn\'t matter. The streak is sacred.',
    profile: 'Day one was years ago. Rain, snow, illness, Christmas, a delayed flight, that time you had food poisoning — the streak has survived them all. Two miles in a thunderstorm counts. One lap around a hospital car park counts. The chain is sacred, and you will not be the one to break it. Other runners talk about consistency. You live it.',
    traits: ['Has run every single day for years', 'Minimum distance protocol is precisely defined', 'Weather is never an excuse', 'Backup running kit in the car at all times'],
    famous: 'Ron Hill (52 years, 39 days)',
    idealRace: 'Today\'s run — same as yesterday, same as tomorrow',
    mantra: 'The streak is sacred.',
  },
  {
    name: 'Race Tourist',
    target: [40, 35, 40, 28],
    desc: 'You collect races like other people collect stamps. Half marathons abroad, weird-format ultras, midnight runs, themed events. The medal wall has questions to answer.',
    profile: 'You collect races like other people collect stamps. A half marathon in Marrakech, a trail race in the Dolomites, that weird underground 5K in a salt mine — you\'ve done them all, and you have the medal wall to prove it. For you, every race is an excuse to explore somewhere new. The finishing time is nice. The finishing photo in an exotic location is nicer.',
    traits: ['Medal wall needs structural support', 'Plans holidays entirely around race entries', 'Has a race bucket list longer than most novels', 'Every medal has a story attached'],
    famous: 'The World Marathon Majors crowd',
    idealRace: 'Something you can\'t pronounce, in a country you\'ve never visited',
    mantra: 'Run the world.',
  },
  {
    name: 'Backyard Brawler',
    target: [50, 75, 8, 88],
    desc: 'One loop, every hour, until only one runner stands. You\'d rather be eliminated at hour 36 than not be there at all. Mental warfare with a loop counter.',
    profile: 'One loop. Every hour. Until only one runner stands. The backyard ultra format found you, and you found yourself. It\'s not about speed, or distance, or even fitness — it\'s about who wants it most. The mental warfare is quiet, polite, and absolutely ruthless. You\'d rather be eliminated at hour 36 than not be there at all.',
    traits: ['Can nap for exactly 12 minutes between loops', 'Has a precise inter-loop routine', 'Mentally catalogues other runners\' weaknesses', 'Finds the format\'s simplicity deeply beautiful'],
    famous: 'Courtney Dauwalter, Harvey Lewis',
    idealRace: 'A last-person-standing event — any course, any conditions',
    mantra: 'One more loop.',
  },
  {
    name: 'Mountain Goat',
    target: [10, 40, 50, 45],
    desc: 'Vertical metres are the only metric that really counts. Scree, scramble, ridge, summit. You\'d rather a 12K with 1,500m of climb than a flat marathon.',
    profile: 'Vertical metres are the only metric that counts. You chose your home because of its proximity to hills, your calves have their own postcode, and you\'ve been known to add a few extra contours to a run because the route felt too flat. Scree, scramble, ridge, summit — this is where you come alive. The mountain doesn\'t care about your pace, and neither do you.',
    traits: ['Measures every run by elevation gained', 'Can identify a gradient by feel alone', 'Lives within running distance of serious hills', 'Considers anything under 5% gradient to be "flat"'],
    famous: 'Kilian Jornet, Nicky Spinks, Finlay Wild',
    idealRace: 'A 12K vertical race with 1,500m of climbing',
    mantra: 'Earn the view.',
  },
  {
    name: 'Couch-to-5K Convert',
    target: [70, 25, 55, 22],
    desc: 'Six months ago, running for a bus was a struggle. Now you\'re looking up local 5Ks. Running has just become part of your life, and you\'re still slightly surprised by it.',
    profile: 'Six months ago, running for a bus was an ordeal. Now you\'re comparing 5K times, eyeing up a 10K entry, and wondering whether you should join a club. Something clicked — maybe it was the endorphins, maybe it was the headspace, maybe it was proving to yourself that you could do something you\'d always assumed you couldn\'t. Whatever it was, it stuck. Welcome to the rest of your running life.',
    traits: ['Still slightly amazed they can run 5K', 'Strava is a new and exciting world', 'Tells everyone they know about running', 'Already planning the next distance up'],
    famous: 'Every single person who started from zero',
    idealRace: 'Their first timed 5K — a milestone they\'ll never forget',
    mantra: 'I am a runner.',
  },
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
