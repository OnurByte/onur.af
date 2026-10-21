import { z } from 'astro/zod';
import { parseXmrAmount } from './money';
import { donationSubaddressPrefix } from './protocol';

const uuid = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
const amount = z.string().refine((value) => {
  try {
    parseXmrAmount(value);
    return true;
  } catch {
    return false;
  }
}, 'Expected a positive decimal amount no greater than 100 XMR');

export const donationRequestSchema = z.object({ id: uuid, amount });

/** Validate the shared public fields; store/status fields may evolve independently. */
export function readyDonationSchema(expected: {
  id: string;
  amount: string;
  network: string;
}) {
  const prefix = donationSubaddressPrefix(expected.network);
  return donationRequestSchema
    .extend({
      id: z.literal(expected.id),
      amount: z.literal(expected.amount),
      address: z
        .string()
        .regex(new RegExp(`^${prefix}[1-9A-HJ-NP-Za-km-z]{94}$`)),
      unavailable: z.literal(false).optional(),
    })
    .loose();
}
