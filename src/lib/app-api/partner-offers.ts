import offersFile from '../../../content/app/partner-offers.json';

/**
 * Partner offers for the app's Today screen (SPEC Appendix C.3). Stephen edits
 * content/app/partner-offers.json; a push deploys it. Offers outside their
 * dates are dropped here, so an expired offer never reaches a phone.
 */
export interface PartnerOffer {
  id: string;
  partner: string;
  title: string;
  body: string;
  url: string;
  logoUrl: string | null;
  startsAt: string;
  endsAt: string;
}

export function activeOffers(offers: PartnerOffer[], today = new Date()): PartnerOffer[] {
  const day = today.toISOString().slice(0, 10);
  return offers.filter((o) => o.startsAt <= day && day <= o.endsAt);
}

export function currentOffers(today = new Date()): PartnerOffer[] {
  return activeOffers((offersFile as { offers: PartnerOffer[] }).offers, today);
}
