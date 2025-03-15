import { Button } from '@/components/ui/button';
import { Menu, Ticket } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Ticket className="h-6 w-6 text-green-600" />
            <span className="text-xl font-bold">CouponHub</span>
          </Link>

          {/* Mobile menu button */}
          <button
            className="rounded-lg p-2 hover:bg-gray-100 md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Desktop navigation */}
          <div className="hidden md:block">
            <Button to="/admin" variant="secondary" size="sm">
              Admin Panel
            </Button>
          </div>

          {/* Mobile navigation */}
          {menuOpen && (
            <div className="absolute left-0 right-0 top-16 border-b bg-white p-4 shadow-lg md:hidden">
              <Button to="/admin" variant="secondary" size="sm" className="w-full">
                Admin Panel
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}