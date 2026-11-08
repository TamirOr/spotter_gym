-- One-time Going photos: uploaded once by the athlete, opened once by each clique-mate, then swept away.
begin;

select test.user('Noa') as noa \gset
select test.user('Yoav') as yoav \gset
select test.user('Maya') as maya \gset
select test.user('Friend only') as friend_only \gset
select test.befriend(:'noa', :'friend_only');
select test.clique('Morning', array[:'noa', :'yoav', :'maya']::uuid[]) as clique \gset

set role authenticated;
select test.login(:'noa');
select (public.mark_going(gen_random_uuid(), test.activity('Gym'))).id as going \gset
select :'noa' || '/' || :'going' || '.jpg' as path \gset

-- Upload and attach
select test.ok(public.can_upload_going_photo(:'path'), 'the athlete may upload to their open Going''s path');
select test.ok(not public.can_upload_going_photo(:'noa' || '/' || gen_random_uuid() || '.jpg'), 'only to a path of their own Going');
select public.attach_going_photo(:'going');
select public.attach_going_photo(:'going');
select test.eq((select count(*) from public.going_photos)::integer, 1, 'attaching again is a safe retry');
select test.ok(not public.can_upload_going_photo(:'path'), 'a photo is uploaded once and never replaced');
select test.ok(public.can_download_going_photo(:'path'), 'the athlete can always load their own photo');
select test.fails($$select public.open_going_photo('$$ || :'going' || $$')$$, 'photo_unavailable', 'the athlete does not use up a look at their own photo');

select test.login(:'yoav');
select test.ok(not public.can_upload_going_photo(:'path'), 'nobody uploads to someone else''s Going');
select test.fails($$select public.attach_going_photo('$$ || :'going' || $$')$$, 'not_found', 'nobody attaches a photo to someone else''s Going');

-- Who sees it
select test.eq((select count(*) from public.going_photos)::integer, 1, 'clique-mates see that there is a photo');
select test.ok(not public.can_download_going_photo(:'path'), 'seeing that there is a photo does not open it');
select test.login(:'friend_only');
select test.eq((select count(*) from public.going_photos)::integer, 0, 'friends outside the clique do not see the photo');
select test.fails($$select public.open_going_photo('$$ || :'going' || $$')$$, 'photo_unavailable', 'friends outside the clique cannot open it');

-- The one look
select test.login(:'yoav');
select test.eq(public.open_going_photo(:'going'), :'path', 'opening returns the file to download');
select test.ok(public.can_download_going_photo(:'path'), 'the viewer may download it right after opening');
select test.eq(public.open_going_photo(:'going'), :'path', 'opening again within the minute is a retry of the same look');
select test.eq((select count(*) from public.photo_views)::integer, 1, 'the viewer sees their own viewing');

select test.login(:'noa');
select test.eq((select count(*) from public.photo_views)::integer, 1, 'the athlete sees who opened the photo');
select test.login(:'maya');
select test.eq((select count(*) from public.photo_views)::integer, 0, 'members do not see each other''s viewings');

reset role;
update public.photo_views set opened_at = now() - interval '2 minutes';
set role authenticated;
select test.login(:'yoav');
select test.fails($$select public.open_going_photo('$$ || :'going' || $$')$$, 'photo_already_seen', 'each clique-mate sees the photo once');
select test.ok(not public.can_download_going_photo(:'path'), 'the file is out of reach after the look');
select test.ok(public.can_cheer(:'going'), 'cheering stays open after the look');

-- Sweeping
select test.fails('select public.going_photos_to_remove()', 'permission denied', 'only the sweeper lists files to delete');
reset role;
select test.ok(not (:'path' in (select public.going_photos_to_remove())), 'kept while a clique-mate has not seen it');

set role authenticated;
select test.login(:'maya');
select public.open_going_photo(:'going');
reset role;
select test.ok(not (:'path' in (select public.going_photos_to_remove())), 'kept during the last viewer''s download minute');
update public.photo_views set opened_at = now() - interval '2 minutes';
select test.ok(:'path' in (select public.going_photos_to_remove()), 'deleted once everyone has seen it');
select public.mark_going_photos_removed(array[:'path']);
select test.ok(not (:'path' in (select public.going_photos_to_remove())), 'a removed file is not listed again');

set role authenticated;
select test.login(:'yoav');
select test.eq((select count(*) from public.going_photos)::integer, 0, 'a removed photo disappears for clique-mates');
select test.login(:'noa');
select test.eq((select count(*) from public.going_photos)::integer, 1, 'the athlete still sees that it was shared');
select test.eq((select count(*) from public.photo_views)::integer, 2, 'and who opened it');
select test.ok(not public.can_upload_going_photo(:'path'), 'no second photo for the same workout');

-- A cancelled workout takes its photo with it
select (public.mark_going(gen_random_uuid(), test.activity('Gym'))).id as second \gset
select public.attach_going_photo(:'second');
select public.cancel_going();
select test.login(:'yoav');
select test.fails($$select public.open_going_photo('$$ || :'second' || $$')$$, 'photo_unavailable', 'a cancelled workout''s photo cannot be opened');
reset role;
select test.ok(public.going_photo_path(:'noa', :'second') in (select public.going_photos_to_remove()), 'a cancelled workout''s photo is deleted');

-- A photo lasts a day at most
set role authenticated;
select test.login(:'noa');
select (public.mark_going(gen_random_uuid(), test.activity('Gym'))).id as third \gset
select public.attach_going_photo(:'third');
reset role;
update public.going_photos set expires_at = now() - interval '1 second' where checkin_id = :'third';
select test.ok(public.going_photo_path(:'noa', :'third') in (select public.going_photos_to_remove()), 'an expired photo is deleted');
set role authenticated;
select test.login(:'yoav');
select test.fails($$select public.open_going_photo('$$ || :'third' || $$')$$, 'photo_unavailable', 'an expired photo cannot be opened');

-- Only an open Going takes a photo
select test.login(:'noa');
select public.mark_done(:'third', test.activity('Gym'));
select test.fails($$select public.attach_going_photo('$$ || :'third' || $$')$$, 'not_found', 'a finished workout takes no new photo');
select test.ok(not public.can_upload_going_photo(:'noa' || '/' || :'third' || '.jpg'), 'and no upload');

-- Removed rows are pruned after a week
reset role;
update public.going_photos set removed_at = now() - interval '8 days' where checkin_id = :'going';
select public.prune_going_photos();
select test.eq((select count(*) from public.going_photos where checkin_id = :'going')::integer, 0, 'old removed rows are pruned');

rollback;
