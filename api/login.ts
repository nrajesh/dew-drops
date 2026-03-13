import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = request.body;

  const ALLOWED_EMAIL = process.env.VITE_ALLOWED_EMAIL || "write@nrajesh.com";
  const AUTH_PASSWORD = process.env.AUTH_PASSWORD;

  if (email === ALLOWED_EMAIL && password === AUTH_PASSWORD) {
    return response.status(200).json({ 
      success: true, 
      user: { id: "local-user", email: ALLOWED_EMAIL } 
    });
  }

  return response.status(401).json({ error: 'Invalid credentials' });
}
