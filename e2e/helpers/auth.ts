import { Page, request } from '@playwright/test';

const API_URL = 'http://localhost:3456';

export async function loginAs(page: Page, email: string, password: string): Promise<string> {
  const apiRequest = await request.newContext();
  const res = await apiRequest.post(`${API_URL}/auth/login`, { data: { email, password } });
  const body = await res.json();
  const token = body.access_token || body.data?.access_token;

  // Set localStorage and cookie
  await page.goto('/');
  await page.evaluate(
    ([t, userEmail]) => {
      localStorage.setItem('access_token', t);
      localStorage.setItem('user', JSON.stringify({ email: userEmail }));
    },
    [token, email],
  );
  await page.context().addCookies([
    { name: 'access_token', value: token, domain: 'localhost', path: '/' },
  ]);

  return token;
}
