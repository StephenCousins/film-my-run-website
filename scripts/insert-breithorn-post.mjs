import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const R2 = 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev/blog/2026';

const title = 'Climbing the Breithorn: Our Family’s First 4,000m Summit';
const slug = 'breithorn-4000m-2026';
const excerpt = 'Three days after finishing the Swiss Alps 100, I roped up with Victoria, Elsa and Ellis to climb the Breithorn — our family’s first 4,000m summit, in the shadow of the mountain my great-great-uncle made famous.';

const content = `<!-- TL;DR Summary -->
<div class="tldr-box">
  <h4>In Brief</h4>
  <p>Four of us climbed the Breithorn near Zermatt, at 4,164 metres — the first 4,000m peak any of us had ever stood on. The Matterhorn Express gondola does most of the work; we climbed the last 400 metres roped together across a glacier riddled with crevasses, one of which briefly swallowed my daughter. Perfect weather, a superb guide, and a summit ridge with a drop on either side. Three days after I'd finished the Swiss Alps 100.</p>
</div>

<div class="stats-grid">
  <div class="stat-item">
    <div class="value">4,164m</div>
    <div class="label">Summit</div>
  </div>
  <div class="stat-item">
    <div class="value">391m</div>
    <div class="label">Ascent</div>
  </div>
  <div class="stat-item">
    <div class="value">5.72km</div>
    <div class="label">Distance</div>
  </div>
  <div class="stat-item">
    <div class="value">2:33:33</div>
    <div class="label">Moving Time</div>
  </div>
</div>

<p>Early one August morning, the four of us walked through the town square in Zermatt, past the Monte Rosa Hotel. In the summer of 1865, my great-great-uncle Edward Whymper sat in that hotel with his companions and planned the first ascent of the Matterhorn. It's my little claim to fame, and I mention it at every possible opportunity, much to my family's delight.</p>

<p>A hundred and sixty-one years later, his great-great-nephew shuffled past the same hotel clutching a rucksack full of Kendal mint cake, heading for a gondola. Because we were not climbing the Matterhorn. We were climbing the mountain opposite.</p>

<figure>
  <img src="${R2}/breithorn-matterhorn-dawn-zermatt.jpg" alt="The Matterhorn at first light, seen from Zermatt" />
  <figcaption>First light on the Matterhorn from Zermatt. My great-great-uncle got here first, and he didn't have a gondola.</figcaption>
</figure>

<h2>The Most Accessible 4,000er in the Alps</h2>

<p>The Breithorn sits across the valley from the Matterhorn at 4,164 metres — you can see one from the other — and it has a reputation as the most accessible 4,000m peak in the Alps. Let me be completely honest about why: the Matterhorn Express gondola does most of the work. From the cable car station you climb roughly the last 400 metres. We were not conquering a giant. We were borrowing its summit for the morning.</p>

<p>But this had been a long time coming. The previous year we'd taken the same cable car up, walked out onto the snow at the top, stared up at that great white dome and decided that one day we'd climb it. This was the day. Me, my wife Victoria, our daughter Elsa and our son Ellis: a family expedition to 4,000 metres, with a proper mountain guide — Jean Baptiste, JB to everyone — to stop us doing anything silly.</p>

<p>None of us had ever stood on a 4,000m mountain before. For the first time in my life, I scrolled past "trail run" on my watch and started a mountaineering activity. The family laughed at me. I felt this was unjustified. We were going up a mountain; I'm allowed.</p>

<h2>Not Quite a Rest Day</h2>

<p>There was one small complication I should mention. Three days earlier, I'd finished the Swiss Alps 100 — 104 kilometres and 5,750 metres of climbing, which took me 24 hours and 42 minutes of moving through the mountains. My legs had covered a hundred kilometres and most of the height of Everest over the previous weekend, and now I was proposing to take them above 4,000 metres for the first time.</p>

<p>On paper, a two-and-a-half-hour walk in the snow sounded like the perfect recovery activity. The altitude had other opinions. At nearly 4,000 metres there is noticeably less oxygen than an ultra runner would like, and my quads were already drafting a formal letter of complaint.</p>

<h2>Roped Together on the Glacier</h2>

<p>At the top of the gondola we walked out across the ski slope, and then everything changed character. Crampons on. Harnesses on. And then the rope — all five of us clipped in with about ten metres between each of us, so that if anyone went into a crevasse, the rest of the party could arrest the fall and haul them out.</p>

<div class="pull-quote">
  <p>"I'd been picturing a nice walk in the snow. Then I noticed just how much rescue kit was hanging off JB's harness, and the penny dropped."</p>
</div>

<p>The chances of falling into a crevasse aren't huge, but they are real, and this is exactly why you hire a guide. Two years earlier I'd stood at the cable car station thinking I could simply follow the line of climbers out across the glacier. Looking at what we crossed that morning, I'm very glad I didn't.</p>

<figure>
  <img src="${R2}/breithorn-glacier-roped-up.jpg" alt="Two of the party on the glacier below the snow dome of the Breithorn" />
  <figcaption>Out on the glacier below the snow dome. Look closely and you can count the crevasse lines running across it.</figcaption>
</figure>

<p>The crevasses were everywhere. Some were obvious — great blue-black fissures in the snow. Others were hidden entirely, which is rather the point of the rope. We crossed our first one on a snow bridge early on, and I pointed the camera down into it as we stepped over. You couldn't see the bottom. You can never see the bottom. It focuses the mind wonderfully.</p>

<h2>Elsa Finds a Crevasse</h2>

<p>And then Elsa fell into one.</p>

<p>I should say immediately: she was fine. It was a small crevasse, she went in while we were walking up, and because we were all roped together she was out again almost before she'd finished going in. The whole thing was over in seconds, and the family verdict — delivered instantly and unanimously — was that it was hilarious. Elsa now holds the honour of being the only member of our family to have actually fallen into a crevasse, a title she seems genuinely proud of.</p>

<p>The one that really spooked us wasn't Elsa's at all. Further up, Ellis stopped at a crossing point that had looked like nothing — just another little hop, same as the ones either side of it. Then he took his glasses off for a proper look, and found it pitch black all the way down: the kind of hole that drops a hundred metres into the glacier. Suddenly the hop had to be timed properly. You take tiny steps over a gap that looks trivial, and you have to remind yourself that beneath the snow the real shape of the thing opens out like a cave. No thank you.</p>

<figure>
  <img src="${R2}/breithorn-roped-line-ascent.jpg" alt="The roped line of climbers ascending the snow slope of the Breithorn" />
  <figcaption>Strung out on the rope, ten metres apart, with half of Switzerland hazy below us.</figcaption>
</figure>

<p>We stopped partway up for a break, the cable car station already far below, and I ate Kendal mint cake on the side of an Alpine mountain — the food of the gods, in its natural habitat. I'd also stripped down to a sleeveless top by this point, and everyone told me I was being an idiot. Honestly, I was just sweating. My deal with the family was simple: if I got cold at the top, they had my full permission to laugh at me.</p>

<h2>The Summit Ridge</h2>

<p>Higher up, JB shortened the ropes and brought us closer together — near the top, the danger changes from hidden crevasses to exposed ground, and you want less slack between you. Fresh snow had fallen overnight, so we were kicking steps through soft powder, stepping aside on the zigzags to let descending climbers past. The Breithorn is a popular mountain on a perfect day, and this was a perfect day: sunshine, light wind, glorious views in every direction. It could so easily have been cloud and driving snow.</p>

<p>The summit ridge is where it gets properly Alpine. It's narrow, with a serious drop to the left and another to the right, and a queue of climbers waiting their turn — the only summit I've ever been to with its own traffic management. Ellis got frightened near the top, and I don't blame him one bit; it's an intimidating place to be when you're a kid and the world falls away on both sides. JB was brilliant with him, calm and reassuring, and between him and Victoria they got Ellis up the final stretch. He made it to the summit. That's what counts, and I'm enormously proud of him.</p>

<p>And then we were all there, 4,164 metres above sea level, the four of us roped together on top of our first 4,000m mountain, with the Matterhorn standing right in front of us. Uncle Edward would have approved. Probably. He might have had notes on our gondola usage.</p>

<figure>
  <img src="${R2}/breithorn-summit-ridge-portrait.jpg" alt="The four of us on the summit ridge of the Breithorn, sun overhead and the ridge running away behind" />
  <figcaption>On top, with the ridge running away behind us and the queue still coming up. Note the sleeveless top, which I maintain was the correct call.</figcaption>
</figure>

<figure>
  <img src="${R2}/breithorn-summit-family.jpg" alt="The four of us roped up on the summit ridge of the Breithorn" />
  <figcaption>The summit of the Breithorn, 4,164m. A drop on either side, the Monte Rosa massif behind, and four very happy first-time four-thousanders.</figcaption>
</figure>

<p>I got chatting to a climber at the top — Scottish, now living in Sweden, and like me complaining about being too hot at 4,000 metres, which felt like a very British problem to be having. Then we turned around and started down.</p>

<figure>
  <img src="${R2}/breithorn-summit-stephen-victoria.jpg" alt="Stephen and Victoria on the summit of the Breithorn" />
  <figcaption>Victoria and me at 4,164m — the highest either of us has ever stood.</figcaption>
</figure>

<h2>Coming Down</h2>

<p>The descent felt longer than the climb, which apparently it always does — once your brain has ticked the summit box, it considers the day finished and stops cooperating. It had clouded over a little but stayed warm, and picking our way back down gave me time to appreciate just how many crevasses we'd walked past on the way up, and to think about all the ones we couldn't see. I would not want to cross that glacier without a rope, and certainly not without crampons. You just don't know what's underneath you.</p>

<figure>
  <img src="${R2}/breithorn-descent.jpg" alt="Four roped climbers descending the Breithorn towards the glacier plateau" />
  <figcaption>Heading back down with the clouds below us. The descent always feels longer — your brain has already gone home.</figcaption>
</figure>

<p>Back at the cable car station, back down the gondola, and back onto the streets of Zermatt — which, at 1,500 metres above sea level, still counts as altitude by the standards of anywhere I normally live. We'd been on the mountain for under three hours of moving time. It felt like far more than that.</p>

<h2>The Stats</h2>

<ul>
  <li><strong>Summit:</strong> Breithorn Western Summit, 4,164m</li>
  <li><strong>Distance:</strong> 5.72km</li>
  <li><strong>Ascent:</strong> 391m (from the cable car station)</li>
  <li><strong>Moving time:</strong> 2:33:33</li>
  <li><strong>Conditions:</strong> Sunny, 14°C in the valley, light NE wind</li>
  <li><strong>Family members lost to crevasses:</strong> 0 (one briefly borrowed)</li>
</ul>

<p>For the data nerds: the Enduraw analysis on Strava reckoned the altitude alone cost us nearly two and a half minutes per kilometre, and the gradient another five and three quarters. It turns out walking uphill at 4,000 metres is hard, even when — especially when — you ran a hundred kilometres three days earlier.</p>

<h2>Worth Every Metre</h2>

<p>This wasn't technical mountaineering, and it was never meant to be. The Breithorn from the cable car is about as gentle an introduction to 4,000m peaks as exists anywhere in the Alps. But it was our introduction, all four of us together, and it was unforgettable — the rope, the crevasses, the ridge, the queue at the top, the Matterhorn filling the sky in front of us.</p>

<p>If you ever get the chance to do something like this, go for it. And book a guide. If you've never travelled on a glacier before, a guide isn't a luxury, it's essential — JB turned what could have been a genuinely dangerous outing into one of the best mornings we've ever had as a family. A year ago we stood at the bottom of that snow dome and said "one day". I'm so glad we made it this day.</p>

<p>Somewhere in Zermatt there's a hotel where my great-great-uncle planned the boldest climb of his age. We didn't add anything to the family legend this time. But we did start one of our own.</p>

<h2>Watch the Film</h2>

<div class="video-embed">
  <iframe width="100%" height="400" src="https://www.youtube.com/embed/QXTAqnIFhpY" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

<h2>Strava Activity</h2>

<div class="strava-embed-placeholder" data-embed-type="activity" data-embed-id="19678997146" data-style="standard" data-from-embed="false"></div>
<script src="https://strava-embeds.com/embed.js"></script>`;

async function main() {
  const existing = await prisma.posts.findFirst({ where: { slug } });
  if (existing) {
    console.log('Post already exists:', existing.id, existing.title);
    return;
  }

  const post = await prisma.posts.create({
    data: {
      title,
      slug,
      content,
      excerpt,
      featured_image: `${R2}/breithorn-matterhorn-dawn-zermatt.jpg`,
      status: 'published',
      post_type: 'post',
      read_time: 7,
      published_at: new Date('2026-08-10T08:00:00Z'),
      created_at: new Date(),
      updated_at: new Date(),
      meta: {
        youtube_id: 'QXTAqnIFhpY',
        strava_id: '19678997146',
      },
    },
  });

  console.log('Created post:', post.id, post.title, post.slug);

  await prisma.post_terms.create({
    data: { post_id: post.id, term_id: 2 },
  });

  console.log('Tagged with Race Reports category');
  console.log(`URL: /blog/${slug}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
