-- Test migration for new clean branch
-- This should work without issues

-- Create a simple test table
CREATE TABLE IF NOT EXISTS public.branch_test (
    id SERIAL PRIMARY KEY,
    message TEXT DEFAULT 'New branch working!',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert test data
INSERT INTO public.branch_test (message) VALUES ('Branch created successfully!');
