CREATE TABLE IF NOT EXISTS public.school_sessions (
  id BIGSERIAL PRIMARY KEY,
  emis_code TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  school_name TEXT,
  machine_id TEXT,
  machine_type TEXT,
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
  original_name TEXT NOT NULL,
  processed_name TEXT NOT NULL,
  url TEXT NOT NULL,
  size_kb NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.school_sessions
  ADD COLUMN IF NOT EXISTS school_name TEXT,
  ADD COLUMN IF NOT EXISTS machine_id TEXT,
  ADD COLUMN IF NOT EXISTS machine_type TEXT;

ALTER TABLE public.processed_images
  ADD COLUMN IF NOT EXISTS school_name TEXT,
  ADD COLUMN IF NOT EXISTS machine_id TEXT,
  ADD COLUMN IF NOT EXISTS machine_type TEXT;

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

ALTER TABLE public.school_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_images ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.school_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.processed_images FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.school_sessions_id_seq FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.processed_images_id_seq FROM anon, authenticated;
