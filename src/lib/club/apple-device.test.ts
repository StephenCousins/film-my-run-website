import { describe, expect, it } from 'vitest';
import { isAppleMobile } from './apple-device';

const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const android = 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';

describe('isAppleMobile', () => {
  it('catches iPhone, including the in-app browser, which sends the same agent', () => expect(isAppleMobile(iphone)).toBe(true));
  it('catches an iPad asking for the desktop site, by its touch points', () => expect(isAppleMobile(mac, 5)).toBe(true));
  it('leaves a real Mac alone', () => expect(isAppleMobile(mac, 0)).toBe(false));
  it('leaves Android and missing agents alone', () => {
    expect(isAppleMobile(android)).toBe(false);
    expect(isAppleMobile(null)).toBe(false);
  });
});
