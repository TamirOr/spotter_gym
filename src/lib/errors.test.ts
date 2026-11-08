import { errorMessageKey } from './errors';

describe('errorMessageKey', () => {
  it('maps known server rules to their message', () => {
    expect(errorMessageKey({ message: 'not_friends' })).toBe('errors.notFriends');
    expect(errorMessageKey({ message: 'clique_full' })).toBe('errors.cliqueFull');
  });

  it('hides everything else behind a generic message', () => {
    expect(errorMessageKey({ message: 'duplicate key value violates unique constraint' })).toBe('errors.generic');
    expect(errorMessageKey(new Error('Network request failed'))).toBe('errors.generic');
    expect(errorMessageKey(null)).toBe('errors.generic');
  });
});
