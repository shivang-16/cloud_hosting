import { cookies } from "next/headers";

const SESSION_COOKIE = "cloud_session";
const SESSION_VALUE = "authenticated";

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value === SESSION_VALUE;
}

export function validateCredentials(username: string, password: string): boolean {
  return (
    username === process.env.APP_USERNAME &&
    password === process.env.APP_PASSWORD
  );
}

export { SESSION_COOKIE, SESSION_VALUE };
