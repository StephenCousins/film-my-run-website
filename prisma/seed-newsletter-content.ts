import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ContentItem {
  category: string;
  title: string;
  body: string;
  url?: string;
  citation?: string;
}

const tools: ContentItem[] = [
  {
    category: 'tool',
    title: 'Running Calculators',
    body: 'Seven different calculators to help you plan your training and racing — pace calculators, race time predictors, age grading, split calculators and more. Essential tools for every runner.',
    url: '/tools/calculators',
  },
  {
    category: 'tool',
    title: 'parkrun Statistics',
    body: 'Track your parkrun journey with detailed statistics, personal bests, venue breakdowns, yearly trends and age category performance. See how you stack up across the UK.',
    url: '/tools/parkrun',
  },
  {
    category: 'tool',
    title: 'How Fast Am I?',
    body: 'Enter your race result from any distance and find out exactly where you rank. Compare your performance against other runners using real race data from Power of 10.',
    url: '/tools/how-fast-am-i',
  },
  {
    category: 'tool',
    title: 'Route Comparison',
    body: 'Upload two or more GPX files and overlay them on the same map. Perfect for comparing different routes, seeing elevation profiles side by side, or analysing course options.',
    url: '/tools/route-comparison',
  },
  {
    category: 'tool',
    title: 'Race Map',
    body: 'Visualise every race you\'ve ever run on an interactive map. See your running journey laid out geographically, from local parkruns to destination races across the country.',
    url: '/tools/race-map',
  },
];

