/*
  # Fix RLS policies for claims table

  1. Security Changes
    - Enable RLS on claims table (if not already enabled)
    - Safely add policy for anonymous users to insert claims
    - Safely add policy for authenticated users to view claims
*/

-- Enable RLS (idempotent operation)
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Safely create policy for anonymous users
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'claims' 
        AND policyname = 'Allow anonymous users to create claims'
    ) THEN
        CREATE POLICY "Allow anonymous users to create claims"
        ON claims
        FOR INSERT
        TO anon
        WITH CHECK (true);
    END IF;
END $$;

-- Safely create policy for authenticated users
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'claims' 
        AND policyname = 'Allow authenticated users to view all claims'
    ) THEN
        CREATE POLICY "Allow authenticated users to view all claims"
        ON claims
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;