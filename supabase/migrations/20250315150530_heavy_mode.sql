/*
  # Add disabled status and cascade delete for coupons

  1. Changes
    - Add check constraint for coupon status
    - Add cascade delete for claims when coupon is deleted

  2. Security
    - No changes to RLS policies
*/

-- Add check constraint for coupon status
ALTER TABLE coupons
ADD CONSTRAINT coupon_status_check
CHECK (status IN ('available', 'claimed', 'disabled'));

-- Add cascade delete for claims
ALTER TABLE claims
DROP CONSTRAINT claims_coupon_id_fkey,
ADD CONSTRAINT claims_coupon_id_fkey
  FOREIGN KEY (coupon_id)
  REFERENCES coupons(id)
  ON DELETE CASCADE;