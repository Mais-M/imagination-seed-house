ALTER TABLE public.nodes ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS nodes_board_deleted_idx ON public.nodes(board_id, deleted_at);