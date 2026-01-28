import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const arcContent = `
<p><strong>Date:</strong> 1st February 2019 | <strong>Distance:</strong> 100 miles | <strong>Time:</strong> 28:31:46 | <strong>Position:</strong> Gold Buckle</p>

<p>The Arc of Attrition has a way of testing you before you've even started. This was my third attempt at one of Britain's most brutal ultramarathons, and the drama began long before the starting gun.</p>

<h2>The Journey Down</h2>

<p>Snow had blanketed the South West overnight. We got caught in a drift on the A38 near Exeter, but escaped the worst of it. Others weren't so lucky - my friend Richard spent the entire night trapped on Bodmin Moor and never made the start line. Of the 192 entries, over 30 runners couldn't even get to Cornwall. The Arc was already living up to its name.</p>

<p>We made it to our hotel in Camborne late evening, grabbed what sleep we could, and drove to registration the following morning at the new race HQ - the Ecological Park in Portreath. Then it was onto the buses bound for Coverack, where 100 miles of Cornish coastline awaited.</p>

<h2>Into the Gnarly</h2>

<p>The Arc doesn't ease you in. From the moment you leave Coverack, you're on technical terrain - rocky, muddy, unforgiving. The first meeting point with my family came at Lizard Point, just over 10 miles in, after two and a half hours of careful running. I was being conservative, preserving energy for what lay ahead.</p>

<p>Through Mullion Cove to Porthleven, then on to the first major checkpoint at Penzance around the 38-mile mark. The flat tarmac through town felt like a gift after the relentless coastal path - a brief respite before the real challenges began.</p>

<h2>Into the Darkness</h2>

<p>Night fell somewhere past Penzance. The checkpoints rolled by - Lamorna Cove, Minack Theatre (that beautiful amphitheatre carved into the cliffs), and finally Land's End around 2am. I'd made good time, slightly ahead of schedule.</p>

<p>There was just one problem: my wife wasn't there. She claims she was in the car park. I maintain she wasn't. Either way, I grabbed a quick bowl of chicken soup from the ever-reliable Arc Angels volunteers and pressed on.</p>

<p>Navigation becomes critical after Land's End. The previous year I'd managed to come back on myself through a navigational error. This time I kept my eyes glued to the GPS. The temptation to simply follow the runner ahead is strong, but I've learned that lesson the hard way - follow someone blindly and you'll end up in brambles or fields or worse.</p>

<h2>The Toughest 13 Miles in Britain</h2>

<p>My head torch died somewhere between Sennen Cove and Cape Cornwall. In pitch darkness, fumbling with batteries, I eventually got it working again and made it to Cape Cornwall around 4am. Victoria cleaned my feet, changed my socks, and I tried not to notice how tired I'd become. I was confusing place names, mixing up Land's End with St Ives. Mental focus was slipping.</p>

<p>What came next was the crux of the race: 13 miles from Pendeen Watch lighthouse to St Ives, with no crew support in between. This stretch of coastline is, without exaggeration, the most technical terrain you'll find anywhere in the UK. Boulders to scramble over, paths that disappear, cliff edges lurking in the darkness.</p>

<p>And then the weather turned biblical.</p>

<p>The wind had been howling all night, but now came sideways hailstones - not tiny specks, but marble-sized ice projectiles hammering into my face. For fifteen minutes at a stretch, then a brief respite, then another barrage. All while picking my way over rocky, muddy, slippery terrain in the dark.</p>

<h2>The Navigation Error</h2>

<p>Fatigue does strange things to your brain. As dawn began to break, I realised I'd drifted off the coast path. Rather than backtracking - the sensible option - I convinced myself there must be a route back to the coast if I just kept going. There wasn't. I ended up in the village of Zennor, asking a stranger in a car park how to find the coast path again.</p>

<p>Half an hour and two extra miles added to my journey. Frustrating at the time, but that's the Arc - it's a self-navigation event, and when you're exhausted, mistakes happen. At least this time the blame was entirely my own.</p>

<h2>The Final Push</h2>

<p>St Ives arrived at 10:30am, 22.5 hours into the race. The Arc Angels volunteers welcomed me in, and I knew the worst was behind me. From here it was flatter, easier running around the bay through Hayle, across the dunes, past Godrevy lighthouse to the final checkpoint at Portreath.</p>

<p>I was shattered. The pace from St Ives onwards had been slower than I'd wanted, and I was disappointed in myself. But I still had a shot at a PB if I could find something for the final miles.</p>

<p>The finish had moved since my previous attempts - no longer at the Blue Bar on the beach, but down a hill, out of Portreath, and up another hill to the Eco Park. An extra mile when you've already done 100.</p>

<h2>The Tears</h2>

<p>I crossed the line in 28 hours, 31 minutes and 46 seconds. A personal best. A gold buckle (awarded for finishing under 30 hours).</p>

<p>And I cried.</p>

<p>Not everyone will understand those tears. But anyone who's pushed themselves through 100 miles - through darkness and hailstones and navigational errors and sheer physical exhaustion - will recognise what they mean. It's relief that you've crossed the line without injury, without having to pull out, without falling off a cliff. It's gratitude that your body held together. It's pride and satisfaction and an outpouring of emotion that doesn't come often in life.</p>

<p>I don't cry at every finish line. But I cry at the ones that have really put me through the wringer, the ones that have demanded everything. The Arc is one of those races.</p>

<h2>The Morning After</h2>

<p>The prize-giving the next day celebrated Kim Collison's stunning course record of 20 hours 43 minutes. Extraordinary running. For the rest of us, the achievement was simply finishing - earning that gold buckle, completing one of Britain's most unforgiving ultramarathons.</p>

<p>The Arc of Attrition isn't just a race. It's an adventure. It's a test of navigation and mental fortitude as much as physical endurance. It will humble you, frustrate you, and push you to places you didn't know you could go.</p>

<p>If you have even the slightest inkling that you might like to try it, sign up. You won't regret it.</p>

<h2>Watch the Video</h2>

<div class="video-embed">
<iframe width="560" height="315" src="https://www.youtube.com/embed/8am881lX1J4" frameborder="0" allowfullscreen></iframe>
</div>

<h2>Strava Activity</h2>

<div class="strava-embed-placeholder" data-embed-type="activity" data-embed-id="2121357724" data-style="standard" data-from-embed="false"></div>
<script src="https://strava-embeds.com/embed.js"></script>
`;

