import { viewOf } from './adminView';

describe('viewOf', () => {
  it('opens admins in the admin screens until they switch', () => {
    expect(viewOf(true, null)).toBe('admin');
    expect(viewOf(true, 'admin')).toBe('admin');
    expect(viewOf(true, 'user')).toBe('user');
  });

  it('shows everyone else the app', () => {
    expect(viewOf(false, null)).toBe('user');
    expect(viewOf(false, 'admin')).toBe('user');
  });
});
