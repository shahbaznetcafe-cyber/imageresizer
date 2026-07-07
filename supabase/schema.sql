CREATE TABLE IF NOT EXISTS public.school_sessions (
  id BIGSERIAL PRIMARY KEY,
  emis_code TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  school_name TEXT,
  machine_id TEXT,
  machine_type TEXT,
  ip_address TEXT,
  device_limit_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.processed_images (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES public.school_sessions(id) ON DELETE CASCADE,
  emis_code TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  school_name TEXT,
  machine_id TEXT,
  machine_type TEXT,
  ip_address TEXT,
  device_limit_id BIGINT,
  original_name TEXT NOT NULL,
  processed_name TEXT NOT NULL,
  url TEXT NOT NULL,
  size_kb NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feedback_entries (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES public.school_sessions(id) ON DELETE SET NULL,
  emis_code TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  school_name TEXT,
  machine_id TEXT,
  machine_type TEXT,
  rating INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.device_limits (
  id BIGSERIAL PRIMARY KEY,
  machine_id TEXT,
  ip_address TEXT,
  emis_code TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  school_name TEXT,
  machine_type TEXT,
  photo_limit INTEGER NOT NULL DEFAULT 35,
  photos_used INTEGER NOT NULL DEFAULT 0,
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  block_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.limit_requests (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES public.school_sessions(id) ON DELETE SET NULL,
  device_limit_id BIGINT REFERENCES public.device_limits(id) ON DELETE SET NULL,
  machine_id TEXT,
  ip_address TEXT,
  emis_code TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  school_name TEXT,
  requested_extra INTEGER NOT NULL DEFAULT 150,
  payment_sender_name TEXT,
  payment_sender_phone TEXT,
  payment_transaction_id TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.problem_reports (
  id BIGSERIAL PRIMARY KEY,
  emis_code TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  school_name TEXT NOT NULL,
  reporter_name TEXT,
  machine_id TEXT,
  machine_type TEXT,
  ip_address TEXT,
  problem_message TEXT,
  screenshot_name TEXT,
  screenshot_type TEXT,
  screenshot_data_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_migrations (
  migration_key TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.school_sessions
  ADD COLUMN IF NOT EXISTS school_name TEXT,
  ADD COLUMN IF NOT EXISTS machine_id TEXT,
  ADD COLUMN IF NOT EXISTS machine_type TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS device_limit_id BIGINT;

ALTER TABLE public.processed_images
  ADD COLUMN IF NOT EXISTS school_name TEXT,
  ADD COLUMN IF NOT EXISTS machine_id TEXT,
  ADD COLUMN IF NOT EXISTS machine_type TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS device_limit_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_school_sessions_emis_code
  ON public.school_sessions(emis_code);

CREATE INDEX IF NOT EXISTS idx_school_sessions_created_at
  ON public.school_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_school_sessions_machine_id
  ON public.school_sessions(machine_id);

CREATE INDEX IF NOT EXISTS idx_processed_images_created_at
  ON public.processed_images(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_processed_images_emis_code
  ON public.processed_images(emis_code);

CREATE INDEX IF NOT EXISTS idx_processed_images_session_id
  ON public.processed_images(session_id);

CREATE INDEX IF NOT EXISTS idx_feedback_entries_created_at
  ON public.feedback_entries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_entries_emis_code
  ON public.feedback_entries(emis_code);

CREATE INDEX IF NOT EXISTS idx_feedback_entries_session_id
  ON public.feedback_entries(session_id);

CREATE INDEX IF NOT EXISTS idx_device_limits_machine_id
  ON public.device_limits(machine_id);

CREATE INDEX IF NOT EXISTS idx_device_limits_ip_address
  ON public.device_limits(ip_address);

CREATE INDEX IF NOT EXISTS idx_limit_requests_status
  ON public.limit_requests(status);

CREATE INDEX IF NOT EXISTS idx_problem_reports_created_at
  ON public.problem_reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_problem_reports_emis_code
  ON public.problem_reports(emis_code);

ALTER TABLE public.school_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.limit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_reports ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.school_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.processed_images FROM anon, authenticated;
REVOKE ALL ON TABLE public.feedback_entries FROM anon, authenticated;
REVOKE ALL ON TABLE public.device_limits FROM anon, authenticated;
REVOKE ALL ON TABLE public.limit_requests FROM anon, authenticated;
REVOKE ALL ON TABLE public.problem_reports FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.school_sessions_id_seq FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.processed_images_id_seq FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.feedback_entries_id_seq FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.device_limits_id_seq FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.limit_requests_id_seq FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.problem_reports_id_seq FROM anon, authenticated;
