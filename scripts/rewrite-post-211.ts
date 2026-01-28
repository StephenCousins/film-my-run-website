import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const post211Content = `<p>The Lakeland 100 has a reputation. Forty to fifty percent of runners don't make it to the finish line in a normal year. In 2022, with relentless rain turning the fells into rivers and the trails into bogs, those odds felt optimistic.</p>

<p>I finished in 34 hours and 36 minutes. Slower than I'd hoped, faster than many. More importantly, I finished at all.</p>

<figure><img src="/images/blog/2022/lakeland-100-01.jpg" alt="The Lakeland 100 - starting in Coniston" /></figure>

<h2>The Beast of British Ultras</h2>

<p>The Montane Lakeland 100 is often described as the hardest 100-mile race in the UK. It's actually 105 miles with over 6,000 metres of climbing, looping through the Lake District from Coniston and back again. The terrain is relentless - there's almost no flat running, just constant climbing and descending through some of Britain's most spectacular (and unforgiving) landscape.</p>

<p>In 2022, 1,865 runners lined up across the 100 and 50-mile distances. I was one of them, standing in Coniston village on a morning that already promised trouble.</p>

<div class="strava-embed-placeholder" data-embed-type="activity" data-embed-id="7560717387" data-style="standard" data-from-embed="false"></div><script src="https://strava-embeds.com/embed.js"></script>

<h2>The Lake District's True Character</h2>

<p>The weather forecast had been ominous all week, and the fells delivered. Within hours of the start, the heavens opened and the Lake District showed us exactly how wet it can get. This wasn't passing showers - this was biblical rain that turned every descent into a waterfall and every flat section into a bog.</p>

<p>The climb from Fusedale to Haweswater became an exercise in survival. Rain hammered down, a cold headwind cut through every layer, and the paths disappeared under inches of standing water. You couldn't run it - you could barely walk it.</p>

<figure><img src="/images/blog/2022/lakeland-100-03.jpg" alt="Rain-soaked trails through the Lake District" /></figure>

<h2>The Long Night</h2>

<p>Darkness in the Lake District is different from other ultras. The terrain doesn't ease up because you can't see it anymore. If anything, the navigation becomes harder, the rocky descents more treacherous, and the psychological battle more intense.</p>

<p>By the time I reached the major checkpoints in the early hours, I'd lost count of the runners I'd seen withdraw. Some were injured, some hypothermic, some simply broken by conditions that seemed determined to break everyone. At one aid station, volunteers were wrapping runners in foil blankets, trying to warm them enough to continue.</p>

<h2>A Race of Attrition</h2>

<p>The front of the race told an extraordinary story. Andy Berry, in his first ever 100-mile race, had chased down long-time leader Jarlath McKenna in the final 6km from Tiberthwaite checkpoint. Berry crossed the line in 20:03:11 - more than 14 hours ahead of me, but that's not the point. The point is that even the elite suffered in these conditions.</p>

<p>In the 50-mile race, Katie Kaars Sijpesteijn set a new women's course record despite the apocalyptic weather. Proof that some runners thrive when everything goes wrong.</p>

<figure><img src="/images/blog/2022/lakeland-100-02.jpg" alt="Pushing through the Lakeland terrain" /></figure>

<h2>The Final Push</h2>

<p>Dawn on the second day brought little relief. The rain had finally stopped, but the damage was done - the trails were destroyed, my feet were destroyed, and my body was running on fumes and stubbornness.</p>

<p>The final miles back to Coniston are supposed to be a victory lap. They didn't feel like it. Every step was an argument with my legs, every incline a negotiation with my willpower. But the thought of stopping, of joining the DNF statistics, was worse than continuing.</p>

<h2>Crossing the Line</h2>

<p>34 hours, 36 minutes, and 56 seconds. My GPS showed 171.5 kilometres and 6,248 metres of climbing - the course is generous like that. I was soaked, exhausted, and utterly satisfied.</p>

<p>The Lakeland 100 isn't a race you enter to set a time. It's a race you enter to test yourself against one of the most demanding courses in British ultrarunning. In 2022, with conditions that pushed the DNF rate even higher than usual, simply finishing felt like victory.</p>

<figure><img src="/images/blog/2022/lakeland-100-04.jpg" alt="Lakeland 100 finish in Coniston" /></figure>

<h2>Would I Do It Again?</h2>

<p>Ask me that question an hour after finishing, and the answer was an emphatic no. Ask me now, and I'm checking next year's entry dates. That's the paradox of ultras like the Lakeland 100 - they're awful while you're doing them, and addictive the moment you stop.</p>

<p>If you're considering entering, do it. Just pack more waterproofs than you think you'll need. The Lake District always wins eventually.</p>

<h2>Race Stats</h2>

<ul>
<li><strong>Event:</strong> Montane Lakeland 100</li>
<li><strong>Date:</strong> 29th July 2022</li>
<li><strong>Distance:</strong> 171.5km (GPS)</li>
<li><strong>Elevation:</strong> 6,248m</li>
<li><strong>Time:</strong> 34:36:56</li>
<li><strong>Winner:</strong> Andy Berry - 20:03:11</li>
</ul>

<figure><img src="/images/blog/2022/lakeland-100-race-analysis.png" alt="Strava race analysis showing pace and elevation" /></figure>

<div class="video-embed my-8">
  <iframe src="https://www.youtube.com/embed/placeholder" frameborder="0" allowfullscreen></iframe>
</div>`;

async function main() {
  const result = await prisma.posts.update({
    where: { id: 211 },
    data: {
      content: post211Content,
      updated_at: new Date()
    }
  });
  console.log(`✅ Updated post ${result.id}: ${result.title}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
