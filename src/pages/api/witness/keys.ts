import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import {
  parseWitnessTrust,
  witnessKeyHistorySchema,
} from '../../../portfolio/witness/keys';
import { jsonResponse } from '../../../server/http';
export const GET: APIRoute = async () => {
  try {
    const path = process.env['WITNESS_PUBLIC_KEY_HISTORY_FILE'];
    if (!path)
      return jsonResponse({ error: 'Witness key history unavailable' }, 503);
    const text = await readFile(path, 'utf8');
    parseWitnessTrust(text);
    return jsonResponse(
      witnessKeyHistorySchema.parse(JSON.parse(text)),
      200,
      true,
    );
  } catch {
    return jsonResponse({ error: 'Witness key history unavailable' }, 503);
  }
};
