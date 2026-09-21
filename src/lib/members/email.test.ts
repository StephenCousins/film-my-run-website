import { beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.fn();
vi.mock('resend', () => ({ Resend: vi.fn().mockImplementation(() => ({ emails: { send } })) }));

import { sendCodeEmail } from './email';

describe('sendCodeEmail', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test';
    send.mockReset();
  });

  it('rejects when Resend returns an error', async () => {
    send.mockResolvedValue({ data: null, error: { message: 'Unverified sender' } });
    await expect(sendCodeEmail('runner@example.com', '123456')).rejects.toThrow('Unverified sender');
  });

  it('resolves when Resend accepts the email', async () => {
    send.mockResolvedValue({ data: { id: 'x' }, error: null });
    await expect(sendCodeEmail('runner@example.com', '123456')).resolves.toBeUndefined();
  });
});
