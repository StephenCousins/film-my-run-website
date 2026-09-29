import json, random, itertools, math
# Axes: S road(+)/trail(-), M data(+)/feel(-), D short(+)/long(-), R racer(+)/social(-)
Q = [
 ("6am Saturday. It's chucking it down. You...", [
   ("Go to parkrun. Obviously. The barcode's already in your pocket.", dict(S=1,D=2,R=-2)),
   ("Head for the hills. Rain makes the bogs better.", dict(S=-2,M=-1)),
   ("Treadmill. The plan says 6 x 800m and the plan is the plan.", dict(M=2,D=1,R=1)),
   ("Twenty miles anyway. The long run doesn't care about weather.", dict(D=-2,R=1)),
 ]),
 ("Your watch dies on the start line.", [
   ("Panic. Borrow one. Seriously consider going home.", dict(M=2,R=1)),
   ("Brilliant. Now I can just run.", dict(M=-2,R=-1)),
   ("Pace off the runner in front and count the mile markers.", dict(S=1,R=2)),
   ("Doesn't matter. I've got the map.", dict(S=-2,M=-1)),
 ]),
 ("Pick a finish line.", [
   ("The Mall. Medal round your neck, crowds ten deep.", dict(S=2,D=-1,R=-1)),
   ("A village hall in the Lakes. Tea, soup and a raffle.", dict(S=-2,M=-1,R=-1)),
   ("Chamonix at 4am, 170km after you started.", dict(S=-2,D=-2,R=1)),
   ("A floodlit track. Last lap of a 5000m. The bell is ringing.", dict(S=2,D=2,R=2)),
 ]),
 ("What's stuck to your fridge?", [
   ("A training plan. Every session colour-coded.", dict(M=2,R=1)),
   ("A parkrun milestone certificate.", dict(D=1,R=-2)),
   ("A race number with a bog stain on it.", dict(S=-2,M=-1)),
   ("Your PBs on a Post-it. Updated in pen.", dict(D=1,R=2)),
 ]),
 ("The hill ahead is steep. You...", [
   ("Walk it. Power hiking is a skill. Eat something.", dict(S=-1,D=-2,R=-1)),
   ("Attack it. Hills are where races are won.", dict(S=-1,R=2)),
   ("Find the road that goes round it.", dict(S=2,M=0)),
   ("Look at what it did to your heart rate afterwards.", dict(M=2)),
 ]),
 ("Your Sunday long run ends with...", [
   ("Coffee and cake with the club.", dict(R=-2,M=-1)),
   ("An upload, a kudos check and a proper look at the splits.", dict(M=2,S=1)),
   ("A pint in a pub you've never seen before, 30 miles from home.", dict(S=-1,D=-2,M=-1)),
   ("Long run? It's 45 minutes. Sunday is for recovery.", dict(D=2,R=1)),
 ]),
 ("Entries open at 9am. You're entering...", [
   ("The London ballot. Again.", dict(S=2,D=-1,R=-1)),
   ("A 100-miler with qualifying points and a waiting list.", dict(S=-1,D=-2,M=1,R=1)),
   ("The club championship 10K.", dict(D=1,R=-1)),
   ("A backyard ultra. Last one standing. No finish line.", dict(D=-2,R=2,M=1)),
 ]),
 ("Someone asks your marathon PB.", [
   ("To the second. Plus the story of the headwind at mile 20.", dict(M=1,R=2)),
   ("About four hours? I stopped for a photo with a man dressed as a rhino.", dict(M=-1,R=-2)),
   ("I don't really do marathons. Too short.", dict(D=-2)),
   ("I don't really do marathons. Too long.", dict(D=2)),
 ]),
 ("You've got £300 to spend. You buy...", [
   ("A new GPS watch and a chest strap.", dict(M=2)),
   ("A proper waterproof and a compass.", dict(S=-2,M=-1)),
   ("Race entries. Lots of race entries.", dict(R=1,R2=0, D=0)),
   ("Carbon-plated super shoes.", dict(S=2,D=1,R=1)),
 ]),
 ("Halfway through a race, you're...", [
   ("Chatting to the person next to you. You'll be mates by the finish.", dict(R=-2)),
   ("Doing sums. Pace, fuel, time to the next checkpoint.", dict(M=2,D=-1)),
   ("Hurting and loving it. Someone's getting overtaken.", dict(R=2,D=1)),
   ("Looking at the view. You came for this.", dict(S=-2,M=-1,R=-1)),
 ]),
 ("Dream running holiday.", [
   ("Chamonix in August.", dict(S=-2,D=-1)),
   ("A city break, timed perfectly to a marathon.", dict(S=2,D=-1)),
   ("Three weeks at altitude with a coach and a spreadsheet.", dict(M=2,R=2)),
   ("Anywhere with a parkrun you haven't done yet.", dict(S=1,D=2,R=-2)),
 ]),
 ("Why do you run?", [
   ("To see how fast I can go.", dict(D=1,R=2)),
   ("To be with my people.", dict(R=-2)),
   ("To get properly lost.", dict(S=-2,M=-2,D=-1)),
   ("Because the numbers keep getting better.", dict(M=2)),
 ]),
]
for q in Q:
  for a in q[1]: a[1].pop('R2',None)
