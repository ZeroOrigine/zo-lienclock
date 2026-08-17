-- LienClock schema. Shared DB: every object prefixed lienclock_.
-- CANONICAL single-file schema. Supersedes all earlier append/patch blocks
-- (QA-020, QA-024, QA-025, QA-027, QA-036, QA-039, C-001, C-002, C-003):
-- their intent is folded into exactly one definition per object below.
-- Ordering guarantee: enums -> tables -> indexes -> functions -> privileges
-- (exact final signatures) -> triggers -> RLS -> seeds -> hardening.

-- ============ ENUMS ============
CREATE TYPE lienclock_job_status AS ENUM ('active', 'completed', 'archived');
CREATE TYPE lienclock_deadline_type AS ENUM ('preliminary_notice', 'notice_of_intent', 'lien_filing', 'enforcement');
CREATE TYPE lienclock_anchor_event AS ENUM ('job_start', 'job_completion', 'lien_filing');
CREATE TYPE lienclock_deadline_status AS ENUM ('upcoming', 'completed', 'missed', 'not_applicable');
CREATE TYPE lienclock_reminder_channel AS ENUM ('email', 'sms');
CREATE TYPE lienclock_reminder_status AS ENUM ('pending', 'sent', 'failed', 'canceled');
CREATE TYPE lienclock_subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused');
CREATE TYPE lienclock_payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');

-- ============ TABLES ============
CREATE TABLE lienclock_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  company_name text,
  phone text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  timezone text NOT NULL DEFAULT 'America/Chicago',
  email_reminders boolean NOT NULL DEFAULT true,
  sms_reminders boolean NOT NULL DEFAULT false,
  reminder_days integer[] NOT NULL DEFAULT '{30,14,7,1}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lienclock_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  billing_interval text NOT NULL DEFAULT 'month' CHECK (billing_interval IN ('month', 'year')),
  max_active_jobs integer CHECK (max_active_jobs IS NULL OR max_active_jobs > 0),
  sms_reminders boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lienclock_state_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code text NOT NULL CHECK (state_code ~ '^[A-Z]{2}$'),
  deadline_type lienclock_deadline_type NOT NULL,
  anchor_event lienclock_anchor_event NOT NULL,
  offset_days integer NOT NULL,
  statute_citation text NOT NULL,
  notes text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lienclock_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL DEFAULT 'lienclock',
  name text NOT NULL,
  state_code text NOT NULL CHECK (state_code ~ '^[A-Z]{2}$'),
  gc_name text NOT NULL,
  owner_name text,
  property_address text,
  start_date date NOT NULL,
  completion_date date CHECK (completion_date IS NULL OR completion_date >= start_date),
  lien_filed_date date,
  contract_amount numeric(12,2) CHECK (contract_amount IS NULL OR contract_amount >= 0),
  status lienclock_job_status NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lienclock_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL DEFAULT 'lienclock',
  job_id uuid NOT NULL REFERENCES lienclock_jobs(id) ON DELETE CASCADE,
  deadline_type lienclock_deadline_type NOT NULL,
  anchor_event lienclock_anchor_event NOT NULL,
  due_date date NOT NULL,
  is_estimated boolean NOT NULL DEFAULT false,
  status lienclock_deadline_status NOT NULL DEFAULT 'upcoming',
  completed_at timestamptz,
  statute_citation text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, deadline_type)
);

CREATE TABLE lienclock_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL DEFAULT 'lienclock',
  deadline_id uuid NOT NULL REFERENCES lienclock_deadlines(id) ON DELETE CASCADE,
  channel lienclock_reminder_channel NOT NULL DEFAULT 'email',
  days_before integer NOT NULL CHECK (days_before >= 0),
  remind_at timestamptz NOT NULL,
  status lienclock_reminder_status NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deadline_id, channel, days_before)
);

CREATE TABLE lienclock_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL DEFAULT 'lienclock',
  plan_code text NOT NULL DEFAULT 'free' REFERENCES lienclock_plans(code),
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  status lienclock_subscription_status NOT NULL DEFAULT 'active',
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lienclock_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL DEFAULT 'lienclock',
  stripe_payment_intent_id text UNIQUE,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  status lienclock_payment_status NOT NULL DEFAULT 'pending',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lienclock_stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ INDEXES ============
