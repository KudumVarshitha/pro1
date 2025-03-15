import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { ArrowRight, CheckCircle, HelpCircle, Timer } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

// Session ID cookie name
const SESSION_ID_COOKIE = 'coupon_session_id';
const LAST_CLAIM_TIME_COOKIE = 'last_claim_time';

// Helper to get or create session ID with SameSite and secure attributes
const getOrCreateSessionId = () => {
  const existingSessionId = document.cookie
    .split('; ')
    .find(row => row.startsWith(SESSION_ID_COOKIE))
    ?.split('=')[1];

  if (existingSessionId) {
    return existingSessionId;
  }

  const newSessionId = crypto.randomUUID();
  // Set cookie with SameSite=Lax and secure attributes
  const cookieOptions = [
    `${SESSION_ID_COOKIE}=${newSessionId}`,
    'path=/',
    'max-age=86400',
    'SameSite=Lax'
  ];
  
  if (window.location.protocol === 'https:') {
    cookieOptions.push('Secure');
  }
  
  document.cookie = cookieOptions.join(';');
  return newSessionId;
};

// Helper to check if user can claim
const canUserClaim = () => {
  const lastClaimTime = document.cookie
    .split('; ')
    .find(row => row.startsWith(LAST_CLAIM_TIME_COOKIE))
    ?.split('=')[1];

  if (!lastClaimTime) return true;

  const lastClaim = new Date(parseInt(lastClaimTime));
  const now = new Date();
  const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);

  return hoursSinceLastClaim >= 1;
};

// Helper to set last claim time
const setLastClaimTime = () => {
  const now = new Date();
  const cookieOptions = [
    `${LAST_CLAIM_TIME_COOKIE}=${now.getTime()}`,
    'path=/',
    'max-age=86400',
    'SameSite=Lax'
  ];
  
  if (window.location.protocol === 'https:') {
    cookieOptions.push('Secure');
  }
  
  document.cookie = cookieOptions.join(';');
};

