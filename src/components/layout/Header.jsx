import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Menu, Bell, Globe, Calendar, Trophy, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { trainingsAPI, matchesAPI } from '../../utils/api';
import { formatDate } from '../../utils/helpers';
import { Modal, Badge } from '../common';

const Header = ({ onMenuClick }) => {
  const { t, i18n } = useTranslation();
  const { user, isCoach } = useAuth();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const languages = [
    { code: 'uz', name: "O'zbek", flag: '🇺🇿' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
  ];

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    setLangMenuOpen(false);
  };

  // Memoize date calculations
  const { todayStr, twoDaysLaterStr, today } = useMemo(() => {
    const now = new Date();
    const later = new Date(now);
    later.setDate(later.getDate() + 2);
    return {
      today: now,
      todayStr: now.toISOString().split('T')[0],
      twoDaysLaterStr: later.toISOString().split('T')[0]
    };
  }, []);

  // Team ID for queries - use user's team for coach, undefined for admin
  const teamId = isCoach ? user?.team?._id : undefined;

  // Fetch upcoming trainings (within 2 days)
  const { data: upcomingTrainings } = useQuery({
    queryKey: ['upcoming-trainings', teamId, todayStr],
    queryFn: () => trainingsAPI.getAll({
      team: teamId,
      startDate: todayStr,
      endDate: twoDaysLaterStr,
      status: 'scheduled',
      limit: 10
    }),
    select: (res) => res.data?.trainings || [],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Fetch upcoming matches (within 2 days)
  const { data: upcomingMatches } = useQuery({
    queryKey: ['upcoming-matches', teamId, todayStr],
    queryFn: () => matchesAPI.getAll({
      team: teamId,
      startDate: todayStr,
      endDate: twoDaysLaterStr,
      status: 'scheduled',
      limit: 10
    }),
    select: (res) => res.data?.matches || [],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  // Memoize notifications to prevent recalculation on every render
  const notifications = useMemo(() => {
    const trainings = (upcomingTrainings || []).map(tr => ({
      id: tr._id,
      type: 'training',
      title: tr.team?.name,
      date: tr.date,
      time: tr.startTime,
      location: tr.location,
      data: tr
    }));

    const matches = (upcomingMatches || []).map(m => ({
      id: m._id,
      type: 'match',
      title: `${m.team?.name} vs ${m.opponent?.name}`,
      date: m.matchDate,
      time: m.kickoffTime,
      venue: m.venue,
      isHome: m.isHome,
      data: m
    }));

    return [...trainings, ...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [upcomingTrainings, upcomingMatches]);

  // Check if event is today
  const isToday = (dateStr) => {
    const eventDate = new Date(dateStr).toDateString();
    return eventDate === today.toDateString();
  };

  // Check if event is tomorrow
  const isTomorrow = (dateStr) => {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const eventDate = new Date(dateStr).toDateString();
    return eventDate === tomorrow.toDateString();
  };

  // Get days until event
  const getDaysLabel = (dateStr) => {
    if (isToday(dateStr)) return t('notifications.today');
    if (isTomorrow(dateStr)) return t('notifications.tomorrow');
    return t('notifications.inDays', { days: 2 });
  };

  const notificationCount = notifications.length;

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-full px-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">{currentLang.flag} {currentLang.name}</span>
              <span className="sm:hidden">{currentLang.flag}</span>
            </button>

            {langMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setLangMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-100 z-20 py-1">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 ${
                        i18n.language === lang.code ? 'text-primary-600 bg-primary-50' : 'text-gray-700'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Notifications */}
          <button
            onClick={() => setNotifOpen(true)}
            className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                {notificationCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Notifications Modal */}
      <Modal
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        title={t('notifications.title')}
        size="large"
      >
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('notifications.noUpcoming')}
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-lg border-l-4 ${
                  notif.type === 'match'
                    ? 'bg-orange-50 border-orange-500'
                    : 'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      notif.type === 'match' ? 'bg-orange-100' : 'bg-blue-100'
                    }`}>
                      {notif.type === 'match' ? (
                        <Trophy className="w-5 h-5 text-orange-600" />
                      ) : (
                        <Calendar className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{notif.title}</h4>
                        <Badge className={isToday(notif.date) ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                          {getDaysLabel(notif.date)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {notif.type === 'match' ? t('matches.title') : t('trainings.title')}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(notif.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {notif.time}
                        </span>
                      </div>
                      {(notif.location || notif.venue) && (
                        <p className="text-sm text-gray-500 mt-1">
                          📍 {notif.location || notif.venue}
                          {notif.type === 'match' && (
                            <span className="ml-2">
                              ({notif.isHome ? t('matches.home') : t('matches.away')})
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </header>
  );
};

export default Header;