CREATE INDEX lienclock_profiles_email_idx ON lienclock_profiles (lower(email));
CREATE INDEX lienclock_jobs_user_status_idx ON lienclock_jobs (user_id, status);
CREATE INDEX lienclock_jobs_state_idx ON lienclock_jobs (state_code);
CREATE INDEX lienclock_deadlines_user_due_idx ON lienclock_deadlines (user_id, due_date);
CREATE INDEX lienclock_deadlines_upcoming_idx ON lienclock_deadlines (due_date) WHERE status = 'upcoming';
CREATE INDEX lienclock_deadlines_job_idx ON lienclock_deadlines (job_id);
CREATE INDEX lienclock_reminders_user_idx ON lienclock_reminders (user_id);
CREATE INDEX lienclock_reminders_pending_idx ON lienclock_reminders (remind_at) WHERE status = 'pending';
CREATE INDEX lienclock_reminders_deadline_idx ON lienclock_reminders (deadline_id);
CREATE INDEX lienclock_subscriptions_customer_idx ON lienclock_subscriptions (stripe_customer_id);
CREATE INDEX lienclock_subscriptions_plan_idx ON lienclock_subscriptions (plan_code);
CREATE INDEX lienclock_payments_user_idx ON lienclock_payments (user_id);
CREATE UNIQUE INDEX lienclock_state_rules_active_uniq ON lienclock_state_rules (state_code, deadline_type) WHERE is_active = true;

-- ============ FUNCTIONS (exactly one definition each) ============

