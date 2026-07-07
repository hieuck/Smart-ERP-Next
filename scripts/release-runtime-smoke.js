const API_URL = process.env.RELEASE_SMOKE_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3456';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
);

async function readJson(response, label) {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${label} failed: ${response.status} ${text}`);
  }

  return text ? JSON.parse(text) : {};
}

async function cleanupSmokeArtifacts(apiUrl, authorization, userId, productId, imageUrl) {
  try {
    if (productId) {
      await fetch(`${apiUrl}/products/${productId}`, {
        method: 'DELETE',
        headers: { authorization },
      });
    }
  } catch (err) {
    console.warn(`Failed to delete smoke product ${productId}:`, err.message);
  }

  try {
    if (userId) {
      await fetch(`${apiUrl}/users/${userId}`, {
        method: 'DELETE',
        headers: { authorization },
      });
    }
  } catch (err) {
    console.warn(`Failed to delete smoke user ${userId}:`, err.message);
  }

  if (imageUrl) {
    console.warn('Smoke uploaded image was not removed (no delete API):', imageUrl);
  }
}

async function runReleaseRuntimeSmoke(apiUrl = API_URL) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `release-smoke-${stamp}@example.test`;
  const password = 'SmokePass123!';

  const registered = await readJson(
    await fetch(`${apiUrl}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name: 'Release Smoke User',
        companyName: `Release Smoke Co ${stamp}`,
      }),
    }),
    'POST /auth/register',
  );

  if (!registered.access_token) throw new Error('POST /auth/register did not return access_token');
  const authorization = `Bearer ${registered.access_token}`;

  const profile = await readJson(
    await fetch(`${apiUrl}/auth/profile`, { headers: { authorization } }),
    'GET /auth/profile',
  );
  if (profile.email !== email) throw new Error(`Profile email mismatch: ${profile.email}`);
  if (!profile.tenantId) throw new Error('Profile did not include tenantId');

  const formData = new FormData();
  formData.append('file', new Blob([PNG_1X1], { type: 'image/png' }), `release-smoke-${stamp}.png`);
  const upload = await readJson(
    await fetch(`${apiUrl}/products/upload-image`, {
      method: 'POST',
      headers: { authorization },
      body: formData,
    }),
    'POST /products/upload-image',
  );
  if (!String(upload.imageUrl || '').startsWith('/uploads/products/')) {
    throw new Error(`Unexpected upload imageUrl: ${upload.imageUrl}`);
  }

  const productName = `Release Smoke Product ${stamp}`;
  const product = await readJson(
    await fetch(`${apiUrl}/products`, {
      method: 'POST',
      headers: {
        authorization,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: productName,
        price: 12345,
        cost: 6789,
        stock: 7,
        category: 'Release Smoke',
        imageUrl: upload.imageUrl,
        isActive: true,
      }),
    }),
    'POST /products',
  );
  if (product.imageUrl !== upload.imageUrl) throw new Error('Product imageUrl did not match uploaded image');

  const imageResponse = await fetch(`${apiUrl}${upload.imageUrl}`);
  if (!imageResponse.ok) {
    throw new Error(`Uploaded image did not serve successfully: ${imageResponse.status}`);
  }

  await cleanupSmokeArtifacts(apiUrl, authorization, profile.sub, product.id, upload.imageUrl);

  return {
    email,
    imageUrl: upload.imageUrl,
    productId: product.id,
    tenantId: profile.tenantId,
  };
}

async function main() {
  const result = await runReleaseRuntimeSmoke();
  console.log('Release runtime smoke passed:');
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  readJson,
  runReleaseRuntimeSmoke,
  cleanupSmokeArtifacts,
};
