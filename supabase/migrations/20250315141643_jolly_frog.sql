/*
  # Initial Schema Setup for Coupon Management System

  1. New Tables
    - `coupons`
      - `id` (uuid, primary key)
      - `code` (text, unique)
      - `status` (text)
      - `claimed_by` (text)
      - `claimed_at` (timestamp)
      - `expires_at` (timestamp)
      - `created_at` (timestamp)
    
    - `claims`
      - `id` (uuid, primary key)
      - `coupon_id` (uuid, references coupons)
      - `ip_address` (text)
      - `session_id` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users (admins)
    - Add policies for anonymous users (coupon claims)

  3. Functions
    - `claim_coupon`: Handles the round-robin coupon claiming logic
*/

-- Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'available',
  claimed_by text,
  claimed_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES coupons(id),
  ip_address text NOT NULL,
  session_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Policies for coupons table
CREATE POLICY "Allow anonymous users to view available coupons"
  ON coupons
  FOR SELECT
  TO anon
  USING (status = 'available');

CREATE POLICY "Allow admins full access to coupons"
  ON coupons
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for claims table
CREATE POLICY "Allow anonymous users to create claims"
  ON claims
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow admins to view all claims"
  ON claims
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to claim a coupon
CREATE OR REPLACE FUNCTION claim_coupon(p_ip_address text, p_session_id text)
RETURNS TABLE (
  success boolean,
  message text,
  coupon_code text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_coupon_id uuid;
  v_coupon_code text;
  v_last_claim timestamptz;
BEGIN
  -- Check if user has claimed recently (1 hour cooldown)
  SELECT created_at 
  INTO v_last_claim
  FROM claims
  WHERE ip_address = p_ip_address OR session_id = p_session_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_claim IS NOT NULL AND v_last_claim > now() - interval '1 hour' THEN
    RETURN QUERY SELECT false, 'Please wait before claiming another coupon', NULL::text;
    RETURN;
  END IF;

  -- Get next available coupon
  SELECT id, code
  INTO v_coupon_id, v_coupon_code
  FROM coupons
  WHERE status = 'available'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_coupon_id IS NULL THEN
    RETURN QUERY SELECT false, 'No coupons available', NULL::text;
    RETURN;
  END IF;

  -- Update coupon status
  UPDATE coupons
  SET status = 'claimed',
      claimed_by = p_session_id,
      claimed_at = now()
  WHERE id = v_coupon_id;

  -- Record the claim
  INSERT INTO claims (coupon_id, ip_address, session_id)
  VALUES (v_coupon_id, p_ip_address, p_session_id);

  RETURN QUERY SELECT true, 'Coupon claimed successfully', v_coupon_code;
END;
$$;