# Fix the vague race-entries answer.
Q[8][1][2] = ("Race entries. Lots of race entries.", dict(R=1,M=-1))

T = [
 dict(id="track", name="Track Purist", colour="#d63a2f", target=[90,80,95,90],
  line="One lane, one clock, no excuses.",
  profile="You like your running measured to the centimetre. You know your 400m splits from races years ago and you have strong opinions about spikes. Road races are fine, but the track is where the truth lives.",
  traits=["Owns more spikes than trainers","Can tell you the lap record at their local track","Warms up for longer than most people race"],
  famous="Josh Kerr, Keely Hodgkinson", race="A 5000m on a warm evening, with a pacer", mantra="The clock doesn't lie."),
 dict(id="marathon", name="Marathon Hunter", colour="#e8762c", target=[85,85,30,90],
  line="Sixteen-week blocks and a spreadsheet for everything.",
  profile="Your year runs in training blocks. You've studied the Berlin elevation profile and you know exactly how many gels you take and when. The marathon is the perfect distance. Long enough to hurt, short enough to race.",
  traits=["Has a pace band for every marathon they've run","Plans annual leave around the race calendar","Talks about 'the wall' like an old enemy"],
  famous="Eliud Kipchoge, Paula Radcliffe", race="Berlin. Flat, fast, cold morning", mantra="Trust the training."),
 dict(id="parkrun", name="Parkrun Faithful", colour="#3a9a5b", target=[75,40,85,15],
  line="Saturday, 9am. Non-negotiable.",
  profile="You've run in hail, heatwaves and once on Christmas Day, which took some explaining. Your barcode is laminated, your tourist tally is growing and you've volunteered nearly as often as you've run. It's the best free thing in Britain.",
  traits=["Barcode in every jacket pocket","Plans holidays around new parkruns","Knows the first-timers' briefing word for word"],
  famous="The volunteers in hi-vis at every one", race="A parkrun you haven't done, somewhere odd", mantra="See you Saturday."),
 dict(id="bigcity", name="Big City Marathoner", colour="#c2408f", target=[90,30,30,20],
  line="Crowds, costumes and a medal the size of a saucer.",
  profile="You run for the atmosphere. Strangers shouting your name, the bands under the bridges, the man dressed as a rhino. The time on the clock matters less than the story you tell afterwards, and you tell it often.",
  traits=["Name printed on the front of the vest","Has run past a Big Ben costume at least once","The finish photo is still their profile picture"],
  famous="Kevin Sinfield", race="London. Tower Bridge, the Mall, the lot", mantra="Every mile means something."),
 dict(id="fell", name="Fell Runner", colour="#7a6a3a", target=[10,15,55,70],
  line="Map, compass, bog. Tea afterwards.",
  profile="You don't need a waymarked trail, you need a hill and a line up it. Your races cost a fiver, start from a pub car park and finish with soup. You're fast downhill in a way that frightens people.",
  traits=["Knows the difference between a bog and a proper bog","Kit list includes a whistle and a cag","Has never once looked at their average pace"],
  famous="Joss Naylor", race="A Lakes classic with a checkpoint on every summit", mantra="Straight up. Straight down."),
 dict(id="sky", name="Sky Racer", colour="#2f7fc1", target=[15,80,55,85],
  line="Measures runs in metres climbed, not kilometres.",
  profile="You chase vertical. Your training is hill reps and your watch knows your climbing rate better than your friends know you. You're properly competitive, but the mountain is always the real opponent.",
  traits=["Calves that could crack walnuts","Poles, and they know how to use them","Checks the elevation profile before the distance"],
  famous="Kilian Jornet", race="A skyrace with a ridge in the middle", mantra="Up is the only direction."),
 dict(id="hundred", name="Hundred Miler", colour="#5b3f8f", target=[30,75,5,65],
  line="Checkpoint to checkpoint, all through the night.",
  profile="A hundred miles doesn't scare you, it organises you. You've got a crew plan, a fuel plan and a plan for when the plans go wrong. You know which checkpoint does the best soup and you've learned to love 3am.",
  traits=["Owns more head torches than hats","Has a crew spreadsheet with tabs","Can eat a sandwich at 10 minutes a mile"],
  famous="Courtney Dauwalter, Jim Walmsley", race="A Centurion hundred, finishing in the dark", mantra="Relentless forward progress."),
 dict(id="wanderer", name="Ultra Wanderer", colour="#4f8a7a", target=[15,10,10,15],
  line="Long days out. The sandwich stop is part of the plan.",
  profile="You run far because you like being out there, not because anyone's timing you. You walk the hills, stop for the view and know every good cafe on the South Downs Way. Getting there is the point.",
  traits=["Packs a proper lunch for a long run","Takes photos at every stile","Has never raced the last mile in their life"],
  famous="Stephen Cousins, on a good day", race="A long trail with good views and better cake", mantra="Time on feet."),
 dict(id="backyard", name="Backyard Brawler", colour="#8a2f3f", target=[50,70,5,95],
  line="6.7 kilometres, every hour, until everyone else stops.",
  profile="You like a fight with no finish line. Every hour on the hour, the same loop, until you're the last one standing. It's the most stubborn event in running and you're the most stubborn runner in the field.",
  traits=["Plans each lap to the minute","Treats the start pen as a rest area","Thinks 'last one standing' is a lifestyle"],
  famous="Harvey Lewis", race="A backyard ultra that goes on for days", mantra="One more lap."),
 dict(id="lab", name="Lab Rat", colour="#1f8f8f", target=[55,97,55,55],
  line="If it isn't on Strava, it didn't happen.",
  profile="You love the numbers. Heart rate, lactate threshold, ground contact time, the lot. You've read the research, you've got opinions about zone 2 and your watch has more settings than your car. Every run is data.",
  traits=["Wears two watches to compare them","Has a favourite training load metric","Reads studies about carbohydrate for fun"],
  famous="Every Garmin forum moderator", race="Any race with chip timing and live splits", mantra="Measure everything."),
 dict(id="club", name="Club Stalwart", colour="#d9a21b", target=[60,35,55,8],
  line="Tuesday reps, Thursday hills, Sunday cake.",
  profile="You're the heart of your running club. You've run every relay, marshalled every race and you know everyone's name and their dog's name. Your PBs matter less than getting the team round.",
  traits=["Owns more club vests than T-shirts","Always brings the jelly babies","Has organised at least one Christmas social"],
  famous="Every club's longest-serving member", race="The club relay, with a barbecue after", mantra="Nobody gets left behind."),
 dict(id="free", name="Free Runner", colour="#6b7fa8", target=[45,5,55,35],
  line="No watch, no plan, no problem.",
  profile="You run because it clears your head. You go out when it feels right and come back when you've had enough. You couldn't tell anyone your 10K time, and honestly you've never been happier.",
  traits=["Has a watch, forgets to charge it","Runs a different route every time","Says 'it was lovely' when asked how far"],
  famous="Forrest Gump", race="Whatever route the morning suggests", mantra="Just run."),
]

