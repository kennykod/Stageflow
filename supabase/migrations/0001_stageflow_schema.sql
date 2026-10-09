-- StageFlow – production schema proposal (Postgres / Supabase)
-- STATUS: designed, NOT connected to the prototype (the demo stores data in the browser).
--
-- Principles
--   * Tenant isolation: every row carries organization_id; RLS restricts to the caller's org.
--   * Production-scoped RBAC: rights come from production_members.role / full_schedule.
--   * Ensemble members only ever read PUBLISHED data they are called to (or full_schedule).
--   * Drafts live in rehearsal_versions with is_published = false and are invisible to members.
--   * audit_log is append-only (no UPDATE/DELETE policies; revoke from authenticated).
--   * Script text is stored per line with RLS; source PDFs live in a private bucket
--     accessed only through short-lived signed URLs issued by a server function.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Organisation & people
-- ---------------------------------------------------------------------------
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table people (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  auth_user_id uuid unique,               -- auth.users.id (SSO)
  full_name text not null,
  title text,
  department text not null,
  org_role text not null default 'staff' check (org_role in ('org_admin','staff')),
  email text,                              -- data minimisation: phone optional, visible to planners only
  phone text,
  created_at timestamptz not null default now()
);
create index on people(organization_id);

create table productions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  subtitle text,
  premiere date,
  status text not null default 'planering' check (status in ('planering','repetition','spelas','avslutad')),
  external_ref jsonb not null default '{}'::jsonb,   -- e.g. {"yesplan_event_id": "..."} once an integration is verified
  created_at timestamptz not null default now()
);
create index on productions(organization_id);

create table production_members (
  production_id uuid not null references productions(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null check (role in ('producer','scheduler','member')),
  full_schedule boolean not null default false,
  function text,
  primary key (production_id, person_id)
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  location text,
  capacity int,
  external_ref jsonb not null default '{}'::jsonb
);

create table characters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  production_id uuid not null references productions(id) on delete cascade,
  name text not null,
  description text
);
create table character_cast (
  character_id uuid not null references characters(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  primary key (character_id, person_id)
);
create table scenes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  production_id uuid not null references productions(id) on delete cascade,
  number text not null,
  title text not null,
  sort_order int not null default 0
);
create table scene_characters (
  scene_id uuid not null references scenes(id) on delete cascade,
  character_id uuid not null references characters(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  primary key (scene_id, character_id)
);

-- ---------------------------------------------------------------------------
-- Scheduling: rehearsal + versioned content (draft / published)
-- ---------------------------------------------------------------------------
create table rehearsals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  production_id uuid not null references productions(id) on delete cascade,
  cancelled boolean not null default false,
  created_by uuid not null references people(id),
  created_at timestamptz not null default now()
);

create table rehearsal_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  rehearsal_id uuid not null references rehearsals(id) on delete cascade,
  version int not null,
  is_published boolean not null default false,
  title text not null,
  type text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  room_id uuid references rooms(id),
  scene_ids uuid[] not null default '{}',
  description text not null default '',
  created_by uuid not null references people(id),
  created_at timestamptz not null default now(),
  unique (rehearsal_id, version)
);
create index on rehearsal_versions(rehearsal_id, is_published);
create index on rehearsal_versions using gist (tstzrange(starts_at, ends_at));

create table rehearsal_participants (
  version_id uuid not null references rehearsal_versions(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  primary key (version_id, person_id)
);

create table unavailability (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text                                   -- free text kept short; no health details
);

-- ---------------------------------------------------------------------------
-- Notifications & acknowledgements (receipt ≠ approval)
-- ---------------------------------------------------------------------------
create table dispatches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  production_id uuid not null references productions(id) on delete cascade,
  rehearsal_id uuid not null references rehearsals(id) on delete cascade,
  version_id uuid not null references rehearsal_versions(id),
  kind text not null check (kind in ('ny','andrad','installd','borttagen','paminnelse')),
  changes jsonb not null default '[]'::jsonb,
  requires_response boolean not null default false,
  message text,
  created_by uuid not null references people(id),
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  dispatch_id uuid not null references dispatches(id) on delete cascade,
  recipient_id uuid not null references people(id) on delete cascade,
  read_at timestamptz,
  ack_at timestamptz,                                         -- "Jag har tagit del"
  response text check (response in ('kommer','kan-inte')),    -- separate attendance answer
  response_note text,
  responded_at timestamptz,
  reminder_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (dispatch_id, recipient_id)
);
create index on notifications(recipient_id, ack_at);

-- ---------------------------------------------------------------------------
-- Scripts (copyright-sensitive)
-- ---------------------------------------------------------------------------
create table scripts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  production_id uuid not null references productions(id) on delete cascade,
  title text not null,
  version_label text not null,
  status text not null default 'granskas' check (status in ('granskas','verifierad','arkiverad')),
  rights_confirmed_by uuid not null references people(id),
  rights_note text not null,
  source_object_path text,             -- private storage bucket; served via signed URL only
  verified_by uuid references people(id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create table script_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  script_id uuid not null references scripts(id) on delete cascade,
  scene_id uuid not null references scenes(id),
  sort_order int not null,
  character_id uuid references characters(id),   -- null = stage direction
  text text not null
);
create table script_annotations (                -- private to the author
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  line_id uuid not null references script_lines(id) on delete cascade,
  kind text not null check (kind in ('bookmark','note')),
  text text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Audit log (append-only)
-- ---------------------------------------------------------------------------
create table audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  production_id uuid references productions(id),
  actor_id uuid not null references people(id),
  action text not null,
  target_id uuid,
  summary text not null,
  at timestamptz not null default now()
);
revoke update, delete on audit_log from authenticated;

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER, stable, search_path pinned)
-- ---------------------------------------------------------------------------
create or replace function current_person() returns people
language sql stable security definer set search_path = public as $$
  select p.* from people p where p.auth_user_id = auth.uid() limit 1
