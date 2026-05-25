import { HiOutlineMenuAlt2, HiOutlineLogout, HiOutlineUser, HiOutlineChevronDown, HiOutlineCog } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 print:hidden">
      {/* Left: menu toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-md hover:bg-gray-100"
      >
        <HiOutlineMenuAlt2 className="w-5 h-5" />
      </button>

      <div className="hidden lg:block" />

      {/* Right: user info + dropdown */}
      <div className="flex items-center gap-4 relative" ref={dropdownRef}>
        {user && (
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <div className="w-9 h-9 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 font-semibold shadow-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-800 leading-tight">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize leading-tight">{user.role?.replace('_', ' ')}</p>
            </div>
            <HiOutlineChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
          </button>
        )}

        {dropdownOpen && user && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 transform origin-top-right transition-all">
            <div className="px-4 py-2.5 border-b border-gray-100 mb-1 sm:hidden">
              <p className="text-sm font-semibold text-gray-800">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role?.replace('_', ' ')}</p>
            </div>
            
            <Link
              to="/profile"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-brand-600 transition-colors"
            >
              <HiOutlineCog className="w-4 h-4" />
              Profile Settings
            </Link>
            
            <div className="h-px bg-gray-100 my-1.5" />
            
            <button
              onClick={() => {
                setDropdownOpen(false);
                handleLogout();
              }}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors"
            >
              <HiOutlineLogout className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