def norm(q_answers):
  axes="SMDR"
  lo={a:0 for a in axes}; hi={a:0 for a in axes}
  for _,opts in Q:
    for a in axes:
      vals=[o[1].get(a,0) for o in opts]; lo[a]+=min(vals); hi[a]+=max(vals)
  raw={a:0 for a in axes}
  for qi,ai in enumerate(q_answers):
    for a,v in Q[qi][1][ai][1].items(): raw[a]+=v
  return [round(100*(raw[a]-lo[a])/(hi[a]-lo[a])) for a in axes]

def match(s):
  d=sorted(T,key=lambda t: math.dist(t['target'],s))
  return d[0]['id'], d[1]['id']

random.seed(1)
from collections import Counter
c=Counter(match(norm([random.randrange(4) for _ in Q]))[0] for _ in range(20000))
print("random answers:", c.most_common())
# Persona test: for each type, pick per question the answer nearest that type's target direction.
axes="SMDR"
for t in T:
  want=[(v-50)/50 for v in t['target']]
  ans=[max(range(4),key=lambda i: sum(Q[qi][1][i][1].get(a,0)*want[k] for k,a in enumerate(axes))) for qi in range(len(Q))]
  s=norm(ans); print(f"{t['name']:20} persona -> {match(s)} scores {s}")
json.dump(dict(axes=[{"id":"S","low":"Trail","high":"Road"},{"id":"M","low":"Feel","high":"Data"},{"id":"D","low":"Long","high":"Short"},{"id":"R","low":"Social","high":"Racer"}],
  questions=[{"q":q,"answers":[{"text":t,"scores":s} for t,s in opts]} for q,opts in Q], types=T), open('quiz.json','w'), indent=1, ensure_ascii=False)
