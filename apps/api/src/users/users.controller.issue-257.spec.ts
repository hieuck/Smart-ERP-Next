import { readFileSync } from 'fs';
import { resolve } from 'path';
import 'reflect-metadata';
import { UsersController } from './users.controller';

const PATH_METADATA = 'path';
const METHOD_METADATA = 'method';

const readSource = () =>
  readFileSync(resolve(__dirname, './users.controller.ts'), 'utf8');

/**
 * Returns the PATCH route paths declared on UsersController in declaration
 * order, by walking the prototype's own method names and reading each method's
 * route metadata. NestJS/Express matches routes in declaration order, so this
 * is the order that requests are dispatched in.
 */
function getPatchRoutePaths(): string[] {
  const proto = UsersController.prototype;
  const methodNames = Object.getOwnPropertyNames(proto).filter(
    (name) => name !== 'constructor',
  );
  const routes: string[] = [];
  for (const name of methodNames) {
    const method = proto[name];
    if (typeof method !== 'function') continue;
    const httpMethod = Reflect.getMetadata(METHOD_METADATA, method);
    // NestJS stores HTTP method as a number; PATCH === 4 (RequestMethod.PATCH)
    if (httpMethod !== 4) continue;
    const path = Reflect.getMetadata(PATH_METADATA, method);
    routes.push(path);
  }
  return routes;
}

describe('UsersController issue #257 — PATCH /users/profile route shadowing', () => {
  const source = readSource();

  it('declares @Patch(profile) so it is reachable (not shadowed by @Patch(:id))', () => {
    const patchRoutes = getPatchRoutePaths();
    // 'profile' must be among the PATCH routes at all
    expect(patchRoutes).toContain('profile');

    // And critically: 'profile' must come BEFORE ':id' in declaration order,
    // otherwise PATCH /users/profile matches @Patch(':id') with id="profile"
    // and is rejected by ParseUUIDPipe (or worse, mutates the wrong record).
    const profileIndex = patchRoutes.indexOf('profile');
    const idIndex = patchRoutes.indexOf(':id');
    expect(idIndex).toBeGreaterThan(-1);
    expect(profileIndex).toBeLessThan(idIndex);
  });

  it('keeps @Patch(profile) textually before @Patch(:id) in source', () => {
    // Belt-and-suspenders: the source order should also reflect the fix, so a
    // future reader cannot accidentally reintroduce the shadowing by reordering.
    const profilePos = source.indexOf("@Patch('profile')");
    const idPos = source.indexOf("@Patch(':id')");
    expect(profilePos).toBeGreaterThan(-1);
    expect(idPos).toBeGreaterThan(-1);
    expect(profilePos).toBeLessThan(idPos);
  });

  it('updateProfile targets the authenticated user (req.user.sub), not a route id', () => {
    // Confirms the semantic intent of the dedicated profile route: it must not
    // accept an id from the URL, otherwise it is indistinguishable from update().
    const proto = UsersController.prototype;
    const fn = proto.updateProfile;
    expect(typeof fn).toBe('function');
    const fnSource = fn.toString();
    expect(fnSource).toContain('req.user.sub');
    // The profile handler must not read a URL id param.
    expect(fnSource).not.toMatch(/@Param/);
  });
});