CREATE OR REPLACE FUNCTION lienclock_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION lienclock_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lienclock_profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- New-user provisioning: mirror auth.users into lienclock_profiles and seed the
-- free subscription. Also keeps profile email in sync when auth email changes.
CREATE OR REPLACE FUNCTION lienclock_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO lienclock_profiles (id, email, full_name, company_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'company_name'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now();

  INSERT INTO lienclock_subscriptions (user_id, plan_code, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Canonical reminder sync. ONE function, two named call shapes:
--   rpc('lienclock_sync_deadline_reminders', { p_user_id })  -- app/api/profile: rebuild every pending reminder for the user
--   lienclock_sync_deadline_reminders(p_job_id := <uuid>)    -- internal: rebuild for one job (deadline trigger path)
-- (Postgres cannot overload (p_job_id uuid) vs (p_user_id uuid) -- identical type
-- signatures -- so both are optional named parameters of a single function;
-- PostgREST binds rpc arguments by name.)
-- Preference-respecting: honors lienclock_profiles.email_reminders /
-- sms_reminders / phone / reminder_days / timezone. SMS additionally requires a
-- plan with sms_reminders = true (P5), so flipping the profile flag via direct
-- PostgREST cannot produce free SMS sends. Reminders fire at 08:00 in the user's
-- own timezone (P5), with a UTC fallback for invalid zones. SECURITY DEFINER with
-- an in-body owner guard: a signed-in caller may only sync their own data;
-- service role (auth.uid() IS NULL) passes. Idempotent: deletes only 'pending'
-- rows; sent/failed/canceled history is kept.
CREATE OR REPLACE FUNCTION lienclock_sync_deadline_reminders(p_job_id uuid DEFAULT NULL, p_user_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id     uuid;
  v_profile     lienclock_profiles%ROWTYPE;
  v_tz          text;
  v_sms_allowed boolean;
  v_deadline    RECORD;
  v_offset      integer;
  v_remind_at   timestamptz;
  v_created     integer := 0;
BEGIN
  IF p_job_id IS NULL AND p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Resolve the owning user and enforce the owner guard.
  IF p_job_id IS NOT NULL THEN
    SELECT user_id INTO v_user_id FROM lienclock_jobs WHERE id = p_job_id;
    IF NOT FOUND THEN
      RETURN 0;
    END IF;
    IF p_user_id IS NOT NULL AND p_user_id <> v_user_id THEN
      RAISE EXCEPTION 'job % does not belong to user %', p_job_id, p_user_id
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  ELSE
    v_user_id := p_user_id;
  END IF;

  -- Owner guard: signed-in callers may only sync their OWN reminders.
  -- auth.uid() IS NULL (service role / cron / trigger context) is permitted.
  IF auth.uid() IS NOT NULL AND v_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_profile FROM lienclock_profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Validate the stored timezone once; fall back to UTC on an invalid zone.
  v_tz := v_profile.timezone;
  BEGIN
    PERFORM now() AT TIME ZONE v_tz;
  EXCEPTION WHEN OTHERS THEN
    v_tz := 'UTC';
  END;

  -- SMS entitlement: profile toggle AND a phone number AND an entitled plan.
  v_sms_allowed := v_profile.sms_reminders
    AND v_profile.phone IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM lienclock_subscriptions s
      JOIN lienclock_plans p ON p.code = s.plan_code
      WHERE s.user_id = v_user_id
        AND s.status IN ('active', 'trialing', 'past_due')
        AND p.sms_reminders = true
    );

  -- Drop pending reminders in scope; sent/failed/canceled history is preserved.
  DELETE FROM lienclock_reminders r
  USING lienclock_deadlines d
  WHERE r.deadline_id = d.id
    AND d.user_id = v_user_id
    AND (p_job_id IS NULL OR d.job_id = p_job_id)
    AND r.status = 'pending';

  -- Rebuild pending reminders for upcoming deadlines from the owner's preferences.
  FOR v_deadline IN
    SELECT d.id, d.due_date, d.product_id
    FROM lienclock_deadlines d
    WHERE d.user_id = v_user_id
      AND (p_job_id IS NULL OR d.job_id = p_job_id)
      AND d.status = 'upcoming'
  LOOP
    FOREACH v_offset IN ARRAY v_profile.reminder_days LOOP
      -- 08:00 on the reminder day, in the user's own timezone.
      v_remind_at := ((v_deadline.due_date - v_offset)::timestamp + interval '8 hours') AT TIME ZONE v_tz;
      IF v_remind_at <= now() THEN
        CONTINUE; -- only schedule reminders that are still in the future
      END IF;

      IF v_profile.email_reminders THEN
        INSERT INTO lienclock_reminders (user_id, product_id, deadline_id, channel, days_before, remind_at, status)
        VALUES (v_user_id, v_deadline.product_id, v_deadline.id, 'email', v_offset, v_remind_at, 'pending')
        ON CONFLICT (deadline_id, channel, days_before) DO NOTHING;
        v_created := v_created + 1;
      END IF;

      IF v_sms_allowed THEN
        INSERT INTO lienclock_reminders (user_id, product_id, deadline_id, channel, days_before, remind_at, status)
        VALUES (v_user_id, v_deadline.product_id, v_deadline.id, 'sms', v_offset, v_remind_at, 'pending')
        ON CONFLICT (deadline_id, channel, days_before) DO NOTHING;
        v_created := v_created + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_created;
END;
$$;

-- Upserts every deadline for a job from its state rules; snapshots citation and
-- notes onto the row. Called by the API as rpc('lienclock_recalculate_job_deadlines',
-- { p_job_id }) and by the lienclock_jobs_recalc trigger. Owner-guarded (C-003):
-- SECURITY DEFINER bypasses RLS, so a signed-in caller must own the job;
-- service role (auth.uid() IS NULL) passes. Rebuilds only 'upcoming' rows;
-- completed/missed/not_applicable history is never resurrected.
CREATE OR REPLACE FUNCTION lienclock_recalculate_job_deadlines(p_job_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job       lienclock_jobs%ROWTYPE;
  v_rule      lienclock_state_rules%ROWTYPE;
  v_anchor    date;
  v_estimated boolean;
  v_count     integer := 0;
BEGIN
  SELECT * INTO v_job FROM lienclock_jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'job not found' USING ERRCODE = 'no_data_found';
  END IF;

  -- Owner guard: SECURITY DEFINER bypasses RLS, so enforce ownership explicitly.
  IF auth.uid() IS NOT NULL AND v_job.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Rebuild only not-yet-actioned deadlines; completed/missed/N-A history stays.
  DELETE FROM lienclock_deadlines
  WHERE job_id = v_job.id
    AND status = 'upcoming';

  FOR v_rule IN
    SELECT *
    FROM lienclock_state_rules
    WHERE state_code = v_job.state_code
      AND is_active = true
    ORDER BY deadline_type, anchor_event
  LOOP
    v_estimated := false;

    IF v_rule.anchor_event = 'job_start' THEN
      v_anchor := v_job.start_date;
    ELSIF v_rule.anchor_event = 'job_completion' THEN
      IF v_job.completion_date IS NOT NULL THEN
        v_anchor := v_job.completion_date;
      ELSE
        -- No completion date yet: project from start date and flag as estimate.
        v_anchor := v_job.start_date;
        v_estimated := true;
      END IF;
    ELSIF v_rule.anchor_event = 'lien_filing' THEN
      IF v_job.lien_filed_date IS NULL THEN
        CONTINUE; -- enforcement clock has not started
      END IF;
      v_anchor := v_job.lien_filed_date;
    ELSE
      CONTINUE;
    END IF;

    IF v_anchor IS NULL THEN
      CONTINUE;
    END IF;

    -- Do not resurrect a deadline the user already resolved for this rule.
    IF EXISTS (
      SELECT 1
      FROM lienclock_deadlines d
      WHERE d.job_id = v_job.id
        AND d.deadline_type = v_rule.deadline_type
        AND d.status <> 'upcoming'
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO lienclock_deadlines (
      user_id, product_id, job_id, deadline_type, anchor_event,
      due_date, is_estimated, status, statute_citation, description
    ) VALUES (
      v_job.user_id, v_job.product_id, v_job.id, v_rule.deadline_type, v_rule.anchor_event,
      v_anchor + v_rule.offset_days, v_estimated, 'upcoming',
      v_rule.statute_citation, v_rule.notes
    )
    ON CONFLICT (job_id, deadline_type) DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  -- Keep the reminder schedule in sync with the freshly computed deadlines.
  PERFORM lienclock_sync_deadline_reminders(p_job_id := v_job.id);

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION lienclock_jobs_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM lienclock_recalculate_job_deadlines(NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger wrapper: after a deadline row changes, resync reminders for its job.
-- Deliberately NOT named lienclock_sync_deadline_reminders: a zero-arg overload
-- alongside the all-defaults rpc function would be ambiguous at call time.
CREATE OR REPLACE FUNCTION lienclock_deadlines_reminders_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_job_id := OLD.job_id;
  ELSE
    v_job_id := NEW.job_id;
  END IF;

  IF v_job_id IS NOT NULL THEN
    PERFORM lienclock_sync_deadline_reminders(p_job_id := v_job_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- P4: Enforce the plan's active-job limit at the database so direct PostgREST
-- inserts cannot bypass the API gate. Serverside contexts (auth.uid() IS NULL) are exempt.
CREATE OR REPLACE FUNCTION lienclock_enforce_job_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max integer;
  v_active integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- service role / migrations / triggers
  END IF;
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    RETURN NEW; -- already counted
  END IF;

  SELECT p.max_active_jobs INTO v_max
  FROM lienclock_subscriptions s
  JOIN lienclock_plans p ON p.code = s.plan_code
  WHERE s.user_id = NEW.user_id
    AND s.status IN ('active', 'trialing', 'past_due');
  IF NOT FOUND THEN
    v_max := 1; -- no subscription row yet: free limits
  END IF;

  IF v_max IS NOT NULL THEN
    SELECT count(*) INTO v_active
    FROM lienclock_jobs
    WHERE user_id = NEW.user_id AND status = 'active' AND id <> NEW.id;
    IF v_active >= v_max THEN
      RAISE EXCEPTION 'Active job limit reached for your plan. Upgrade to Pro or archive a finished job.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ============ PRIVILEGES (strictly after definitions, exact final signatures) ============
-- rpc entry points: authenticated (owner-guarded in-body) + service_role only.
-- anon is intentionally NOT granted (was the C-001 leak).
REVOKE ALL ON FUNCTION lienclock_recalculate_job_deadlines(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION lienclock_recalculate_job_deadlines(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION lienclock_sync_deadline_reminders(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION lienclock_sync_deadline_reminders(uuid, uuid) TO authenticated, service_role;

-- Internal/trigger functions: not callable by API roles.
REVOKE ALL ON FUNCTION lienclock_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION lienclock_handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION lienclock_jobs_after_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION lienclock_deadlines_reminders_trigger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION lienclock_enforce_job_limit() FROM PUBLIC, anon, authenticated;

-- lienclock_is_admin() is evaluated inside RLS policies with invoker rights.
REVOKE ALL ON FUNCTION lienclock_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION lienclock_is_admin() TO authenticated;

-- ============ TRIGGERS (strictly after functions + privileges) ============
CREATE TRIGGER lienclock_profiles_touch BEFORE UPDATE ON lienclock_profiles
  FOR EACH ROW EXECUTE FUNCTION lienclock_set_updated_at();
CREATE TRIGGER lienclock_plans_touch BEFORE UPDATE ON lienclock_plans
  FOR EACH ROW EXECUTE FUNCTION lienclock_set_updated_at();
CREATE TRIGGER lienclock_state_rules_touch BEFORE UPDATE ON lienclock_state_rules
  FOR EACH ROW EXECUTE FUNCTION lienclock_set_updated_at();
CREATE TRIGGER lienclock_jobs_touch BEFORE UPDATE ON lienclock_jobs
  FOR EACH ROW EXECUTE FUNCTION lienclock_set_updated_at();
CREATE TRIGGER lienclock_deadlines_touch BEFORE UPDATE ON lienclock_deadlines
  FOR EACH ROW EXECUTE FUNCTION lienclock_set_updated_at();
CREATE TRIGGER lienclock_reminders_touch BEFORE UPDATE ON lienclock_reminders
  FOR EACH ROW EXECUTE FUNCTION lienclock_set_updated_at();
CREATE TRIGGER lienclock_subscriptions_touch BEFORE UPDATE ON lienclock_subscriptions
  FOR EACH ROW EXECUTE FUNCTION lienclock_set_updated_at();
CREATE TRIGGER lienclock_payments_touch BEFORE UPDATE ON lienclock_payments
  FOR EACH ROW EXECUTE FUNCTION lienclock_set_updated_at();
CREATE TRIGGER lienclock_stripe_events_touch BEFORE UPDATE ON lienclock_stripe_events
  FOR EACH ROW EXECUTE FUNCTION lienclock_set_updated_at();

CREATE TRIGGER lienclock_jobs_recalc
  AFTER INSERT OR UPDATE OF state_code, start_date, completion_date, lien_filed_date
  ON lienclock_jobs
  FOR EACH ROW EXECUTE FUNCTION lienclock_jobs_after_change();

-- Resync reminders whenever a deadline is inserted, retargeted, resolved, or removed.
CREATE TRIGGER lienclock_deadlines_sync_reminders
  AFTER INSERT OR UPDATE OF due_date, status OR DELETE
  ON lienclock_deadlines
  FOR EACH ROW EXECUTE FUNCTION lienclock_deadlines_reminders_trigger();

DROP TRIGGER IF EXISTS lienclock_on_auth_user_created ON auth.users;
CREATE TRIGGER lienclock_on_auth_user_created
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION lienclock_handle_new_user();

-- P4 trigger: plan limit gate.
CREATE TRIGGER lienclock_jobs_limit
  BEFORE INSERT OR UPDATE OF status ON lienclock_jobs
  FOR EACH ROW EXECUTE FUNCTION lienclock_enforce_job_limit();

-- ============ ROW LEVEL SECURITY ============
ALTER TABLE lienclock_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lienclock_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE lienclock_state_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lienclock_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lienclock_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE lienclock_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lienclock_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lienclock_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lienclock_stripe_events ENABLE ROW LEVEL SECURITY;
-- lienclock_stripe_events: no policies on purpose, service role only.

-- ---- lienclock_profiles policies ----
-- QA-039: profile rows are created by the SECURITY DEFINER trigger on
-- auth.users (handle_new_user) and destroyed only via ON DELETE CASCADE from
-- auth.users; end users never INSERT/DELETE (privileges revoked in hardening).
-- No FOR ALL owner policy: that would allow role self-promotion to 'admin'.
CREATE POLICY lienclock_profiles_owner_select ON lienclock_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Owners may update their own profile, but role is immutable via this path:
-- the new role must equal the existing role.
CREATE POLICY lienclock_profiles_owner_update ON lienclock_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT p.role FROM lienclock_profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY lienclock_profiles_admin_read ON lienclock_profiles
  FOR SELECT TO authenticated
  USING (lienclock_is_admin());

-- ---- Public catalog tables: read only, no user columns ----
CREATE POLICY lienclock_plans_public_read ON lienclock_plans
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY lienclock_state_rules_public_read ON lienclock_state_rules
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- ---- Owner-scoped operational tables ----
CREATE POLICY lienclock_jobs_owner ON lienclock_jobs
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND product_id = 'lienclock')
  WITH CHECK (user_id = auth.uid() AND product_id = 'lienclock');

CREATE POLICY lienclock_deadlines_owner ON lienclock_deadlines
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND product_id = 'lienclock')
  WITH CHECK (user_id = auth.uid() AND product_id = 'lienclock');

-- QA-036: reminders are SELECT-only for clients. All writes flow through the
-- SECURITY DEFINER function lienclock_sync_deadline_reminders (runs as table
-- owner, not constrained by this policy), so a free-plan user cannot INSERT
-- channel='sms' rows directly via PostgREST to bypass SMS entitlement.
CREATE POLICY lienclock_reminders_owner ON lienclock_reminders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND product_id = 'lienclock');

-- Billing rows are written by the service role only; owners read.
CREATE POLICY lienclock_subscriptions_owner ON lienclock_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND product_id = 'lienclock');

CREATE POLICY lienclock_payments_owner ON lienclock_payments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND product_id = 'lienclock');

-- ============ SEED: PLANS ============
INSERT INTO lienclock_plans (code, name, description, price_cents, billing_interval, max_active_jobs, sms_reminders, sort_order) VALUES
  ('free', 'Free', 'One active job, every deadline calculated, email reminders included.', 0, 'month', 1, false, 0),
  ('pro_monthly', 'Pro', 'Unlimited jobs across every covered state, email and SMS reminders, priced for the solo operator.', 1900, 'month', NULL, true, 1),
  ('pro_yearly', 'Pro Annual', 'Everything in Pro, billed once a year at a two month discount.', 19000, 'year', NULL, true, 2);

-- ============ SEED: STATE RULES ============
-- Commonly published statutory windows. Notes flag conservative approximations and verification points.
INSERT INTO lienclock_state_rules (state_code, deadline_type, anchor_event, offset_days, statute_citation, notes) VALUES
  ('CA', 'preliminary_notice', 'job_start', 20, 'Cal. Civ. Code § 8204', 'Serve the 20 day preliminary notice on the owner, general contractor, and construction lender within 20 days of first furnishing labor or materials.'),
  ('CA', 'lien_filing', 'job_completion', 90, 'Cal. Civ. Code § 8414', 'Record the mechanics lien within 90 days of completion. A recorded notice of completion can shorten this window to 30 days, so confirm before relying on the full 90.'),
  ('CA', 'enforcement', 'lien_filing', 90, 'Cal. Civ. Code § 8460', 'File suit to foreclose the lien within 90 days of recording it.'),
  ('TX', 'preliminary_notice', 'job_start', 45, 'Tex. Prop. Code § 53.056', 'Texas notices run to the 15th day of the second month (residential) or third month (commercial) after each unpaid month of work. This uses a conservative early date; confirm your exact month based deadline.'),
  ('TX', 'lien_filing', 'job_completion', 75, 'Tex. Prop. Code § 53.052', 'File the lien affidavit by the 15th day of the third month (residential) or fourth month (commercial) after your last month of work. This uses the conservative residential date.'),
  ('TX', 'enforcement', 'lien_filing', 365, 'Tex. Prop. Code § 53.158', 'File suit to foreclose within 1 year of the last date the lien could be filed.'),
  ('FL', 'preliminary_notice', 'job_start', 45, 'Fla. Stat. § 713.06', 'Serve the notice to owner within 45 days of first furnishing labor or materials.'),
  ('FL', 'lien_filing', 'job_completion', 90, 'Fla. Stat. § 713.08', 'Record the claim of lien within 90 days of your final furnishing of labor or materials.'),
  ('FL', 'enforcement', 'lien_filing', 365, 'Fla. Stat. § 713.22', 'File suit to enforce the lien within 1 year of recording it.'),
  ('NY', 'lien_filing', 'job_completion', 240, 'N.Y. Lien Law § 10', 'File the mechanics lien within 8 months of completion. Single family residential projects allow only 4 months, so verify your project type.'),
  ('NY', 'enforcement', 'lien_filing', 365, 'N.Y. Lien Law § 17', 'The lien lapses 1 year after filing unless you extend it or begin foreclosure.'),
  ('AZ', 'preliminary_notice', 'job_start', 20, 'A.R.S. § 33-992.01', 'Serve the 20 day preliminary notice on the owner, general contractor, and lender within 20 days of first labor or materials.'),
  ('AZ', 'lien_filing', 'job_completion', 120, 'A.R.S. § 33-993', 'Record the lien within 120 days of completion. A recorded notice of completion can shorten this to 60 days.'),
  ('AZ', 'enforcement', 'lien_filing', 180, 'A.R.S. § 33-998', 'File a foreclosure action within 6 months of recording the lien.'),
  ('WA', 'preliminary_notice', 'job_start', 60, 'RCW 60.04.031', 'Give the notice of right to claim a lien within 60 days of first furnishing labor or materials.'),
  ('WA', 'lien_filing', 'job_completion', 90, 'RCW 60.04.091', 'Record the lien claim within 90 days of your last furnishing of labor or materials.'),
  ('WA', 'enforcement', 'lien_filing', 240, 'RCW 60.04.141', 'File suit to enforce within 8 months of recording the lien.'),
  ('GA', 'preliminary_notice', 'job_start', 30, 'O.C.G.A. § 44-14-361.3', 'If a notice of commencement was filed, send the notice to contractor within 30 days of first labor or materials.'),
  ('GA', 'lien_filing', 'job_completion', 90, 'O.C.G.A. § 44-14-361.1', 'File the claim of lien within 90 days of your last labor or materials.'),
  ('GA', 'enforcement', 'lien_filing', 365, 'O.C.G.A. § 44-14-361.1', 'Begin a lien action within 365 days of filing the lien.'),
  ('NV', 'preliminary_notice', 'job_start', 31, 'NRS 108.245', 'Serve the notice of right to lien within 31 days of first furnishing labor or materials.'),
  ('NV', 'lien_filing', 'job_completion', 90, 'NRS 108.226', 'Record the lien within 90 days of completion or your last furnishing.'),
  ('NV', 'enforcement', 'lien_filing', 180, 'NRS 108.233', 'File suit within 6 months of recording the lien.'),
  ('CO', 'notice_of_intent', 'lien_filing', -10, 'C.R.S. § 38-22-109(3)', 'Serve the notice of intent to file a lien at least 10 days before recording the lien statement.'),
  ('CO', 'lien_filing', 'job_completion', 120, 'C.R.S. § 38-22-109(5)', 'Record the lien statement within 4 months of your last work or materials.'),
  ('CO', 'enforcement', 'job_completion', 180, 'C.R.S. § 38-22-110', 'File suit within 6 months of project completion or your last work.'),
  ('OR', 'preliminary_notice', 'job_start', 8, 'ORS 87.021', 'Deliver the notice of right to a lien within 8 days of first delivering labor or materials.'),
  ('OR', 'lien_filing', 'job_completion', 75, 'ORS 87.035', 'Record the lien within 75 days of your last labor or substantial completion, whichever comes first.'),
  ('OR', 'enforcement', 'lien_filing', 120, 'ORS 87.055', 'File suit within 120 days of recording the lien.');

-- ============ HARDENING ============
-- P1 + QA-039: Lock privileged and non-user-managed profile columns and remove
-- INSERT/DELETE. The only user-updatable columns are the preference fields; role,
-- email, id and timestamps cannot be changed via PostgREST. Combined with the
-- role-immutable UPDATE policy above, there is no user-facing route to
-- role='admin'. Column-level grants reject the write outright.
REVOKE INSERT, UPDATE, DELETE ON lienclock_profiles FROM anon, authenticated;
GRANT UPDATE (full_name, company_name, phone, timezone, email_reminders, sms_reminders, reminder_days)
  ON lienclock_profiles TO authenticated;

-- P2: Bound reminder_days at the database (API validates 1..6 entries, 0..120; DB now agrees).
ALTER TABLE lienclock_profiles ADD CONSTRAINT lienclock_profiles_reminder_days_bounds
  CHECK (
    cardinality(reminder_days) BETWEEN 1 AND 10
    AND 0 <= ALL (reminder_days)
    AND 120 >= ALL (reminder_days)
  );
-- ============ RATE LIMITING (shared durable counters) ============
-- Backing store for lib/rate-limit.ts: one row per bucket:key:day, bumped
-- atomically; called only by the service-role client. Anon and authenticated
-- have no access: limits that users could edit are not limits.
CREATE TABLE IF NOT EXISTS lienclock_rate_limits (
  bucket text NOT NULL,
  key text NOT NULL,
  day date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket, key, day)
);
ALTER TABLE lienclock_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION lienclock_rate_limit_bump(p_bucket text, p_key text, p_day date)
RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $fn$
  INSERT INTO lienclock_rate_limits (bucket, key, day, count)
  VALUES (p_bucket, p_key, p_day, 1)
  ON CONFLICT (bucket, key, day)
  DO UPDATE SET count = lienclock_rate_limits.count + 1, updated_at = now()
  RETURNING count;
$fn$;

REVOKE ALL ON FUNCTION lienclock_rate_limit_bump(text, text, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION lienclock_rate_limit_bump(text, text, date) TO service_role;

-- QA-041: unarchive previously took 4 sequential round-trips from the API
-- (settled-types SELECT, revive UPDATE, recalc RPC, deadlines SELECT).
-- This function collapses all four into ONE round-trip. Owner-guarded like
-- lienclock_recalculate_job_deadlines (C-003): SECURITY DEFINER bypasses RLS,
-- so a signed-in caller must own the job; service role (auth.uid() IS NULL) passes.
CREATE OR REPLACE FUNCTION lienclock_unarchive_job(p_job_id uuid)
RETURNS SETOF lienclock_deadlines
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job lienclock_jobs%ROWTYPE;
BEGIN
  SELECT * INTO v_job FROM lienclock_jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'job not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF auth.uid() IS NOT NULL AND v_job.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Revive archive-dismissed deadlines (QA-038), but never a deadline_type the
  -- user already resolved (completed/missed stay put; QA-034).
  UPDATE lienclock_deadlines d
  SET status = 'upcoming'
  WHERE d.job_id = v_job.id
    AND d.status = 'not_applicable'
    AND NOT EXISTS (
      SELECT 1 FROM lienclock_deadlines s
      WHERE s.job_id = d.job_id
        AND s.deadline_type = d.deadline_type
        AND s.status IN ('completed', 'missed')
    );

  -- Re-apply current rules; removes any stragglers and syncs reminders.
  PERFORM lienclock_recalculate_job_deadlines(v_job.id);

  RETURN QUERY
    SELECT * FROM lienclock_deadlines
    WHERE job_id = v_job.id
    ORDER BY due_date ASC;
END;
$$;

REVOKE ALL ON FUNCTION lienclock_unarchive_job(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION lienclock_unarchive_job(uuid) TO authenticated, service_role;