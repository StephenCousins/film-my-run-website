import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const goodwoodContent = `
<p><strong>Date:</strong> 6th December 2020 | <strong>Distance:</strong> 26.2 miles | <strong>Time:</strong> 2:58:57 | <strong>Position:</strong> 46th</p>

<p>Eight years. That's how long it took me to break the three-hour barrier in the marathon. From my first tentative steps as a runner in 2010, through countless training miles, niggling injuries, and gradual improvements - it all came down to one freezing cold December morning at Goodwood Motor Circuit.</p>

<p>2:58:57. Sixty-three seconds under the magic number. My first sub-3 marathon.</p>

<h2>The Eight-Year Journey</h2>

<p>When I ran my first marathon in Paris back in 2012, finishing in around 3:30, breaking three hours felt like a distant dream. Over the following years, I chipped away at my times - 3:15 became the norm, then 3:09 at the 2016 London Marathon. But that last nine minutes proved stubborn.</p>

<p>The truth is, you can't shortcut your way to a sub-3 marathon. Some runners are blessed with natural speed and can achieve it with minimal preparation, but for the rest of us, it's a process that begins the moment you first lace up your trainers. Your body needs years of consistent running to build the aerobic base required - to reach that point where you can roll out of bed and knock out 10 miles without thinking about it.</p>

<h2>Building the Engine</h2>

<p>In the six months leading up to Goodwood, I transformed my training. Previously I'd been running around 40 miles per week, but I knew that wouldn't be enough. I committed to 100+ kilometre weeks as a baseline, with some blocks hitting 130, 140, even 150 kilometres in a single week.</p>

<p>The key was the 80/20 approach. Eighty percent of my running was deliberately slow - embarrassingly slow at times - which allowed me to absorb the high volume without breaking down. The remaining twenty percent was brutally hard: interval sessions on the treadmill, lung-busting 5k time trials where I'd push into zones four and five. I religiously avoided that comfortable middle ground of zone three running - the "junk miles" that tire you out without making you faster.</p>

<p>By race day, the numbers suggested I was ready. An 18:35 5k a few weeks out. A test half marathon at 1:30, run entirely in zone two. The race predictors were split - some said just over three hours, some just under - but I knew I had the fitness if I could execute the plan.</p>

<h2>The Unconventional Approach</h2>

<p>My nutrition strategy might raise eyebrows. A week out, I did a three-day carbohydrate depletion, followed by a modest increase in carbs relative to fats and proteins. Nothing extreme - I don't believe in traditional carb loading.</p>

<p>On race morning, breakfast was a tin of rice pudding and two cups of coffee. Simple, easy on the stomach, slow-release energy.</p>

<p>And during the race itself? Nothing until mile 20. No gels, no sports drinks, no water. Just focusing on the task at hand. At 20 miles I took half a banana and a bottle of fizzy fruit drink - a combination of slow-release carbs and a quick sugar hit to carry me home.</p>

<p>This minimal fueling approach comes from years of training my body to burn fat efficiently. Running on empty in training teaches your system to tap into fat stores rather than constantly demanding sugar. It's not for everyone, but it works for me - and it sidesteps the stomach issues that plague so many marathon runners.</p>

<h2>Race Day: Goodwood</h2>

<p>The Goodwood Marathon is an unusual beast. Eleven laps of a roughly 4-kilometre circuit around the famous motor racing venue. It's flat and fast, but brutally exposed to the elements. On race day, the conditions were challenging: freezing temperatures and a persistent wind that turned two and a half kilometres of every lap into a battle.</p>

<p>I wore the Nike VaporFlys - those controversial carbon-plated shoes that genuinely do make you faster. A light fleece over my race singlet for the first three laps until my body warmed up, then I tossed it aside. Thin gloves and a cap stayed on throughout.</p>

<p>Pacing was everything. For a sub-3 marathon, you need to average 14.1 kilometres per hour - that's 4:16 per kilometre or 6:50 per mile. I kept my watch showing average pace in km/h, constantly checking I was holding the required speed. The wind made individual lap times meaningless, but the overall average told the truth.</p>

<h2>The Final Lap</h2>

<p>Coming into the final kilometres, the maths was tight. The GPS showed I'd run 42.4 kilometres - an extra 200 metres of weaving around other runners. Those extra metres had cost me time, and I found myself having to sprint the final stretch to guarantee I'd duck under three hours.</p>

<p>Crossing the line, the watch showed 2:58:57.</p>

<p>My friend Richard finished in 3:03, matching his PB. We stood there in the freezing cold, barely able to feel our extremities, grinning like idiots. "I can now retire," I joked. "I never have to run another marathon ever again."</p>

<p>Of course, I don't mean it. If anything, breaking three hours has raised the bar. Now I'd be disappointed with anything over three hours on a flat road marathon. That's the thing about running - achieve one goal and the next one immediately appears on the horizon.</p>

<h2>What It Takes</h2>

<p>Looking back, I can distill the journey into a few key principles:</p>

<ul>
<li><strong>Patience:</strong> Building the aerobic base takes years, not months</li>
<li><strong>Volume:</strong> You need to run more miles than feels comfortable - 100km weeks minimum for serious sub-3 attempts</li>
<li><strong>Polarised training:</strong> Run slow most of the time, hard some of the time, rarely in between</li>
<li><strong>Race execution:</strong> Know your target pace, trust your preparation, don't panic</li>
<li><strong>Simplify fueling:</strong> Your body can run further on less than you think</li>
</ul>

<p>Eight years of running marathons, and I'm finally there. The sub-3 club has a new member - and it turns out the entry fee is measured in years, not weeks.</p>

<h2>Watch the Video</h2>

<div class="video-embed">
<iframe width="560" height="315" src="https://www.youtube.com/embed/I451mB-1aBU" frameborder="0" allowfullscreen></iframe>
</div>

<h2>Strava Activity</h2>

<div class="strava-embed-placeholder" data-embed-type="activity" data-embed-id="4437234030" data-style="standard" data-from-embed="false"></div>
<script src="https://strava-embeds.com/embed.js"></script>
`;

async function main() {
  console.log('Updating Goodwood Marathon blog post with rewritten content...');

  // Update the post
  await prisma.post.update({
    where: { slug: 'how-i-ran-my-first-sub-3-marathon-goodwood-2020' },
    data: {
      title: 'How I Ran My First Sub-3 Marathon | Goodwood 2020',
      content: goodwoodContent,
      excerpt: "Eight years. That's how long it took me to break the three-hour barrier. From my first marathon in 2012 to that freezing December morning at Goodwood - this is the story of how I finally ran 2:58:57.",
      readTime: 8,
    },
  });

  console.log('Post updated!');
  console.log('Visit: http://localhost:3000/blog/how-i-ran-my-first-sub-3-marathon-goodwood-2020');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
