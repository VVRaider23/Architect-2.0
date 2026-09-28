import { currentUser, features, publicUser } from '@/server/auth';
import { json } from '@/server/http';

export const dynamic = 'force-dynamic';

/** Who is signed in (if anyone), and which real features this deployment has turned on. */
export async function GET() {
  const u = await currentUser();
  return json({ user: u ? publicUser(u) : null, features: features() });
}