const trainingTips: ContentItem[] = [
  {
    category: 'training_tip',
    title: 'The 80/20 Rule',
    body: 'Around 80% of your weekly running should be at an easy, conversational pace. Research consistently shows that polarised training — mostly easy with some hard sessions — produces better results than running at moderate intensity all the time.',
    citation: 'Seiler, S. (2010). What is best practice for training intensity and duration distribution in endurance athletes? International Journal of Sports Physiology and Performance, 5(3), 276-291.',
  },
  {
    category: 'training_tip',
    title: 'Hill Repeats Build Strength',
    body: 'Short hill repeats (60-90 seconds) improve running economy, leg strength and VO2max without the injury risk of flat-out track sessions. Find a moderate gradient (6-8%) and run hard uphill, then jog back down to recover. Start with 4-6 reps.',
    citation: 'Barnes, K.R. et al. (2013). Running economy and the effects of strength training. Sports Medicine, 43(5), 267-286.',
  },
  {
    category: 'training_tip',
    title: 'Recovery Runs Matter',
    body: 'The day after a hard session, run genuinely easy. Recovery runs promote blood flow to tired muscles without adding significant training stress. If you can\'t hold a full conversation, you\'re going too fast.',
    citation: 'Mujika, I. (2010). Intense training: the key to optimal performance before and during the taper. Scandinavian Journal of Medicine & Science in Sports, 20(Suppl 2), 24-31.',
  },
  {
    category: 'training_tip',
    title: 'Build Mileage Gradually',
    body: 'Increase your weekly running volume by no more than 10% per week. Sudden jumps in mileage are one of the biggest risk factors for injury. Every 3-4 weeks, take a down week at 70-80% of your peak volume.',
    citation: 'Nielsen, R.O. et al. (2012). A prospective study on time to recovery in 254 injured novice runners. PLoS ONE, 7(1), e29397.',
  },
  {
    category: 'training_tip',
    title: 'Tempo Runs for Threshold',
    body: 'Tempo runs at lactate threshold pace (comfortably hard — you can speak in short phrases) improve your ability to sustain faster paces for longer. Aim for 20-40 minutes at tempo pace once a week.',
    citation: 'Farrell, P.A. et al. (1979). Plasma lactate accumulation and distance running performance. Medicine and Science in Sports, 11(4), 338-344.',
  },
  {
    category: 'training_tip',
    title: 'Strength Training for Runners',
    body: 'Two sessions of lower-body strength work per week can improve running economy by 2-8%. Focus on squats, lunges, deadlifts and single-leg exercises. You don\'t need to lift heavy — even bodyweight exercises help.',
    citation: 'Blagrove, R.C. et al. (2018). Effects of strength training on the physiological determinants of middle- and long-distance running performance. Sports Medicine, 48(5), 1117-1149.',
  },
  {
    category: 'training_tip',
    title: 'The Long Run',
    body: 'Your weekly long run builds endurance, fat-burning capacity and mental toughness. Keep it at an easy pace — you should finish feeling like you could run another mile or two. Increase distance gradually over training blocks.',
    citation: 'Midgley, A.W. et al. (2007). Training to enhance the physiological determinants of long-distance running performance. Sports Medicine, 37(10), 857-880.',
  },
  {
    category: 'training_tip',
    title: 'Tapering Before a Race',
    body: 'Reduce your training volume by 40-60% in the final 2-3 weeks before a goal race, while maintaining intensity. This allows your body to recover and supercompensate, typically improving performance by 2-3%.',
    citation: 'Bosquet, L. et al. (2007). Effects of tapering on performance: a meta-analysis. Medicine and Science in Sports and Exercise, 39(8), 1358-1365.',
  },
  {
    category: 'training_tip',
    title: 'Cross-Training Benefits',
    body: 'Low-impact activities like cycling, swimming or pool running maintain cardiovascular fitness while giving your running muscles a break. Especially useful during injury recovery or high-mileage phases.',
    citation: 'Millet, G.P. et al. (2002). Effects of concurrent endurance and strength training on running economy and VO2 kinetics. Medicine and Science in Sports and Exercise, 34(8), 1351-1359.',
  },
  {
    category: 'training_tip',
    title: 'Fartlek Training',
    body: 'Fartlek (Swedish for "speed play") involves varying your pace throughout a run — surging for a lamp post, recovering to the next tree, picking it up again. It\'s less structured than intervals but builds speed and endurance naturally.',
    citation: 'Laursen, P.B. & Jenkins, D.G. (2002). The scientific basis for high-intensity interval training. Sports Medicine, 32(1), 53-73.',
  },
  {
    category: 'training_tip',
    title: 'Breathing Rhythm',
    body: 'Try a 3:2 breathing pattern on easy runs (inhale for 3 steps, exhale for 2) and 2:1 for harder efforts. Alternating which foot you exhale on helps distribute impact stress evenly between both sides of your body.',
    citation: 'Bramble, D.M. & Carrier, D.R. (1983). Running and breathing in mammals. Science, 219(4582), 251-256.',
  },
  {
    category: 'training_tip',
    title: 'Cadence Awareness',
    body: 'A slightly higher cadence (steps per minute) often leads to better running form — shorter strides, less overstriding, reduced impact forces. Most elite runners land around 180 spm, but find what works naturally for you.',
    citation: 'Heiderscheit, B.C. et al. (2011). Effects of step rate manipulation on joint mechanics during running. Medicine and Science in Sports and Exercise, 43(2), 296-302.',
  },
  {
    category: 'training_tip',
    title: 'Mental Strategies',
    body: 'Break long races into smaller chunks mentally. Focus on the next mile marker, the next aid station, or the next landmark. Association (monitoring your body) works for faster runners; dissociation (distraction) helps in ultras.',
    citation: 'Brick, N.E. et al. (2014). Attentional focus and endurance performance: review and theoretical integration. Journal of Sports Sciences, 32(14), 1364-1379.',
  },
  {
    category: 'training_tip',
    title: 'Strides for Speed',
    body: 'Add 4-6 x 100m strides (gradual accelerations to near-sprint pace) at the end of easy runs, twice a week. They improve neuromuscular coordination and running form without adding significant fatigue.',
    citation: 'Paavolainen, L. et al. (1999). Explosive-strength training improves 5-km running time by improving running economy. Journal of Applied Physiology, 86(5), 1527-1533.',
  },
  {
    category: 'training_tip',
    title: 'Sleep and Performance',
    body: 'Aim for 7-9 hours of quality sleep per night. Sleep is when your body repairs muscle tissue and consolidates training adaptations. Even one poor night\'s sleep can impair endurance performance by up to 11%.',
    citation: 'Fullagar, H.H. et al. (2015). Sleep and athletic performance: the effects of sleep loss on exercise performance. Sports Medicine, 45(2), 161-186.',
  },
  {
    category: 'training_tip',
    title: 'Warm-Up Properly',
    body: 'Before hard sessions, do 10-15 minutes of easy jogging followed by dynamic stretches (leg swings, high knees, A-skips). Save static stretching for after your run. A good warm-up primes your cardiovascular system and neuromuscular pathways.',
    citation: 'Fradkin, A.J. et al. (2010). Effects of warming-up on physical performance: a systematic review. Journal of Strength and Conditioning Research, 24(1), 140-148.',
  },
  {
    category: 'training_tip',
    title: 'Run by Effort, Not Pace',
    body: 'On hot days, windy days, hilly routes or when fatigued, your pace at a given effort will be slower than normal. Use perceived effort or heart rate to guide your intensity rather than chasing pace numbers.',
    citation: 'Tucker, R. (2009). The anticipatory regulation of performance: the physiological basis for pacing strategies. British Journal of Sports Medicine, 43(12), 770-773.',
  },
  {
    category: 'training_tip',
    title: 'Double Threshold Days',
    body: 'Some coaches programme two moderate threshold sessions on the same day (e.g. morning and evening) rather than one very hard session. This gives more time at threshold pace with less extreme fatigue from any single session.',
    citation: 'Seiler, S. & Kjerland, G.Ø. (2006). Quantifying training intensity distribution in elite endurance athletes. Scandinavian Journal of Medicine & Science in Sports, 16(1), 49-56.',
  },
  {
    category: 'training_tip',
    title: 'Foam Rolling for Recovery',
    body: 'Spending 10-15 minutes foam rolling after a hard session can reduce delayed onset muscle soreness (DOMS) and improve range of motion. Focus on quads, hamstrings, calves, IT band and glutes.',
    citation: 'Cheatham, S.W. et al. (2015). The effects of self-myofascial release using a foam roll or roller massager on joint range of motion, muscle recovery, and performance. International Journal of Sports Physical Therapy, 10(6), 827-838.',
  },
  {
    category: 'training_tip',
    title: 'Progression Runs',
    body: 'Start your run easy and gradually increase pace throughout, finishing at tempo or threshold effort. Progression runs teach your body to run fast on tired legs and build confidence for negative-splitting races.',
    citation: 'Abbiss, C.R. & Laursen, P.B. (2008). Describing and understanding pacing strategies during athletic competition. Sports Medicine, 38(3), 239-252.',
  },
];

