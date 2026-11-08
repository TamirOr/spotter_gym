-- Types for admins and sign-up approval, in their own migration: a new enum value can be used only
-- after the transaction that added it has committed.

create type public.approval_status as enum ('pending', 'approved', 'rejected');

-- To admins: someone signed up and waits for approval. To the new user: an admin approved them.
alter type public.notification_kind add value 'signup_pending';
alter type public.notification_kind add value 'account_approved';