$$;

create or replace function is_org_admin(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from people p where p.auth_user_id = auth.uid() and p.organization_id = org and p.org_role = 'org_admin')
$$;

create or replace function can_plan(prod uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from production_members m join people p on p.id = m.person_id
    where p.auth_user_id = auth.uid() and m.production_id = prod and m.role in ('producer','scheduler')
  ) or exists (
    select 1 from productions pr join people p on p.organization_id = pr.organization_id
    where pr.id = prod and p.auth_user_id = auth.uid() and p.org_role = 'org_admin'
  )
$$;

create or replace function is_member(prod uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from production_members m join people p on p.id = m.person_id
    where p.auth_user_id = auth.uid() and m.production_id = prod
  ) or can_plan(prod)
$$;

create or replace function has_full_schedule(prod uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from production_members m join people p on p.id = m.person_id
    where p.auth_user_id = auth.uid() and m.production_id = prod and m.full_schedule
  ) or can_plan(prod)
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table organizations enable row level security;
alter table people enable row level security;
alter table productions enable row level security;
alter table production_members enable row level security;
alter table rooms enable row level security;
alter table characters enable row level security;
alter table character_cast enable row level security;
alter table scenes enable row level security;
alter table scene_characters enable row level security;
alter table rehearsals enable row level security;
alter table rehearsal_versions enable row level security;
alter table rehearsal_participants enable row level security;
alter table unavailability enable row level security;
alter table dispatches enable row level security;
alter table notifications enable row level security;
alter table scripts enable row level security;
alter table script_lines enable row level security;
alter table script_annotations enable row level security;
alter table audit_log enable row level security;

-- Same-organisation reads for reference data
create policy org_read_people on people for select using (organization_id = (current_person()).organization_id);
create policy org_read_rooms on rooms for select using (organization_id = (current_person()).organization_id);
create policy member_read_productions on productions for select using (is_member(id));
create policy member_read_members on production_members for select using (is_member(production_id));
create policy planner_write_members on production_members for all using (can_plan(production_id)) with check (can_plan(production_id));
create policy member_read_characters on characters for select using (is_member(production_id));
create policy planner_write_characters on characters for all using (can_plan(production_id)) with check (can_plan(production_id));
create policy member_read_scenes on scenes for select using (is_member(production_id));
create policy planner_write_scenes on scenes for all using (can_plan(production_id)) with check (can_plan(production_id));

-- Rehearsals: planners see everything in their productions
create policy planner_all_rehearsals on rehearsals for all using (can_plan(production_id)) with check (can_plan(production_id));
create policy member_read_rehearsals on rehearsals for select using (is_member(production_id));

-- Versions: planners see drafts; members only published versions they are called to (or full schedule)
create policy planner_all_versions on rehearsal_versions for all
  using (can_plan((select production_id from rehearsals r where r.id = rehearsal_id)))
  with check (can_plan((select production_id from rehearsals r where r.id = rehearsal_id)));
create policy member_read_published_versions on rehearsal_versions for select using (
  is_published and (
    exists (select 1 from rehearsal_participants rp where rp.version_id = id and rp.person_id = (current_person()).id)
    or has_full_schedule((select production_id from rehearsals r where r.id = rehearsal_id))
  )
);
create policy read_participants on rehearsal_participants for select using (
  exists (select 1 from rehearsal_versions v where v.id = version_id)   -- inherits version visibility via RLS
);

-- Unavailability: own rows + planners of shared productions
create policy own_unavailability on unavailability for all using (person_id = (current_person()).id) with check (person_id = (current_person()).id);

-- Notifications: recipients read/update ONLY their own receipt fields (enforced by column grants)
create policy own_notifications on notifications for select using (recipient_id = (current_person()).id);
create policy own_ack on notifications for update using (recipient_id = (current_person()).id) with check (recipient_id = (current_person()).id);
create policy planner_read_notifications on notifications for select using (
  can_plan((select production_id from dispatches d where d.id = dispatch_id))
);
revoke update on notifications from authenticated;
grant update (read_at, ack_at, response, response_note, responded_at) on notifications to authenticated;

create policy planner_dispatches on dispatches for all using (can_plan(production_id)) with check (can_plan(production_id));
create policy recipient_dispatches on dispatches for select using (
  exists (select 1 from notifications n where n.dispatch_id = id and n.recipient_id = (current_person()).id)
);

-- Scripts: members read verified scripts; planners/dramaturgs manage
create policy member_read_scripts on scripts for select using (status = 'verifierad' and is_member(production_id));
create policy planner_manage_scripts on scripts for all using (can_plan(production_id)) with check (can_plan(production_id));
create policy member_read_lines on script_lines for select using (
  exists (select 1 from scripts s where s.id = script_id and s.status = 'verifierad' and is_member(s.production_id))
);
create policy own_annotations on script_annotations for all using (person_id = (current_person()).id) with check (person_id = (current_person()).id);

-- Audit: insert by any authenticated member action (via server functions), read by producers/admins
create policy audit_insert on audit_log for insert with check (organization_id = (current_person()).organization_id);
create policy audit_read on audit_log for select using (is_org_admin(organization_id) or (production_id is not null and can_plan(production_id)));