export function HomePage() {
  const [loading, setLoading] = useState(false);
  const [claimedCoupon, setClaimedCoupon] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [canClaim, setCanClaim] = useState(true);
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState<string>('');

  useEffect(() => {
    // Ensure session ID is set on both initial load and after any potential cookie changes
    const sid = getOrCreateSessionId();
    setSessionId(sid);
    updateClaimStatus();

    // Check session ID and claim status periodically
    const interval = setInterval(() => {
      const currentSid = getOrCreateSessionId();
      if (currentSid !== sessionId) {
        setSessionId(currentSid);
      }
      updateClaimStatus();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const updateClaimStatus = () => {
    const can = canUserClaim();
    setCanClaim(can);

    if (!can) {
      const lastClaimTime = parseInt(
        document.cookie
          .split('; ')
          .find(row => row.startsWith(LAST_CLAIM_TIME_COOKIE))
          ?.split('=')[1] || '0'
      );
      
      const nextClaimTime = new Date(lastClaimTime + (60 * 60 * 1000)); // 1 hour
      const now = new Date();
      const minutesLeft = Math.ceil((nextClaimTime.getTime() - now.getTime()) / (1000 * 60));
      
      setTimeUntilNextClaim(
        minutesLeft > 60
          ? '1 hour'
          : `${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}`
      );
    }
  };

  const claimCoupon = async () => {
    if (!sessionId) {
      // Try to get session ID one more time before failing
      const sid = getOrCreateSessionId();
      if (!sid) {
        toast.error('Session not initialized');
        return;
      }
      setSessionId(sid);
    }

    if (!canUserClaim()) {
      toast.error(`Please wait ${timeUntilNextClaim} before claiming another coupon`);
      return;
    }

    setLoading(true);
    try {
      // Start a Supabase transaction
      const { data: { client_ip } } = await supabase.auth.getSession();

      // First, get an available coupon and lock it
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('status', 'available')
        .limit(1)
        .single();

      if (couponError || !coupon) {
        toast.error('No coupons available at the moment. Please try again later.');
        return;
      }

      // Immediately update the coupon status to prevent race conditions
      const { error: updateError } = await supabase
        .from('coupons')
        .update({
          status: 'claimed',
          claimed_by: sessionId,
          claimed_at: new Date().toISOString()
        })
        .eq('id', coupon.id)
        .eq('status', 'available'); // Ensure it's still available

      if (updateError) {
        console.error('Update error:', updateError);
        toast.error('Failed to claim coupon. Please try again later.');
        return;
      }

      // Create the claim record
      const { error: claimError } = await supabase
        .from('claims')
        .insert({
          coupon_id: coupon.id,
          ip_address: client_ip || '0.0.0.0',
          session_id: sessionId
        });

      if (claimError) {
        console.error('Claim error:', claimError);
        // If claim record fails, try to revert coupon status
        await supabase
          .from('coupons')
          .update({
            status: 'available',
            claimed_by: null,
            claimed_at: null
          })
          .eq('id', coupon.id);
        
        toast.error('Failed to claim coupon. Please try again later.');
        return;
      }

      setLastClaimTime();
      setClaimedCoupon(coupon.code);
      updateClaimStatus();
      toast.success('Coupon claimed successfully!');
    } catch (error) {
      console.error('Error claiming coupon:', error);
      toast.error('Failed to claim coupon. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gray-900 px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
            alt="Background"
            className="h-full w-full object-cover opacity-20"
          />
        </div>
        <div className="relative">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
                Claim Your Exclusive Coupon Instantly!
              </h1>
              <p className="mt-4 text-base leading-7 text-gray-300 sm:mt-6 sm:text-lg">
                Get access to amazing deals with our round-robin coupon system. One click is all it
                takes to start saving!
              </p>
              <div className="mt-8 space-y-4 sm:mt-10">
                <Button
                  size="lg"
                  onClick={claimCoupon}
                  disabled={loading || !sessionId || !canClaim}
                  className={`w-full sm:w-auto ${(!loading && canClaim) ? 'animate-bounce' : ''}`}
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : !canClaim ? (
                    <>
                      Try Again in {timeUntilNextClaim}
                      <Timer className="ml-2 h-5 w-5" />
                    </>
                  ) : (
                    <>
                      Claim Your Coupon
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
                {claimedCoupon && (
                  <div className="rounded-lg bg-white/10 p-4 text-white backdrop-blur-sm">
                    <p className="text-lg font-semibold">Your Coupon Code:</p>
                    <p className="break-all text-2xl font-bold">{claimedCoupon}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-base leading-7 text-gray-600 sm:mt-6 sm:text-lg">
              Our round-robin system ensures fair distribution of coupons to all users.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-xl gap-8 sm:mt-16 lg:mt-20 lg:max-w-none lg:grid-cols-3">
            {[
              {
                name: 'Click to Claim',
                description:
                  'Simply click the claim button above to get your unique coupon code instantly.',
                icon: CheckCircle,
              },
              {
                name: 'Get Your Code',
                description:
                  'Your coupon code will be displayed immediately after claiming.',
                icon: Timer,
              },
              {
                name: 'Use Before Expiry',
                description:
                  'Make sure to use your coupon before it expires to enjoy the savings.',
                icon: HelpCircle,
              },
            ].map((feature) => (
              <div
                key={feature.name}
                className="flex flex-col items-center text-center"
              >
                <div className="mb-6 rounded-lg bg-green-600 p-3 text-white">
                  <feature.icon className="h-6 w-6" />
                </div>
                <dt className="text-xl font-semibold leading-7 text-gray-900">
                  {feature.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col leading-7 text-gray-600">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-gray-50 px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-base leading-7 text-gray-600 sm:mt-6 sm:text-lg">
              Find answers to common questions about our coupon system.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-2xl divide-y divide-gray-900/10 sm:mt-16">
            {[
              {
                question: 'How do I use my coupon?',
                answer:
                  'Once you claim a coupon, you\'ll receive a unique code. Enter this code during checkout at participating stores to receive your discount.',
              },
              {
                question: 'Why am I restricted from claiming?',
                answer:
                  'To ensure fair distribution, we limit one coupon per user within a certain timeframe. If you\'re restricted, please try again later.',
              },
              {
                question: 'How long are coupons valid?',
                answer:
                  'Coupon validity varies by promotion. The expiration date will be clearly displayed with your coupon code when claimed.',
              },
            ].map((faq, index) => (
              <details key={index} className="group py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between text-base font-medium leading-7 text-gray-900 sm:text-lg">
                  <span>{faq.question}</span>
                  <span className="ml-6 flex h-7 w-7 items-center justify-center rounded-full border border-gray-900/10 bg-white group-open:rotate-180">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}