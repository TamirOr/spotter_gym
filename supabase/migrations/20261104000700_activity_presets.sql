-- Preset activities, with Hebrew and English names so friends using either language share one activity.
-- Aliases are normalized by the prepare_activity trigger.
insert into public.activities (owner_id, name, name_he, kind, aliases) values
  (null, 'Gym', 'חדר כושר', 'strength', array['weights', 'lifting', 'gym workout', 'כושר', 'משקולות']),
  (null, 'Running', 'ריצה', 'endurance', array['run', 'jogging', 'לרוץ']),
  (null, 'Walking', 'הליכה', 'endurance', array['walk', 'לטייל']),
  (null, 'Cycling', 'רכיבה', 'endurance', array['bike', 'biking', 'אופניים', 'רכיבה על אופניים']),
  (null, 'Soccer', 'כדורגל', 'sport', array['football']),
  (null, 'Boxing', 'אגרוף', 'sport', array['kickboxing', 'קיקבוקס']),
  (null, 'Mobility', 'מוביליטי', 'mobility', array['stretching', 'yoga', 'מתיחות', 'יוגה']);
