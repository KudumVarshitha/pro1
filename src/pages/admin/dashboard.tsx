import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Eye, EyeOff, Plus, Trash2, History, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Coupon {
  id: string;
  code: string;
  status: string;
  claimed_by: string | null;
  claimed_at: string | null;
  expires_at: string;
  created_at: string;
}

interface Claim {
  id: string;
  ip_address: string;
  session_id: string;
  created_at: string;
  coupon: Coupon;
}

export function AdminDashboardPage() {
  const { signOut } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClaims, setShowClaims] = useState(false);
  const [expiryDays, setExpiryDays] = useState(7);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadCoupons(), loadClaims()]);
    } finally {
      setLoading(false);
    }
  };

  const loadCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data);
    } catch (error) {
      toast.error('Failed to load coupons');
      console.error('Error loading coupons:', error);
    }
  };

  const loadClaims = async () => {
    try {
      const { data, error } = await supabase
        .from('claims')
        .select(`
          *,
          coupon:coupons (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClaims(data);
    } catch (error) {
      toast.error('Failed to load claims');
      console.error('Error loading claims:', error);
    }
  };

  const addCoupon = async () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + expiryDays);

    try {
      const { error } = await supabase.from('coupons').insert({
        code,
        expires_at: expires_at.toISOString(),
      });

      if (error) throw error;

      toast.success('Coupon added successfully');
      loadCoupons();
    } catch (error) {
      toast.error('Failed to add coupon');
      console.error('Error adding coupon:', error);
    }
  };

  const toggleCouponStatus = async (coupon: Coupon) => {
    const newStatus = coupon.status === 'available' ? 'disabled' : 'available';
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ status: newStatus })
        .eq('id', coupon.id);

      if (error) throw error;

      toast.success(`Coupon ${newStatus === 'available' ? 'enabled' : 'disabled'}`);
      loadCoupons();
    } catch (error) {
      toast.error('Failed to update coupon status');
      console.error('Error updating coupon status:', error);
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);

      if (error) throw error;

      toast.success('Coupon deleted successfully');
      loadCoupons();
    } catch (error) {
      toast.error('Failed to delete coupon');
      console.error('Error deleting coupon:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <h1 className="text-2xl font-bold md:text-3xl">Admin Dashboard</h1>
          
          {/* Mobile Menu Button */}
          <button
            className="rounded-lg border p-2 md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Actions Menu */}
          <div className={`w-full flex-col gap-4 md:w-auto md:flex-row ${menuOpen ? 'flex' : 'hidden md:flex'}`}>
            <button
              onClick={() => setShowClaims(!showClaims)}
              className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 md:w-auto"
            >
              {showClaims ? 'Show Coupons' : 'Show Claims'}
              {showClaims ? <Eye className="ml-2 h-5 w-5" /> : <History className="ml-2 h-5 w-5" />}
            </button>
            
            {!showClaims && (
              <div className="flex w-full flex-col gap-2 md:flex-row md:items-center">
                <div className="flex items-center gap-2">
                  <label htmlFor="expiryDays" className="whitespace-nowrap text-sm">
                    Expiry Days:
                  </label>
                  <input
                    id="expiryDays"
                    type="number"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(parseInt(e.target.value))}
                    className="w-20 rounded-lg border border-gray-300 px-2 py-2"
                    min="1"
                  />
                </div>
                <button
                  onClick={addCoupon}
                  className="flex w-full items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 md:w-auto"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add Coupon
                </button>
              </div>
            )}
            
            <button
              onClick={() => signOut()}
              className="flex w-full items-center justify-center rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 md:w-auto"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      ) : showClaims ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:px-6">
                  Session ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:px-6">
                  IP Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:px-6">
                  Coupon Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:px-6">
                  Claimed At
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {claims.map((claim) => (
                <tr key={claim.id}>
                  <td className="whitespace-nowrap px-4 py-4 text-sm md:px-6">
                    {claim.session_id}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm md:px-6">
                    {claim.ip_address}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm md:px-6">
                    {claim.coupon.code}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm md:px-6">
                    {format(new Date(claim.created_at), 'PPpp')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:px-6">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:px-6">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell md:px-6">
                  Claimed By
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell md:px-6">
                  Claimed At
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell md:px-6">
                  Expires At
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:px-6">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td className="whitespace-nowrap px-4 py-4 text-sm md:px-6">
                    {coupon.code}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm md:px-6">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        coupon.status === 'available'
                          ? 'bg-green-100 text-green-800'
                          : coupon.status === 'claimed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {coupon.status}
                    </span>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-4 text-sm md:table-cell md:px-6">
                    {coupon.claimed_by || '-'}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-4 text-sm md:table-cell md:px-6">
                    {coupon.claimed_at
                      ? format(new Date(coupon.claimed_at), 'PPpp')
                      : '-'}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-4 text-sm md:table-cell md:px-6">
                    {format(new Date(coupon.expires_at), 'PPpp')}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm md:px-6">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleCouponStatus(coupon)}
                        className={`rounded p-1 ${
                          coupon.status === 'available'
                            ? 'text-gray-600 hover:bg-gray-100'
                            : 'text-green-600 hover:bg-green-100'
                        }`}
                        title={
                          coupon.status === 'available' ? 'Disable coupon' : 'Enable coupon'
                        }
                      >
                        {coupon.status === 'available' ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteCoupon(coupon.id)}
                        className="rounded p-1 text-red-600 hover:bg-red-100"
                        title="Delete coupon"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}