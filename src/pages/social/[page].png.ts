import type { APIRoute } from 'astro';
import { socialImageResponse } from '../../portfolio/social-image';

export const GET: APIRoute = ({ params, url }) =>
  socialImageResponse(params['page'], url);