const science: ContentItem[] = [
  {
    category: 'science',
    title: 'Caffeine Boosts Performance',
    body: 'A dose of 3-6mg per kilogram of bodyweight, consumed 30-60 minutes before exercise, has been shown to improve endurance performance by 2-4%. That\'s about 2-3 cups of coffee for a 70kg runner.',
    citation: 'Southward, K. et al. (2018). The effect of acute caffeine ingestion on endurance performance: a systematic review and meta-analysis. Sports Medicine, 48(8), 1913-1928.',
  },
  {
    category: 'science',
    title: 'Heat Adaptation',
    body: 'Training in the heat for 10-14 days triggers adaptations including increased plasma volume, earlier sweating onset and lower core temperature. These adaptations improve performance in both hot and cool conditions.',
    citation: 'Périard, J.D. et al. (2015). Cardiovascular adaptations supporting human exercise-heat acclimation. Autonomic Neuroscience, 196, 52-62.',
  },
  {
    category: 'science',
    title: 'Running Economy Matters',
    body: 'Running economy — the oxygen cost of running at a given pace — is a better predictor of distance running performance than VO2max among well-trained runners. It can be improved through strength training, plyometrics and consistent mileage.',
    citation: 'Barnes, K.R. & Kilding, A.E. (2015). Running economy: measurement, norms, and determining factors. Sports Medicine — Open, 1(1), 1-15.',
  },
  {
    category: 'science',
    title: 'The Gut Microbiome and Endurance',
    body: 'Emerging research suggests elite endurance athletes have distinct gut microbiome profiles. Certain bacteria (Veillonella) can metabolise exercise-produced lactate into propionate, a short-chain fatty acid used as fuel.',
    citation: 'Scheiman, J. et al. (2019). Meta-omics analysis of elite athletes identifies a performance-enhancing microbe that functions via lactate metabolism. Nature Medicine, 25(7), 1104-1109.',
  },
  {
    category: 'science',
    title: 'Compression Garments',
    body: 'Wearing compression garments during recovery (not during running) may reduce muscle soreness and speed up recovery between sessions. The evidence for wearing them during exercise is less convincing.',
    citation: 'Hill, J. et al. (2014). Compression garments and recovery from exercise-induced muscle damage: a meta-analysis. British Journal of Sports Medicine, 48(18), 1340-1346.',
  },
  {
    category: 'science',
    title: 'Cold Water Immersion',
    body: 'Ice baths (10-15°C for 10-15 minutes) after hard sessions can reduce inflammation and muscle soreness. However, avoid them during heavy strength training phases — the anti-inflammatory effect may blunt muscle adaptation.',
    citation: 'Leeder, J. et al. (2012). Cold water immersion and recovery from strenuous exercise. European Journal of Applied Physiology, 112(7), 2567-2575.',
  },
  {
    category: 'science',
    title: 'Altitude Training Effects',
    body: 'Living at altitude (2,000-2,500m) triggers increased red blood cell production, improving oxygen-carrying capacity. The "live high, train low" approach lets you gain altitude benefits while maintaining training quality.',
    citation: 'Levine, B.D. & Stray-Gundersen, J. (1997). "Living high-training low": effect of moderate-altitude acclimatization with low-altitude training on performance. Journal of Applied Physiology, 83(1), 102-112.',
  },
  {
    category: 'science',
    title: 'The Central Governor Theory',
    body: 'Your brain may limit exercise performance before true physiological failure, acting as a "central governor" to protect the body. This explains why runners can sprint at the end of a race despite feeling exhausted moments before.',
    citation: 'Noakes, T.D. (2011). Time to move beyond a brainless exercise physiology: the evidence for complex regulation of human exercise performance. Applied Physiology, Nutrition and Metabolism, 36(1), 23-35.',
  },
  {
    category: 'science',
    title: 'Barefoot vs. Shod Running',
    body: 'Minimalist and barefoot running naturally shifts landing towards the midfoot/forefoot. While this can reduce knee loading, it increases stress on the Achilles tendon and calf muscles. Any transition should be very gradual.',
    citation: 'Lieberman, D.E. et al. (2010). Foot strike patterns and collision forces in habitually barefoot versus shod runners. Nature, 463(7280), 531-535.',
  },
  {
    category: 'science',
    title: 'Injury Prevention Through Load Management',
    body: 'The biggest risk factor for running injury isn\'t running itself — it\'s sudden spikes in training load. Keeping your acute:chronic workload ratio between 0.8 and 1.3 significantly reduces injury risk.',
    citation: 'Gabbett, T.J. (2016). The training—injury prevention paradox: should athletes be training smarter and harder? British Journal of Sports Medicine, 50(5), 273-280.',
  },
  {
    category: 'science',
    title: 'Music and Running Performance',
    body: 'Listening to music during running can reduce perceived exertion by up to 12% and improve endurance by 15%. Tracks with a tempo of 120-140 BPM tend to match well with running cadence.',
    citation: 'Karageorghis, C.I. & Priest, D.L. (2012). Music in the exercise domain: a review and synthesis. International Review of Sport and Exercise Psychology, 5(1), 44-84.',
  },
  {
    category: 'science',
    title: 'Super Shoes and Performance',
    body: 'Carbon-plated running shoes with thick foam midsoles have been shown to improve running economy by 4% on average. The combination of energy return from the foam and the propulsive effect of the plate creates a measurable advantage.',
    citation: 'Hoogkamer, W. et al. (2018). A comparison of the energetic cost of running in marathon racing shoes. Sports Medicine, 48(4), 1009-1019.',
  },
  {
    category: 'science',
    title: 'Nitrate and Beetroot Juice',
    body: 'Dietary nitrate (commonly from beetroot juice) can improve running economy and time-trial performance by 1-3%. It works by reducing the oxygen cost of exercise. Consume 300-600mg of nitrate 2-3 hours before exercise.',
    citation: 'Jones, A.M. (2014). Dietary nitrate supplementation and exercise performance. Sports Medicine, 44(Suppl 1), S35-S45.',
  },
  {
    category: 'science',
    title: 'Age and Endurance Performance',
    body: 'While VO2max declines with age, endurance performance is remarkably well preserved into the 50s and 60s, especially in ultra-distance events. Running economy actually improves with decades of training experience.',
    citation: 'Tanaka, H. & Seals, D.R. (2008). Endurance exercise performance in Masters athletes: age-associated changes and underlying physiological mechanisms. Journal of Physiology, 586(1), 55-63.',
  },
  {
    category: 'science',
    title: 'Vitamin D and Athletes',
    body: 'Many endurance athletes in northern climates are vitamin D deficient, particularly in winter. Low vitamin D is associated with increased injury risk, reduced muscle function and impaired immune response. Consider supplementing 1000-2000 IU daily in winter.',
    citation: 'Owens, D.J. et al. (2018). Vitamin D and the athlete: current perspectives and new challenges. Sports Medicine, 48(Suppl 1), 3-16.',
  },
  {
    category: 'science',
    title: 'Sleep Extension for Athletes',
    body: 'Extending sleep to 9-10 hours per night for several weeks has been shown to improve sprint times, reaction times and mood in athletes. Even small sleep deficits accumulate and impair performance over time.',
    citation: 'Mah, C.D. et al. (2011). The effects of sleep extension on the athletic performance of collegiate basketball players. Sleep, 34(7), 943-950.',
  },
  {
    category: 'science',
    title: 'The Runner\'s High',
    body: 'The euphoric feeling during prolonged exercise is driven by the endocannabinoid system, not just endorphins as previously thought. The brain releases anandamide — a molecule similar to cannabis compounds — during sustained aerobic exercise.',
    citation: 'Fuss, J. et al. (2015). A runner\'s high depends on cannabinoid receptors in mice. Proceedings of the National Academy of Sciences, 112(42), 13105-13108.',
  },
  {
    category: 'science',
    title: 'Eccentric Training Benefits',
    body: 'Downhill running and eccentric exercises (lowering phase of movements) cause more muscle damage but also trigger stronger adaptation. Eccentric training improves tendon stiffness and reduces injury risk, especially for Achilles tendinopathy.',
    citation: 'Roig, M. et al. (2009). The effects of eccentric versus concentric resistance training on muscle strength and mass. British Journal of Sports Medicine, 43(8), 556-568.',
  },
  {
    category: 'science',
    title: 'Gut Training for Races',
    body: 'Your gut can be "trained" to tolerate more carbohydrate during exercise. Practising your race nutrition strategy in training improves gastric emptying and absorption rates, reducing GI distress on race day.',
    citation: 'Jeukendrup, A.E. (2017). Training the gut for athletes. Sports Medicine, 47(Suppl 1), 101-110.',
  },
  {
    category: 'science',
    title: 'Heart Rate Variability',
    body: 'Morning heart rate variability (HRV) measurements can help detect overtraining before symptoms appear. A consistently decreasing HRV trend suggests your body isn\'t recovering adequately and training should be reduced.',
    citation: 'Plews, D.J. et al. (2013). Training adaptation and heart rate variability in elite endurance athletes. International Journal of Sports Physiology and Performance, 8(6), 688-694.',
  },
];

