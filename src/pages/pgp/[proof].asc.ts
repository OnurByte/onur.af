import type { APIRoute } from 'astro';
import {
  getSignedIdentities,
  getSignedIdentityStatement,
} from '../../portfolio/verified-proofs';
export const GET: APIRoute = async ({ params }) => {
  if (params['proof'] === 'identity') {
    const statement = await getSignedIdentityStatement();
    return new Response(statement.signedMessage, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="identity.asc"',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
  if (params['proof'] !== 'x' && params['proof'] !== 'github')
    return new Response(null, { status: 404 });
  const proof = (await getSignedIdentities()).find(
    (proof) => proof.id === params['proof'],
  );
  if (!proof) return new Response(null, { status: 404 });
  return new Response(proof.signedMessage, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${proof.id}.asc"`,
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
