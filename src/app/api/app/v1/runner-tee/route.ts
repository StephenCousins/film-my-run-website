import { NextResponse } from 'next/server';
import { withAppApi } from '@/lib/app-api/rate-limit';
import { runnerTee, RUNNER_TEE_SLUG } from '@/lib/shop/runner-tee';
import { SHIRT_COLOURS, type ShirtColour } from '@/lib/runner-quiz/shirt-art';
import { QUIZ } from '@/lib/runner-quiz';
import { CLUB_DISCOUNT, MEMBER_DISCOUNT } from '@/lib/members/price';
import { FLOOR_OFFSET_PENCE, OWN_TYPE_OFF_PENCE } from '@/lib/shop/tee-pricing';
import { modelPhotos } from '@/lib/runner-quiz/models';

// The Runner Type Tee for the app's native product page: any of the 12 designs. Buy it through
// /api/shop/checkout with a basket line { slug: 'runner-type-tee', variantId, quantity, design,
// personal?: { type, scores } }. An old line with personal and no design is the buyer's own type.
export const GET = withAppApi(
  async () =>
    NextResponse.json({
      slug: RUNNER_TEE_SLUG,
      name: runnerTee.name,
      priceFrom: runnerTee.priceFrom,
      colours: runnerTee.colours.map((name) => ({ name, hex: SHIRT_COLOURS[name as ShirtColour] })),
      // The colour the product page opens on, per quiz type.
      defaultColours: Object.fromEntries(QUIZ.types.map((t) => [t.id, t.shirtColour])),
      // Per type: three model shots of the front on its default colour, then the flat back.
      modelPhotos: Object.fromEntries(QUIZ.types.map((t) => [t.id, modelPhotos(t.id)])),
      // What a buyer pays per tee: the variant price, less ownTypeDiscount when design == their
      // quiz type, less the member or Club discount, never below (variant price − floorOffset).
      pricing: {
        ownTypeDiscount: OWN_TYPE_OFF_PENCE / 100,
        floorOffset: FLOOR_OFFSET_PENCE / 100,
        memberDiscount: MEMBER_DISCOUNT,
        clubDiscount: CLUB_DISCOUNT,
      },
      // Any design, with or without a result: leave {type} and {scores} empty for the plain back.
      designPreviewUrl:
        'https://filmmyrun.com/api/shop/runner-tee/preview?design={design}&type={type}&s={scores}&colour={colour}&side={side}&w={w}&v=4',
      variants: runnerTee.variants.map((v) => ({ id: v.id, colour: v.colour, size: v.size, price: v.price })),
      previewUrl:
        'https://filmmyrun.com/api/shop/runner-tee/preview?type={type}&s={scores}&colour={colour}&side={side}&w={w}&v=3',
    }),
  { limit: 60, cacheControl: 'public, max-age=3600, stale-while-revalidate=86400' }
);