const nutrition: ContentItem[] = [
  {
    category: 'nutrition',
    title: 'Carb Loading Done Right',
    body: 'In the 2-3 days before a marathon or ultra, increase carbohydrate intake to 8-12g per kg of bodyweight while reducing training volume. This maximises muscle glycogen stores and can delay hitting the wall by 20-30 minutes.',
    citation: 'Hawley, J.A. et al. (1997). Carbohydrate-loading and exercise performance. Sports Medicine, 24(2), 73-81.',
  },
  {
    category: 'nutrition',
    title: 'Post-Run Recovery Window',
    body: 'Consume 1-1.2g of carbohydrate per kg and 20-30g of protein within 30-60 minutes of finishing a hard session. This accelerates glycogen replenishment and muscle repair. A chocolate milkshake ticks both boxes.',
    citation: 'Ivy, J.L. et al. (2002). Early post-exercise muscle glycogen recovery is enhanced with a carbohydrate-protein supplement. Journal of Applied Physiology, 93(4), 1337-1344.',
  },
  {
    category: 'nutrition',
    title: 'Hydration Strategy',
    body: 'Drink to thirst rather than following a rigid schedule. Overdrinking can cause hyponatraemia (dangerously low sodium), which is more dangerous than mild dehydration. Weigh yourself before and after runs to understand your sweat rate.',
    citation: 'Noakes, T.D. (2012). Waterlogged: The Serious Problem of Overhydration in Endurance Sports. Human Kinetics.',
  },
  {
    category: 'nutrition',
    title: 'Iron for Runners',
    body: 'Runners are at higher risk of iron deficiency due to foot-strike haemolysis, sweat losses and GI bleeding during hard efforts. Get your ferritin levels checked regularly — aim for above 30 ng/mL, ideally above 50.',
    citation: 'Sim, M. et al. (2019). Iron considerations for the athlete: a narrative review. European Journal of Applied Physiology, 119(7), 1463-1478.',
  },
  {
    category: 'nutrition',
    title: 'Race Day Fuelling',
    body: 'During events lasting over 60-90 minutes, aim for 60-90g of carbohydrate per hour from a mix of glucose and fructose. This dual-source approach allows higher absorption rates than glucose alone. Practice in training first.',
    citation: 'Jeukendrup, A.E. (2014). A step towards personalized sports nutrition: carbohydrate intake during exercise. Sports Medicine, 44(Suppl 1), S25-S33.',
  },
  {
    category: 'nutrition',
    title: 'Tart Cherry Juice for Recovery',
    body: 'Drinking tart cherry juice (30ml concentrate twice daily) for 5 days around a hard race has been shown to reduce muscle soreness, inflammation and strength loss. The anthocyanins act as natural anti-inflammatories.',
    citation: 'Howatson, G. et al. (2010). Influence of tart cherry juice on indices of recovery following marathon running. Scandinavian Journal of Medicine & Science in Sports, 20(6), 843-852.',
  },
  {
    category: 'nutrition',
    title: 'Protein Timing and Distribution',
    body: 'Distribute your protein intake evenly across 3-4 meals per day (20-40g per meal) rather than loading it all into one sitting. Include a protein-rich snack before bed to support overnight muscle repair — cottage cheese or a casein shake works well.',
    citation: 'Areta, J.L. et al. (2013). Timing and distribution of protein ingestion during prolonged recovery from resistance exercise alters myofibrillar protein synthesis. Journal of Physiology, 591(9), 2319-2331.',
  },
  {
    category: 'nutrition',
    title: 'Electrolyte Balance',
    body: 'Sodium is the primary electrolyte lost in sweat. Salty sweaters (white marks on kit) may need 500-1000mg of sodium per hour during long events. Electrolyte tablets, salt capsules or salty foods at aid stations all work.',
    citation: 'Baker, L.B. (2017). Sweating rate and sweat sodium concentration in athletes: a review of methodology and intra/interindividual variability. Sports Medicine, 47(Suppl 1), 111-128.',
  },
  {
    category: 'nutrition',
    title: 'Omega-3 for Inflammation',
    body: 'Omega-3 fatty acids (from oily fish or supplements) can reduce exercise-induced inflammation and muscle soreness. Aim for 2-3 portions of oily fish per week, or supplement with 1-3g of EPA/DHA daily.',
    citation: 'Philpott, J.D. et al. (2019). Applications of omega-3 polyunsaturated fatty acid supplementation for sport performance. Research in Sports Medicine, 27(2), 219-237.',
  },
  {
    category: 'nutrition',
    title: 'Pre-Run Breakfast',
    body: 'Eat a carb-rich, moderate-protein, low-fat breakfast 2-3 hours before a hard run or race. Porridge with banana, toast with honey, or a bagel with peanut butter are all good options. Avoid high-fibre foods that may cause GI issues.',
    citation: 'Ormsbee, M.J. et al. (2014). Pre-exercise nutrition: the role of macronutrients, modified starches and supplements on metabolism and endurance performance. Nutrients, 6(5), 1782-1808.',
  },
  {
    category: 'nutrition',
    title: 'Creatine for Runners',
    body: 'While traditionally associated with power sports, creatine monohydrate (3-5g daily) may benefit runners by improving high-intensity interval performance, supporting muscle repair and reducing injury risk during heavy training blocks.',
    citation: 'Rawson, E.S. & Volek, J.S. (2003). Effects of creatine supplementation and resistance training on muscle strength and weightlifting performance. Journal of Strength and Conditioning Research, 17(4), 822-831.',
  },
  {
    category: 'nutrition',
    title: 'Vitamin C and Immunity',
    body: 'Heavy training can suppress immune function temporarily. Vitamin C (200-1000mg daily from food or supplements) has been shown to reduce the incidence of upper respiratory tract infections in runners by about 50%.',
    citation: 'Hemilä, H. & Chalker, E. (2013). Vitamin C for preventing and treating the common cold. Cochrane Database of Systematic Reviews, (1), CD000980.',
  },
  {
    category: 'nutrition',
    title: 'Caffeine Gels in Racing',
    body: 'Saving a caffeinated gel for the last third of a race can give you a measurable boost when fatigue is highest. Caffeine reduces perceived exertion and improves muscle contraction even when glycogen is depleted.',
    citation: 'Ganio, M.S. et al. (2009). Effect of caffeine on sport-specific endurance performance: a systematic review. Journal of Strength and Conditioning Research, 23(1), 315-324.',
  },
  {
    category: 'nutrition',
    title: 'Glycaemic Index and Training',
    body: 'Low-GI foods (oats, sweet potato, lentils) before training provide sustained energy. High-GI foods (white bread, rice, gels) during and after exercise rapidly replenish glycogen. Use the right type at the right time.',
    citation: 'Burke, L.M. et al. (1998). The glycaemic index: a new tool in sport nutrition? International Journal of Sport Nutrition, 8(4), 401-415.',
  },
  {
    category: 'nutrition',
    title: 'Magnesium for Muscle Function',
    body: 'Magnesium is involved in over 300 enzymatic reactions including muscle contraction and energy production. Runners often fall short. Good sources include dark leafy greens, nuts, seeds, dark chocolate and whole grains.',
    citation: 'Zhang, Y. et al. (2017). Can magnesium enhance exercise performance? Nutrients, 9(9), 946.',
  },
  {
    category: 'nutrition',
    title: 'Probiotics for Athletes',
    body: 'Daily probiotic supplementation can reduce the duration and severity of respiratory and gastrointestinal illness in athletes. Look for strains like Lactobacillus and Bifidobacterium with at least 10 billion CFU.',
    citation: 'Pyne, D.B. et al. (2015). Probiotics supplementation for athletes – clinical and physiological effects. European Journal of Sport Science, 15(1), 63-72.',
  },
  {
    category: 'nutrition',
    title: 'Avoid Fasted Long Runs',
    body: 'While fasted runs can improve fat metabolism, doing your long run fasted often leads to poorer quality training, increased cortisol and greater muscle breakdown. Fuel before and during any run over 90 minutes.',
    citation: 'Impey, S.G. et al. (2018). Fuel for the work required: a theoretical framework for carbohydrate periodization and the glycogen threshold hypothesis. Sports Medicine, 48(5), 1031-1048.',
  },
  {
    category: 'nutrition',
    title: 'Polyphenol-Rich Foods',
    body: 'Berries, dark chocolate, green tea and colourful vegetables are rich in polyphenols, which can reduce oxidative stress and inflammation from hard training. Include a wide variety of colourful plant foods daily.',
    citation: 'Myburgh, K.H. (2014). Polyphenol supplementation: benefits for exercise performance or oxidative stress? Sports Medicine, 44(Suppl 1), S57-S70.',
  },
  {
    category: 'nutrition',
    title: 'Collagen for Tendons',
    body: 'Taking 15g of collagen peptides with 50mg of vitamin C, 30-60 minutes before tendon-loading exercise, may improve collagen synthesis and support injury recovery. The evidence is still emerging but promising.',
    citation: 'Shaw, G. et al. (2017). Vitamin C-enriched gelatin supplementation before intermittent activity augments collagen synthesis. American Journal of Clinical Nutrition, 105(1), 136-143.',
  },
  {
    category: 'nutrition',
    title: 'Alcohol and Recovery',
    body: 'Even moderate alcohol consumption after exercise impairs muscle protein synthesis, glycogen replenishment and rehydration. If you\'re going to have a post-race pint, rehydrate and refuel properly first.',
    citation: 'Parr, E.B. et al. (2014). Alcohol ingestion impairs maximal post-exercise rates of myofibrillar protein synthesis following a single bout of concurrent training. PLoS ONE, 9(2), e88384.',
  },
];

