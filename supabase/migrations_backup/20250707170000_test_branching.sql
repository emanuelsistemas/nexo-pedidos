-- Test migration for Supabase branching
-- This is a simple test to verify branching is working

-- Create a simple test table
CREATE TABLE IF NOT EXISTS public.test_branching (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL DEFAULT 'Branching is working!',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert a test record
INSERT INTO public.test_branching (message) 
VALUES ('Test from branch: feature/test-branching-simple')
ON CONFLICT DO NOTHING;

-- Add a comment
COMMENT ON TABLE public.test_branching IS 'Test table to verify Supabase branching functionality';
