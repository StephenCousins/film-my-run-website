import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const slug = 'youve-got-to-win-utmb';
const youtubeId = 'vcyl6WWKskg';

const synopsis = `After two DNFs at UTMB, signing up for a third attempt made Tom Evans feel physically sick. You've Got To Win UTMB is the inside story of how he came back and won the biggest trail race in the world, told in his own words from the start line in Chamonix to the moment he crossed the line as champion.

The film goes beyond the race. Evans opens up about the aftermath of the knife attack in Cape Town that left him afraid to run, and the panic he still feels in loud crowds — along with the earplugs, nose breathing and pacing discipline he used to stay calm through the chaos of race night.

Then the race itself: walking while the leaders pushed too hard, the rain jacket decision that broke half the field, the buddy system with Ben Dhiman through horrendous weather over the Col Ferret, the attack that snapped the elastic at Arnouvaz, and an emotional reunion with his wife Sophie and daughter Phoebe at Champex-Lac.

Evans also traces the road that got him there — from the Welsh Guards and Sandhurst to a podium at Marathon des Sables off the back of a bet in the pub — and explains why becoming a father, and the "parent strength" that came with it, was the greatest performance enhancer he ever found.

This is more than a race recap. It's a story about failure, fear, family and finally figuring it out, and about the idea that the runner who looks after themselves is the one who wins the 100 miles around Mont Blanc.`;

const description = `You've Got To Win UTMB is the inside story of Tom Evans' 2025 UTMB victory, told in his own words. After dropping out of the race two years running, and after a knife attack in Cape Town that nearly ended his running career, Evans returned to Chamonix and won the biggest trail race in the world. A film about failure, fear, family, and finally figuring it out.`;

const credits = `Directed & Filmed by Stephen Cousins
Featuring: Tom Evans
Race: UTMB, Chamonix, 2025
A Film My Run Production`;

const filmmakerBio = `Stephen Cousins is an award-winning documentary filmmaker, ultra runner, and the creator of Film My Run. His film won Best Running Film at the 2022 Sheffield Adventure Film Festival. Based in Sussex, Stephen combines his passion for running with filmmaking to tell the stories behind the miles — from the sharp end of elite racing to the back-of-the-pack battles that define the ultra running community.

With over 68 ultra races under his belt, Stephen brings a runner's understanding to every film he makes. He knows what it feels like at mile 80 when the wheels are coming off, and that perspective shapes the way he tells these stories.`;

async function main() {
  const existing = await prisma.films.findFirst({ where: { slug } });
  if (existing) {
    console.log('Film already exists:', existing.id, existing.slug);
    return;
  }

  const film = await prisma.films.create({
    data: {
      title: "You've Got To Win UTMB | The Story of Tom Evans' 2025 Victory",
      slug,
      description,
      youtube_id: youtubeId,
      thumbnail_url: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
      duration_seconds: 1471,
      year: 2026,
      awards: [],
      featured: true,
      meta: {
        synopsis,
        credits,
        filmmaker_bio: filmmakerBio,
      },
    },
  });

  console.log('Created film:', film.id, film.slug);
  console.log(`URL: /films/${slug}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