async function main() {
  console.log('Adding Arc of Attrition blog post...');

  // Check if category exists
  let category = await prisma.terms.findFirst({
    where: { slug: 'race-reports', taxonomy: 'category' },
  });

  if (!category) {
    category = await prisma.terms.create({
      data: {
        name: 'Race Reports',
        slug: 'race-reports',
        taxonomy: 'category',
      },
    });
  }

  // Check if post already exists
  const existing = await prisma.posts.findUnique({
    where: { slug: 'arc-of-attrition-100-2019' },
  });

  if (existing) {
    console.log('Post already exists, updating...');
    await prisma.posts.update({
      where: { slug: 'arc-of-attrition-100-2019' },
      data: {
        title: 'Arc of Attrition 100 | 2019',
        content: arcContent,
        excerpt: "The Arc of Attrition has a way of testing you before you've even started. Snow chaos, marble-sized hailstones, navigation errors in the dark - this is the story of my third attempt at Britain's most brutal 100-miler.",
        featured_image: '/images/blog/2019/arc-of-attrition-coastal-path.jpg',
        read_time: 10,
        published_at: new Date('2019-02-01'),
      },
    });
    console.log('Post updated!');
  } else {
    const post = await prisma.posts.create({
      data: {
        title: 'Arc of Attrition 100 | 2019',
        slug: 'arc-of-attrition-100-2019',
        content: arcContent,
        excerpt: "The Arc of Attrition has a way of testing you before you've even started. Snow chaos, marble-sized hailstones, navigation errors in the dark - this is the story of my third attempt at Britain's most brutal 100-miler.",
        featured_image: '/images/blog/2019/arc-of-attrition-coastal-path.jpg',
        status: 'published',
        post_type: 'post',
        read_time: 10,
        published_at: new Date('2019-02-01'),
      },
    });

    await prisma.post_terms.create({
      data: {
        post_id: post.id,
        term_id: category.id,
      },
    });

    console.log(`Post created with ID: ${post.id}`);
  }

  console.log('Done! Visit: http://localhost:3000/blog/arc-of-attrition-100-2019');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
