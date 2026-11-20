import { test, expect, request, APIRequestContext } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL || 'https://jsonplaceholder.typicode.com';

let apiContext: APIRequestContext;

test.beforeAll(async () => {
  apiContext = await request.newContext({ baseURL: API_BASE });
});

test.afterAll(async () => {
  await apiContext.dispose();
});

test.describe('Users API', () => {
  test('GET /users returns 200 and valid schema', async () => {
    const response = await apiContext.get('/users');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);

    for (const user of body) {
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('email');
      expect(typeof user.email).toBe('string');
      expect(user.email).toMatch(/@/);
    }
  });

  test('GET /users/:id returns correct user and data integrity', async () => {
    const response = await apiContext.get('/users/1');
    expect(response.status()).toBe(200);

    const user = await response.json();
    expect(user.id).toBe(1);
    expect(user).toHaveProperty('address');
    expect(user).toHaveProperty('company');
  });

  test('GET /users/:id returns 404 for non-existent user', async () => {
    const response = await apiContext.get('/users/999999');
    expect(response.status()).toBe(404);
  });

  test('POST /users creates a new user', async () => {
    const payload = { name: 'Amritanshu Anand', email: 'amritanshu@example.com' };
    const response = await apiContext.post('/users', { data: payload });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body.name).toBe(payload.name);
  });
});
