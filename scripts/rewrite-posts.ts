import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Post 210: UTS 50k by UTMB 2022
const post210Content = `<p>There's a moment on every mountain race when you stop and think: "What am I doing here?" For me, that moment came somewhere on the scramble up Y Lliwedd, hands on rock, legs screaming, wind battering, with Victoria somewhere behind me. We'd already climbed Snowdon once. We were about to do it again. And we still had 15 kilometres to go.</p>

<p>The UTS 50k - Ultra-Trail Snowdonia - had become the only UTMB World Series event in the UK. That alone made it special. But what made it unforgettable was sharing it with my wife.</p>

<figure><img src="/images/blog/2022/uts-50k-snowdonia-01.jpg" alt="Looking back at the field climbing through Snowdonia" /></figure>

<h2>The Race</h2>

<p>The 2022 edition was historic - the first year that Ultra-Trail Snowdonia joined the UTMB World Series, bringing those coveted Running Stones to Welsh soil. Over 1,000 runners from more than 40 countries descended on Llanberis, the former slate mining town nestled at the foot of Snowdon.</p>

<p>Our 50k started in better conditions than the longer distances - the 165k had been abandoned due to weather, and the 100k runners had set off at 4am in torrential rain. By the time we gathered at the National Slate Museum, the skies were clearing.</p>

<p>But don't let that fool you. With 3,100 metres of elevation gain across 50 kilometres - including two ascents of Snowdon via different routes - this was never going to be a gentle introduction to mountain running.</p>

<div class="strava-embed-placeholder" data-embed-type="activity" data-embed-id="7405081701" data-style="standard" data-from-embed="false"></div><script src="https://strava-embeds.com/embed.js"></script>

<h2>The Classic UTMB Bottleneck</h2>

<p>Every UTMB race in the world suffers from the same phenomenon. A few kilometres in, before anyone has spread out, you hit a narrow section - a gate, a stile, a rocky passage - and suddenly 500 runners are queuing like it's the January sales. Wales was no exception.</p>

<p>The first checkpoint at 15.5 kilometres came after 400 metres of climbing over six kilometres. Victoria was moving well, the views behind us were spectacular, and apart from the bottleneck, everything was going to plan.</p>

<h2>Where Things Got Serious</h2>

<p>The terrain in Snowdonia is different from anything I'd experienced in the Alps or Pyrenees. The course notes had warned us: "Very rough underfoot with long sections of rocky terrain. Short sections of easy scrambling where there is some exposure."</p>

<p>They weren't exaggerating. After the relative comfort of the first section, we dropped down towards the second aid station through steep gradients, thick mud, and bogs that swallowed your feet whole. Four and a half hours in, we were still on target for between 10 and 12 hours. But the real test was coming.</p>

<figure><img src="/images/blog/2022/uts-50k-snowdonia-04.jpg" alt="Navigating the technical terrain of Snowdonia" /></figure>

<h2>The Scramble That Made It Special</h2>

<p>After summiting Snowdon the first time via the Llanberis Path, we descended the notorious Watkin Path - terrain that demands complete concentration with every step. Loose scree, steep drops, and that Welsh slate that seems designed to send you sliding.</p>

<p>Then came the section that transformed this race from merely hard into genuinely memorable: the traverse along the ridge to Y Lliwedd, scrambling up rocks and boulders at 20 miles into a 50k.</p>

<figure><img src="/images/blog/2022/uts-50k-snowdonia-03.jpg" alt="The scramble along the ridge to Y Lliwedd" /></figure>

<p>Standing on top of Y Lliwedd, looking back at Snowdon where we'd been an hour before, with that knife-edge ridge connecting the two summits - this is what mountain running is about. If you want to know whether you'll enjoy this sport, do UTS. If this section makes you feel alive, you're one of us.</p>

<h2>The Final Climb</h2>

<p>The Pen y Pass aid station at 39 kilometres was a welcome sight. Victoria was exhausted - more than eight hours on her feet, with the hardest climbing still fresh in our legs. But she dug in for the final assault: the Pyg Track back up Snowdon, two kilometres of relentless climbing.</p>

<p>We made the summit in nine hours and 55 minutes. Just seven kilometres of descent remained. Easy, I thought. Famous last words.</p>

<h2>Running Stones Earned</h2>

<p>We crossed the line in 11 hours and 16 minutes. Our watches showed 52.8 kilometres and 3,124 metres of climbing - a touch more than advertised, as always seems to happen on mountain courses. Jack Scott had won the men's race in 5:32:26; Kirsteen Welch took the women's title in 6:19:59. We were somewhere in the back half of the 593 finishers.</p>

<p>But the times didn't matter. Victoria now had her UTMB Running Stones. More importantly, we'd shared something that most couples never will - 11 hours of suffering and triumph through some of the most spectacular terrain Britain has to offer.</p>

<figure><img src="/images/blog/2022/uts-50k-snowdonia-02.jpg" alt="Victoria and Stephen at the UTS 50k finish" /></figure>

<h2>The Verdict</h2>

<p>On the path after the finish, we bumped into Mark Derbyshire - holder of course records at the Arc of Attrition and Lakeland 100. He'd been leading the 100-mile race when it was abandoned due to weather. UTMB Chamonix was next on his calendar.</p>

<p>For us, something simpler awaited: the drive home, several days of recovery, and the knowledge that we'd conquered Snowdon twice in one day. The UTS 50k is brutally hard, technically demanding, and absolutely beautiful. If you want proper mountain racing without leaving the UK, this is where you find it.</p>

<h2>Race Stats</h2>

<ul>
<li><strong>Event:</strong> UTS 50k by UTMB</li>
<li><strong>Date:</strong> 2nd July 2022</li>
<li><strong>Distance:</strong> 52.8km (GPS)</li>
<li><strong>Elevation:</strong> 3,124m</li>
<li><strong>Time:</strong> 11:16:17</li>
<li><strong>Finishers:</strong> 593</li>
</ul>

<div class="video-embed my-8">
  <iframe src="https://www.youtube.com/embed/v1lZHK5O-2M" frameborder="0" allowfullscreen></iframe>
</div>`;

async function updatePost(id: number, content: string) {
  const result = await prisma.posts.update({
    where: { id },
    data: {
      content,
      updated_at: new Date()
    }
  });
  console.log(`✅ Updated post ${result.id}: ${result.title}`);
  return result;
}

async function main() {
  console.log('Updating blog posts with rewritten content...\n');

  // Update post 210
  await updatePost(210, post210Content);

  console.log('\n✅ Post 210 updated successfully!');
  console.log('Remaining posts (211-222) will be updated in subsequent runs.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