const sessions: ContentItem[] = [
  {
    category: 'session',
    title: '6 x 3min Hill Reps',
    body: 'Find a moderate hill (6-8% gradient). Run hard uphill for 3 minutes, then jog back down to recover. Repeat 6 times. Great for building leg strength, power and VO2max. Keep your form tall and drive your knees.',
  },
  {
    category: 'session',
    title: 'Classic Tempo Run',
    body: '15 minutes easy warm-up, then 20-30 minutes at threshold pace (comfortably hard — you can speak in short phrases but not hold a conversation). 10 minutes easy cool-down. The bread and butter of distance training.',
  },
  {
    category: 'session',
    title: 'Kenyan Fartlek',
    body: '10 minutes easy, then alternate between 1 minute hard and 1 minute easy for 20-30 minutes. Finish with 10 minutes easy. The "hard" efforts should be 5K-effort — uncomfortable but sustainable. No recovery stops.',
  },
  {
    category: 'session',
    title: 'Progression Long Run',
    body: 'Start your long run 30-45 seconds per mile slower than marathon pace. Every 20 minutes, increase pace slightly. Finish the last 2-3 miles at marathon pace or slightly faster. Teaches your body to run fast on tired legs.',
  },
  {
    category: 'session',
    title: '8 x 400m Intervals',
    body: 'After a thorough warm-up, run 8 x 400m at your current 5K pace with 90 seconds of slow jogging between each rep. Focus on maintaining even splits across all 8 reps. Cool down with 10-15 minutes easy running.',
  },
  {
    category: 'session',
    title: '2 x 20min Threshold',
    body: 'Warm up for 15 minutes, then run 2 x 20 minutes at lactate threshold pace with 5 minutes easy jogging between sets. This is a demanding session — your threshold pace should feel like a pace you could hold for about an hour racing.',
  },
  {
    category: 'session',
    title: 'Recovery Run',
    body: '30-45 minutes at a genuinely easy pace. You should be able to hold a full conversation throughout. If in doubt, slow down. Recovery runs promote blood flow to tired muscles without adding training stress. Leave your ego at the door.',
  },
  {
    category: 'session',
    title: '5 x 1000m Cruise Intervals',
    body: 'After warming up, run 5 x 1000m at threshold pace with 60 seconds recovery jog between each. These "cruise intervals" break up a sustained threshold effort into manageable chunks while achieving similar physiological benefits.',
  },
  {
    category: 'session',
    title: '10 x 1min Fast / 1min Easy',
    body: 'After 15 minutes easy running, alternate between 1 minute at 3K effort and 1 minute very easy, 10 times through. Cool down for 10 minutes. A great introduction to speed work without the intimidation of track sessions.',
  },
  {
    category: 'session',
    title: 'Yasso 800s',
    body: 'Run 10 x 800m with equal time recovery jogs. The target time in minutes:seconds for each 800m roughly predicts your marathon time in hours:minutes (e.g. 3:30 per 800m suggests a 3:30 marathon). A popular marathon benchmark session.',
  },
  {
    category: 'session',
    title: 'Long Run with Surges',
    body: 'During your long run, include 6-8 x 2min surges at half-marathon effort spread throughout the second half. Return to easy pace between surges. This simulates the effort changes of racing and builds endurance at pace.',
  },
  {
    category: 'session',
    title: 'Pyramid Session',
    body: 'Warm up, then run: 1min, 2min, 3min, 4min, 3min, 2min, 1min at 5K-10K effort, with equal time easy jog recoveries. The pyramid structure keeps the session mentally engaging and hits a range of speeds.',
  },
  {
    category: 'session',
    title: '3 x 1 Mile Repeats',
    body: 'After warming up, run 3 x 1 mile at 10K race pace with 3 minutes recovery jog between each. Focus on even pacing — the first mile should feel controlled, the last one should feel hard. Excellent for racing fitness.',
  },
  {
    category: 'session',
    title: 'Trail Fartlek',
    body: 'Head out on trails and use the terrain to dictate your effort. Push hard on uphills, stride out on flat sections, let gravity carry you on descents. Run by feel for 45-60 minutes. Great for developing trail-specific fitness.',
  },
  {
    category: 'session',
    title: '6 x 2min Uphill Strides',
    body: 'Find a gentle uphill (3-4% grade). After warming up, run 6 x 2 minutes at 10K effort uphill, jogging back down to recover. Less steep than traditional hill reps — this develops sustained climbing ability for hilly races.',
  },
  {
    category: 'session',
    title: 'Cut-Down Run',
    body: 'Run 5 miles, getting faster each mile: Mile 1 easy, Mile 2 steady, Mile 3 half-marathon pace, Mile 4 threshold pace, Mile 5 near 5K pace. Teaches pacing discipline and finishes with a satisfying fast effort.',
  },
  {
    category: 'session',
    title: '10K Pace Intervals',
    body: 'After warming up, run 4 x 1200m at your goal 10K pace with 2 minutes recovery jog between each. This session practises holding race pace when fatigued and builds confidence in your target time.',
  },
  {
    category: 'session',
    title: 'Mona Fartlek',
    body: 'A session designed by coach Steve Moneghetti: 2 x 90sec hard, 4 x 60sec hard, 4 x 30sec hard, 4 x 15sec hard — with equal time recovery jogs after each. Continuous running throughout. A classic Australian session.',
  },
  {
    category: 'session',
    title: 'Easy Aerobic Run',
    body: '45-60 minutes at a comfortable, conversational pace. The foundation of all distance training. Don\'t underestimate easy running — it builds your aerobic base, capillary density and mitochondrial function without the injury risk of harder sessions.',
  },
  {
    category: 'session',
    title: 'Negative Split Long Run',
    body: 'Run the second half of your long run faster than the first half. Start very conservatively and gradually increase effort so the final few miles are at marathon pace. Builds discipline and confidence in your marathon pacing strategy.',
  },
  {
    category: 'session',
    title: '5 x 3min Threshold with Float',
    body: 'After warming up, alternate between 3 minutes at threshold pace and 90 seconds at steady (not easy) pace, 5 times through. The "float" recoveries keep your heart rate elevated, making this more race-specific than full recovery intervals.',
  },
];

async function main() {
  const allItems = [...tools, ...trainingTips, ...science, ...nutrition, ...sessions];

  console.log(`Seeding ${allItems.length} newsletter content pool items...`);

  // Clear existing pool data
  await prisma.newsletter_content_pool.deleteMany({});

  // Insert all items
  await prisma.newsletter_content_pool.createMany({
    data: allItems.map((item) => ({
      category: item.category,
      title: item.title,
      body: item.body,
      url: item.url ?? null,
      citation: item.citation ?? null,
    })),
  });

  const counts = await prisma.newsletter_content_pool.groupBy({
    by: ['category'],
    _count: { id: true },
  });

  console.log('Seeded content pool:');
  for (const c of counts) {
    console.log(`  ${c.category}: ${c._count.id} items`);
  }
  console.log(`  Total: ${allItems.length} items`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
