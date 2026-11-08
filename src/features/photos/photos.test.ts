import { goingPhotoPath, isAlreadyUploaded, photoState, type GoingPhoto } from './photos';

const photo = (owner: string, viewers: string[] = []): GoingPhoto => ({
  checkin_id: 'checkin',
  user_id: owner,
  photo_views: viewers.map((viewer_id) => ({ viewer_id })),
});

describe('goingPhotoPath', () => {
  it('matches the path the server allows uploads to', () => {
    expect(goingPhotoPath('user', 'checkin')).toBe('user/checkin.jpg');
  });
});

describe('photoState', () => {
  it('is new until I open it, then seen', () => {
    expect(photoState([photo('noa')], 'checkin', 'me')).toEqual({ kind: 'new' });
    expect(photoState([photo('noa', ['me'])], 'checkin', 'me')).toEqual({ kind: 'seen' });
  });

  it('counts who opened my own photo', () => {
    expect(photoState([photo('me', ['noa', 'yoav'])], 'checkin', 'me')).toEqual({ kind: 'mine', views: 2 });
    expect(photoState([photo('me')], 'checkin', 'me')).toEqual({ kind: 'mine', views: 0 });
  });

  it('is none without a photo for that workout', () => {
    expect(photoState([photo('noa')], 'other', 'me')).toEqual({ kind: 'none' });
    expect(photoState([photo('noa')], null, 'me')).toEqual({ kind: 'none' });
    expect(photoState(undefined, 'checkin', 'me')).toEqual({ kind: 'none' });
  });
});

describe('isAlreadyUploaded', () => {
  it('recognises a duplicate upload', () => {
    expect(isAlreadyUploaded({ statusCode: '409', message: 'Duplicate' })).toBe(true);
    expect(isAlreadyUploaded({ status: 409 })).toBe(true);
    expect(isAlreadyUploaded({ message: 'The resource already exists' })).toBe(true);
  });

  it('lets other failures through', () => {
    expect(isAlreadyUploaded({ statusCode: '403', message: 'new row violates row-level security policy' })).toBe(false);
    expect(isAlreadyUploaded(null)).toBe(false);
  });
});
