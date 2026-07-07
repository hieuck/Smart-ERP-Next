import { SearchService, escapeLikePattern } from './search.service';

describe('escapeLikePattern', () => {
  it('escapes percent sign', () => {
    expect(escapeLikePattern('%')).toBe('\\%');
  });

  it('escapes underscore', () => {
    expect(escapeLikePattern('_')).toBe('\\_');
  });

  it('escapes backslash', () => {
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b');
  });

  it('leaves normal characters unchanged', () => {
    expect(escapeLikePattern('hello')).toBe('hello');
  });

  it('escapes a combination of special characters', () => {
    expect(escapeLikePattern('100%_off\\')).toBe('100\\%\\_off\\\\');
  });
});

describe('SearchService', () => {
  let service: SearchService;
  let mockDb: { execute: jest.Mock };

  beforeEach(() => {
    mockDb = { execute: jest.fn().mockResolvedValue({ rows: [] }) };
    service = new SearchService({ db: mockDb } as any);
  });

  it('returns empty array for empty query', async () => {
    const r = await service.search('t1', '   ');
    expect(r).toEqual([]);
    expect(mockDb.execute).not.toHaveBeenCalled();
  });

  it('delegates search to db.execute with escaped wildcard term', async () => {
    await service.search('t1', '%', 5);
    expect(mockDb.execute).toHaveBeenCalled();
    const query = mockDb.execute.mock.calls[0][0];
    const chunks = query.queryChunks?.map((c: any) => c.value ?? c) ?? [];
    expect(chunks).toContain('%\\%%');
  });
});
