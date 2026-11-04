-- Activity names: normalization, matching across languages, and no custom duplicates of presets.
begin;

select test.eq(public.normalize_name('  GYM  '), 'gym', 'trims and lower-cases');
select test.eq(public.normalize_name('gym   workout'), 'gym workout', 'collapses inner spaces');
select test.eq(public.normalize_name('חֲדַר כּוֹשֶׁר'), 'חדר כושר', 'drops Hebrew vowel marks');
select test.eq(public.normalize_name('ריצה ארוכה ם'), 'ריצה ארוכה מ', 'treats final letters like regular ones');

select test.user('Noa') as noa \gset
select test.user('Yoav') as yoav \gset
set role authenticated;
select test.login(:'noa');

select test.eq((select exact from public.match_activity(' GYM ')), true, 'exact match ignores case and spaces');
select test.eq((select activity_id from public.match_activity('weights')), test.activity('Gym'), 'aliases map to the preset');
select test.eq((select activity_id from public.match_activity('חדר כושר')), test.activity('Gym'), 'aliases work across languages');
select test.eq((select exact from public.match_activity('boxng')), false, 'a near match is only a suggestion');
select test.eq((select activity_id from public.match_activity('boxng')), test.activity('Boxing'), 'suggests the closest activity');
select test.eq((select count(*) from public.match_activity('underwater chess'))::integer, 0, 'nothing close, nothing suggested');

insert into public.activities (name) values ('  Padel ');
select test.eq((select name from public.activities where normalized_name = 'padel'), 'Padel', 'custom names are trimmed');
select test.eq((select owner_id from public.activities where normalized_name = 'padel'), :'noa'::uuid, 'custom activity belongs to its creator');

-- should fail
select test.fails($$insert into public.activities (name) values ('LIFTING')$$, 'activity_exists', 'a custom activity cannot shadow a preset alias');
select test.fails($$insert into public.activities (name) values ('padel')$$, 'duplicate key', 'one name per owner');
select test.fails($$insert into public.activities (name, owner_id) values ('Climbing', null)$$, 'permission denied', 'users cannot create presets');

select test.login(:'yoav');
select test.eq((select count(*) from public.activities where normalized_name = 'padel')::integer, 0, 'strangers cannot see my custom activity');
select test.eq((select count(*) from public.match_activity('padel'))::integer, 0, 'matching ignores other users'' activities');

rollback;
