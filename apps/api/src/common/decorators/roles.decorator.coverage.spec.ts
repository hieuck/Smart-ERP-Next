const SetMetadata = jest.fn((key, value) => ({ key, value }));

jest.mock('@nestjs/common', () => ({ SetMetadata }));

import { ROLES_KEY, Roles } from './roles.decorator';

describe('Roles decorator', () => {
  it('stores role metadata under the shared roles key', () => {
    expect(Roles('admin', 'owner')).toEqual({ key: ROLES_KEY, value: ['admin', 'owner'] });
    expect(SetMetadata).toHaveBeenCalledWith('roles', ['admin', 'owner']);
  });
});
