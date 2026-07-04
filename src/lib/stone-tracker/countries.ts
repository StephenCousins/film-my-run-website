// ISO 3166-1 alpha-2 codes; display names resolved via Intl.DisplayNames so we
// don't hand-maintain a name list. Used for the StoneTracker country filter.

const CODES =
  'AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FO FR GA GB GD GE GF GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IQ IR IS IT JM JO JP KE KG KH KN KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MK ML MM MN MO MQ MR MT MU MV MW MX MY MZ NA NC NE NG NI NL NO NP NZ OM PA PE PF PG PH PK PL PR PT PY QA RE RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SV SY TD TG TH TJ TL TM TN TO TR TT TW TZ UA UG US UY UZ VE VN WS YE ZA ZM ZW'.split(
    ' '
  );

let _dn: Intl.DisplayNames | null | undefined;
function displayNames(): Intl.DisplayNames | null {
  if (_dn !== undefined) return _dn;
  try {
    _dn = new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    _dn = null;
  }
  return _dn;
}

export function countryName(code: string): string {
  const dn = displayNames();
  return (dn && dn.of(code)) || code;
}

export interface CountryOption {
  code: string;
  name: string;
}

export const COUNTRIES: CountryOption[] = CODES.map((code) => ({
  code,
  name: countryName(code),
})).sort((a, b) => a.name.localeCompare(b.name));

export const AGE_GROUPS = [
  '20-34',
  '35-39',
  '40-44',
  '45-49',
  '50-54',
  '55-59',
  '60-64',
  '65-69',
  '70-74',
  '75-79',
  '80+',
];
