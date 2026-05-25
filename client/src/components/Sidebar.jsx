import { NavLink } from 'react-router-dom';
import {
  HiOutlineHome,
  HiOutlineTag,
  HiOutlineCube,
  HiOutlineClipboardList,
  HiOutlineUsers,
  HiOutlineX,
} from 'react-icons/hi';

const navItems = [
  { name: 'Dashboard', path: '/', icon: HiOutlineHome },
  { name: 'Categories', path: '/categories', icon: HiOutlineTag },
  { name: 'Products', path: '/products', icon: HiOutlineCube },
  { name: 'Quotations', path: '/quotations', icon: HiOutlineClipboardList },
  { name: 'Orders', path: '/orders', icon: HiOutlineClipboardList },
  { name: 'Users', path: '/users', icon: HiOutlineUsers },
];

const Sidebar = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 
          transform transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0 print:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <img src="/logo-new.png" alt="Elegant Doors Logo" className="h-8 w-auto object-contain" />
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100"
          >
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-brand-600'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
