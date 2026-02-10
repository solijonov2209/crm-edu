import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Calendar,
  CalendarDays,
  Trophy,
  Compass,
  BarChart3,
  Settings,
  LogOut,
  X,
  Shield
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { user, isAdmin, logout } = useAuth();

  const adminLinks = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/admin/teams', icon: Shield, label: t('nav.teams') },
    { to: '/admin/players', icon: Users, label: t('nav.players') },
    { to: '/admin/coaches', icon: UserCircle, label: t('nav.coaches') },
    { to: '/admin/trainings', icon: Calendar, label: t('nav.trainings') },
    { to: '/admin/matches', icon: Trophy, label: t('nav.matches') },
    { to: '/admin/tactics', icon: Compass, label: t('nav.tactics') },
    { to: '/admin/statistics', icon: BarChart3, label: t('nav.statistics') },
    { to: '/admin/calendar', icon: CalendarDays, label: t('nav.calendar') },
  ];

  const coachLinks = [
    { to: '/coach/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/coach/players', icon: Users, label: t('nav.players') },
    { to: '/coach/trainings', icon: Calendar, label: t('nav.trainings') },
    { to: '/coach/matches', icon: Trophy, label: t('nav.matches') },
    { to: '/coach/tactics', icon: Compass, label: t('nav.tactics') },
    { to: '/coach/statistics', icon: BarChart3, label: t('nav.statistics') },
    { to: '/coach/calendar', icon: CalendarDays, label: t('nav.calendar') },
  ];

  const links = isAdmin ? adminLinks : coachLinks;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:z-auto lg:flex-shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900">Youth Academy</h1>
                <p className="text-xs text-gray-500">CRM</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {links.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `sidebar-link ${isActive ? 'active' : ''}`
                    }
                  >
                    <link.icon className="w-5 h-5" />
                    <span>{link.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <NavLink
              to={isAdmin ? '/admin/settings' : '/coach/settings'}
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-link mb-2 ${isActive ? 'active' : ''}`
              }
            >
              <Settings className="w-5 h-5" />
              <span>{t('nav.settings')}</span>
            </NavLink>

            <button
              onClick={logout}
              className="sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="w-5 h-5" />
              <span>{t('auth.logout')}</span>
            </button>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-sm">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {isAdmin ? 'Super Admin' : 'Coach'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
