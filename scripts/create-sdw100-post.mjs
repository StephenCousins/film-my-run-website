import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const prisma = new PrismaClient();
const R2 = 'https://pub-dbf37311fd7c4d94b4e1f0eb78ebdd18.r2.dev';

const title = 'Filming the Fastest 100 Miles Ever Run on British Soil';
const slug = 'filming-the-fastest-100-miles-on-british-soil-south-downs-way-100-2025';
const excerpt = 'We followed Mark Derbyshire from start to finish at the Centurion South Downs Way 100 — and watched him smash the course record in 13:42, the fastest 100 miles ever run on British trail.';
const featured_image = `${R2}/blog/2025/mark-darbyshire.png`;

const content = `<!-- TL;DR Summary -->
<div class="tldr-box">
  <h4>In Brief</h4>
  <p>We filmed Mark Derbyshire at the 2025 Centurion South Downs Way 100 as he broke the course record in 13:42 — the fastest 100 miles ever run on British trail. A day of patient racing, two rivals undone by cramp, three pacers, and a previous record holder waiting at the finish to shake his hand.</p>
</div>

<div class="stats-grid">
  <div class="stat-item">
    <div class="value">100mi</div>
    <div class="label">Distance</div>
  </div>
  <div class="stat-item">
    <div class="value">13:42</div>
    <div class="label">Winning Time</div>
  </div>
  <div class="stat-item">
    <div class="value">14:03</div>
    <div class="label">Previous Record</div>
  </div>
  <div class="stat-item">
    <div class="value">21min</div>
    <div class="label">Record Broken By</div>
  </div>
</div>

<p>The plan was simple. Follow Mark Derbyshire from the start of the South Downs Way 100 to the finish, hope he wins, and make a documentary about it. That was the plan. What actually happened was eighteen hours of barely controlled chaos, Victoria and I leapfrogging between checkpoints in the van, running on coffee and porridge, trying to stay one step ahead of a man who was about to run 100 miles faster than anyone has ever done on British soil.</p>

<p>I should probably mention that these runners are almost as fast as you can drive it. By the time you've packed up your camera, got back to the van, navigated country lanes to the next checkpoint, and jogged out to find a decent filming spot — they're already there. It's ridiculous.</p>

<h2>4:30am at Matterley Bowl</h2>

<figure>
  <img src="${R2}/blog/2025/stephen-in-the-fmr-van.png" alt="Stephen and Victoria in the Film My Run van at Matterley Bowl before the race start" />
  <figcaption>Base camp. Victoria making coffee in the van at Matterley Bowl before the 4:30am start.</figcaption>
</figure>

<p>We'd had a surprisingly decent night in the van at Matterley Bowl, the birds singing as dawn broke over the South Downs. Victoria made coffee while I sorted the camera gear. A lovely summer morning, the kind that makes you briefly forget you're about to spend the next eighteen hours chasing ultra runners around the Hampshire and Sussex countryside.</p>

<p>Mark Derbyshire was the man everyone expected to win. He holds course records at the Arc of Attrition, Lakeland 100, and UTS — he's the most dominant 100-mile runner British ultra running has ever seen. But 100 miles is 100 miles, and anything can happen. That's what makes filming these races so compelling and so terrifying in equal measure. You're gambling your entire shoot on one person's legs holding up.</p>

<p>I grabbed a quick interview with Mark before the start. He was calm, measured. The plan, he said, was to start steady and build into it — the same approach that had served him in every major race he'd won. No heroics early on. Respect the competition. Let the race come to him.</p>

<h2>The French Guy and the Importance of Patience</h2>

<p>By the time we reached Beacon Hill — the first proper aid station at about 11 miles — the lead pack had already started to sort itself out. A French runner called Adrian had gone off at a pace that made everyone raise their eyebrows. He came through with a lead, but he was running at a tempo that screamed gamble.</p>

<p>Mark was sitting in the pack behind, chatting, running socially. Exactly where he wanted to be.</p>

<p>At Queen Elizabeth Country Park, 22 miles in, I scrambled up Butser Hill to catch the leaders coming down. Adrian was still ahead but paying the price. As he descended towards the checkpoint, his legs gave way completely — full-body cramp, collapsing on the trail. I happened to be right there with the camera. It was one of those moments that tells you everything about the difference between going out hard and going out smart.</p>

<figure>
  <img src="${R2}/blog/2025/mark-darbyshire.png" alt="Mark Derbyshire running through a checkpoint at the South Downs Way 100, race number 2" />
  <figcaption>Mark Derbyshire, race number 2, moving through a checkpoint with the quiet efficiency that defined his entire race.</figcaption>
</figure>

<p>Mark came through looking comfortable. He glanced at the situation, assessed the chasing pack, and made his calculations. James Elson, the race director, put it perfectly: Mark took one look at the calibre of the competition and thought, "I'll respect these guys." He knew the reckless early pace wasn't going to work for him, and he was right.</p>

<h2>The Heat and the Lead Changes</h2>

<p>The day was getting hot. Properly hot. With Adrian fading, a runner called Pete Newman had surged into the lead and was going through at what would have been a 13-hour pace — over an hour inside the course record. Nobody believed he'd hold that, but it set the tone for how fast this field was moving.</p>

<p>Mark was still sitting back, running his own race, steady and patient. By the time we reached Cocking at around 33 miles, runners were putting on ice bandanas and the heat was becoming a real factor. Pete Newman, who'd been leading since QECP, suffered the same fate as Adrian — cramp took him down on the descent into the checkpoint. That opened the door, and Mark walked straight through it. He took the lead at Cocking, and he never gave it back.</p>

<div class="pull-quote">
  <p>"It doesn't make any difference to me whether he wins, breaks the course record. I just want him not to be disappointed with what he has put into it."</p>
</div>

<p>At Washington, 55 miles in, Mark was comfortably in front and up on Mark Perkins' 2014 course record splits in the midst of the hottest part of the day. His mum Helen was there — she'd been crewing him since his first 100-miler in 2019, and she knew exactly what he needed. Water, Tailwind, maybe a cheese sandwich, a scoop of yogurt, and a hug.</p>

<figure>
  <img src="${R2}/blog/2025/stephen-interviewing-louise-at-washington.png" alt="Stephen interviewing Louise, the aid station manager, at the Washington checkpoint" />
  <figcaption>Interviewing Louise, the aid station manager at Washington, while waiting for runners to come through the halfway point.</figcaption>
</figure>

<p>I managed to interview Louise, the aid station manager at Washington, in between runners coming through. She'd been volunteering at Centurion races for years, and she summed up the magic of these events beautifully — you see someone come through at 50 miles saying they're done, that they can't go on, and then you see them again at 80 miles and they're a completely different person.</p>

<h2>Three Pacers and the Long Push Home</h2>

<p>After Washington, Mark picked up his first pacer, and the race shifted from patient accumulation into something more purposeful. The lead was growing, but it needed protecting, and Mark needed company through the long miles ahead.</p>

<p>At Devil's Dyke, 60 miles in, a second pacer took over. It was getting windy up on the ridge and Mark was starting to feel it — but he and his pacer were pulling further ahead. By The Beacon, with the tracker showing half past three in the afternoon, I watched Mark run up a hill that the second-placed runner was walking. That, right there, was the difference.</p>

<p>I said to Victoria at that point: unless Mark totally blows up in the last twenty miles, he's won this race. And he's breaking records.</p>

<h2>The Filming Malarkey</h2>

<p>I should say something about the sheer absurdity of trying to film a 100-mile race with two people and a van. Victoria and I were dashing between checkpoints, arriving with minutes to spare, grabbing the camera, sprinting out to find a spot, filming Mark coming through, then legging it back to the van to do it all again. At Housedean Farm, we drove from the previous checkpoint and Mark ran it in almost the same time. Almost the same time. The man was running at a pace that made driving feel barely faster.</p>

<figure>
  <img src="${R2}/blog/2025/stephen-at-housedean-farm.png" alt="Stephen and Victoria at Housedean Farm checkpoint wearing Centurion 100 Mile lanyards" />
  <figcaption>Victoria and I at Housedean Farm — exhausted from driving, and we weren't even the ones running.</figcaption>
</figure>

<p>By Firle Beacon we were so shattered we gave ourselves five minutes on top of the ridge just to breathe. Mark was still four or five miles away, looking strong, on course record pace. It was beautiful up there, getting cold, blowy — and we still had hours to go.</p>

<p>This is where Dave took over as pacer for the final 13 miles. Dave and Mark were best mates from university — not that they did any running back then. They knew each other so well that Dave could push Mark in a way nobody else could.</p>

<h2>Nine Miles and an Hour and a Half</h2>

<p>Alfriston. Six o'clock in the evening. Twelve and a half hours of running. Nine miles to the finish. And an hour and a half to break a course record that had stood for eleven years.</p>

<p>The maths was tight. Mark was tired — properly tired now, the kind of fatigue that comes from running 91 miles on a hot day. But Dave was doing an incredible job, pushing him, bullying him almost, telling him he was within touching distance of the fastest 100-mile time ever recorded on British trail. From my vantage points I could see Dave twenty metres ahead, dragging Mark along, the gap between them a barometer of how hard Mark was working. I climbed as far as I could up the hill above Alfriston and ran down alongside them for a stretch. Mark was grunting with every stride, but he was moving. Still moving.</p>

<p>At Jevington — the final checkpoint, four miles from home — the clock said 18:24. Mark Perkins' record was 14:03. Mark Derbyshire had roughly an hour and seven minutes to cover those last miles, three of which were downhill to the finish. It was going to be close.</p>

<h2>The Track</h2>

<p>I walked out from Eastbourne Sports Park along the route, waiting to meet Mark and Dave for the final stretch. And there, sitting on a bench at the finish, was Mark Perkins himself. He'd come to watch. He'd been dot-watching all day, and he'd had an inkling it would be Mark Derbyshire who finally took his record. Eleven years he'd held it. He seemed genuinely pleased to be passing it on.</p>

<figure>
  <img src="${R2}/blog/2025/mark-perkins.jpg" alt="Mark Perkins sitting on a bench at Eastbourne Sports Park, the previous course record holder" />
  <figcaption>Mark Perkins — the previous record holder — at Eastbourne Sports Park, waiting to congratulate the new Mark.</figcaption>
</figure>

<p>When Mark appeared, Dave was pushing him to his absolute limit for the final couple of kilometres. I ran in alongside them, filming, trying to keep up, which tells you something about the pace he was still maintaining after 99 miles.</p>

<p>Three times around the track. 13 hours and 42 minutes.</p>

<p>The fastest 100 miles ever run on British trail. Twenty-one minutes inside a course record that many people thought might never be broken. And Mark Perkins was there to shake his hand.</p>

<div class="pull-quote">
  <p>"He was the Mark Derbyshire of his time. This is like the handing of the guard here."</p>
</div>

<p>There's a lovely symmetry to the two Marks. James Elson described Perkins as "the Mark Derbyshire of his time" — the same lean build, the same incredible natural form, the same pure approach to racing. Perkins had run his record in 2014 without even knowing his time, thinking he'd done 15:03 when he'd actually run 14:03. That purity of just running with everything you've got, forgetting the watch, forgetting the numbers. Mark Derbyshire carries that same spirit.</p>

<h2>The Man Behind the Record</h2>

<p>What struck me most, spending the day with Mark's story, was something his mum Helen said. She doesn't care whether he wins or breaks records. She just wants him not to be disappointed with what he's put into it.</p>

<p>Mark didn't come to running until his mid-thirties. Before that, by his own admission, it was drinking, smoking twenty cigarettes a day, not particularly fit. He'd stood in a field as a kid with his hands down his trousers, trying to be forced into cross-country by his dad. Running wasn't his thing.</p>

<p>And then something shifted. Three young kids. A realisation that he couldn't carry on the way he was going. A marathon in Berlin that went surprisingly well. Then Manchester. Then trail races in the Brecon Beacons. Then ultras. Then course records. Then the most dominant 100-mile career British ultra running has ever seen.</p>

<p>He doesn't court sponsorship. He doesn't particularly like the attention. He just wants to run and he wants to race. And on this day, on the South Downs Way, he ran the race of his life.</p>

<h2>Watch the Documentary</h2>

<div class="video-embed">
  <iframe width="100%" height="400" src="https://www.youtube.com/embed/2VwS68uEg04" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

<h2>Behind the Scenes</h2>

<div class="video-embed">
  <iframe width="100%" height="400" src="https://www.youtube.com/embed/t567wdC1eNs" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>`;

async function main() {
  // Check if post already exists
  const existing = await prisma.posts.findFirst({
    where: { slug },
    select: { id: true, title: true }
  });

  if (existing) {
    console.log('Post already exists, updating:', existing.id, existing.title);
    const result = await prisma.posts.update({
      where: { id: existing.id },
      data: { title, content, excerpt, featured_image, updated_at: new Date() }
    });
    console.log('Updated post:', result.id, result.title);
  } else {
    const result = await prisma.posts.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        featured_image,
        status: 'published',
        post_type: 'post',
        published_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      }
    });
    console.log('Created post:', result.id, result.title, result.slug);
  }
}

main().finally(() => prisma.$disconnect());
