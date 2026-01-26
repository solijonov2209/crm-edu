import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { playersAPI, teamsAPI, matchesAPI } from '../../utils/api';
import { Card, Loading, Button, Select, Avatar, Modal } from '../../components/common';
import { Save, RotateCcw, Users, Info } from 'lucide-react';
import { formations, formationPositions, getPositionColor } from '../../utils/helpers';
import toast from 'react-hot-toast';

const DraggablePlayer = ({ player, isOnField }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'player',
    item: { player },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`flex items-center gap-2 p-2 rounded-lg cursor-move transition-all ${
        isDragging ? 'opacity-50' : ''
      } ${isOnField ? 'bg-green-100' : 'bg-white hover:bg-gray-50'} border border-gray-200`}
    >
      <Avatar
        src={player.photo}
        firstName={player.firstName}
        lastName={player.lastName}
        size="small"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {player.firstName} {player.lastName}
        </p>
        <p className="text-xs text-gray-500">{player.position}</p>
      </div>
      {player.jerseyNumber && (
        <span className="text-sm font-bold text-gray-400">#{player.jerseyNumber}</span>
      )}
    </div>
  );
};

const FieldPosition = ({ position, index, player, onDrop, onRemove, onPlayerClick }) => {
  const { t } = useTranslation();

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'player',
    drop: (item) => onDrop(item.player, index),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`absolute w-14 h-14 -ml-7 -mt-7 transition-transform ${
        isOver ? 'scale-110' : ''
      }`}
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      {player ? (
        <div
          className="w-full h-full cursor-pointer group"
          onClick={() => onPlayerClick(player)}
        >
          <div className={`w-full h-full rounded-full bg-white shadow-lg flex items-center justify-center text-sm font-bold border-4 ${getPositionColor(position.position)} border-opacity-80`}>
            {player.jerseyNumber || player.firstName.charAt(0)}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(index);
            }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ×
          </button>
          <p className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-white font-medium whitespace-nowrap bg-black/50 px-1 rounded">
            {player.lastName}
          </p>
        </div>
      ) : (
        <div className={`w-full h-full rounded-full border-2 border-dashed border-white/50 flex items-center justify-center ${
          isOver ? 'bg-white/30' : 'bg-white/10'
        }`}>
          <span className="text-[10px] text-white/70">{position.position}</span>
        </div>
      )}
    </div>
  );
};

const Tactics = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedMatch, setSelectedMatch] = useState('');
  const [formation, setFormation] = useState('4-3-3');
  const [lineup, setLineup] = useState(Array(11).fill(null));
  const [substitutes, setSubstitutes] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsAPI.getAll({ limit: 100 }),
    select: (res) => res.data.teams,
  });

  const { data: playersData, isLoading: playersLoading } = useQuery({
    queryKey: ['players', selectedTeam],
    queryFn: () => playersAPI.getByTeam(selectedTeam),
    enabled: !!selectedTeam,
    select: (res) => res.data.players,
  });

  const { data: matchesData } = useQuery({
    queryKey: ['upcomingMatches', selectedTeam],
    queryFn: () => matchesAPI.getAll({
      team: selectedTeam,
      status: 'scheduled',
      limit: 10
    }),
    enabled: !!selectedTeam,
    select: (res) => res.data.matches,
  });

  const saveLineupMutation = useMutation({
    mutationFn: ({ matchId, data }) => matchesAPI.updateLineup(matchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['matches']);
      toast.success(t('common.success'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error'));
    }
  });

  const positions = formationPositions[formation] || formationPositions['4-3-3'];

  const handleDrop = useCallback((player, positionIndex) => {
    // Remove player from current position if exists
    const newLineup = lineup.map(p => p?._id === player._id ? null : p);
    newLineup[positionIndex] = player;
    setLineup(newLineup);

    // Remove from substitutes if there
    setSubstitutes(subs => subs.filter(s => s._id !== player._id));
  }, [lineup]);

  const handleRemove = useCallback((positionIndex) => {
    const newLineup = [...lineup];
    newLineup[positionIndex] = null;
    setLineup(newLineup);
  }, [lineup]);

  const handleClearField = () => {
    setLineup(Array(11).fill(null));
    setSubstitutes([]);
  };

  const handleSaveLineup = () => {
    if (!selectedMatch) {
      toast.error('Please select a match');
      return;
    }

    const lineupData = lineup.map((player, index) => {
      if (!player) return null;
      const pos = positions[index];
      return {
        player: player._id,
        position: pos.position,
        positionX: pos.x,
        positionY: pos.y,
        isSubstitute: false
      };
    }).filter(Boolean);

    if (lineupData.length < 11) {
      toast.error('Please fill all 11 positions');
      return;
    }

    saveLineupMutation.mutate({
      matchId: selectedMatch,
      data: {
        lineup: lineupData,
        substitutes: substitutes.map(p => p._id),
        formation
      }
    });
  };

  const lineupPlayerIds = lineup.filter(Boolean).map(p => p._id);
  const substituteIds = substitutes.map(p => p._id);
  const availablePlayers = (playersData || []).filter(
    p => !lineupPlayerIds.includes(p._id) && !substituteIds.includes(p._id)
  );

  const teamOptions = (teamsData || []).map(team => ({
    value: team._id,
    label: `${team.name} (${team.ageCategory})`
  }));

  const matchOptions = (matchesData || []).map(match => ({
    value: match._id,
    label: `vs ${match.opponent.name} - ${new Date(match.matchDate).toLocaleDateString()}`
  }));

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('tactics.title')}</h1>
            <p className="text-gray-500">{t('tactics.dragPlayers')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon={RotateCcw} onClick={handleClearField}>
              {t('tactics.clearField')}
            </Button>
            <Button
              icon={Save}
              onClick={handleSaveLineup}
              loading={saveLineupMutation.isPending}
              disabled={!selectedMatch}
            >
              {t('tactics.saveLineup')}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label={t('teams.title')}
              options={teamOptions}
              value={selectedTeam}
              onChange={(e) => {
                setSelectedTeam(e.target.value);
                setSelectedMatch('');
                handleClearField();
              }}
              placeholder={`-- ${t('teams.title')} --`}
            />
            <Select
              label={t('matches.title')}
              options={matchOptions}
              value={selectedMatch}
              onChange={(e) => setSelectedMatch(e.target.value)}
              placeholder={`-- ${t('matches.title')} --`}
              disabled={!selectedTeam}
            />
            <Select
              label={t('tactics.selectFormation')}
              options={formations}
              value={formation}
              onChange={(e) => {
                setFormation(e.target.value);
                handleClearField();
              }}
            />
          </div>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Players List */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <Card.Header>
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {t('players.title')}
                </h3>
              </Card.Header>
              <Card.Body className="max-h-[500px] overflow-y-auto space-y-2">
                {playersLoading ? (
                  <Loading />
                ) : availablePlayers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {selectedTeam ? 'All players assigned' : 'Select a team'}
                  </p>
                ) : (
                  availablePlayers.map(player => (
                    <DraggablePlayer
                      key={player._id}
                      player={player}
                      isOnField={false}
                    />
                  ))
                )}
              </Card.Body>
            </Card>

            {/* Substitutes */}
            <Card>
              <Card.Header>
                <h3 className="font-semibold">{t('tactics.bench')}</h3>
              </Card.Header>
              <Card.Body className="space-y-2">
                {substitutes.map(player => (
                  <DraggablePlayer
                    key={player._id}
                    player={player}
                    isOnField={true}
                  />
                ))}
                {substitutes.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-2">
                    Drag players here for bench
                  </p>
                )}
              </Card.Body>
            </Card>
          </div>

          {/* Football Field */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden">
              <div
                className="relative football-field"
                style={{
                  paddingBottom: '66.67%',
                  backgroundImage: `
                    linear-gradient(to bottom, #3d7a37 0%, #2d5a27 100%)
                  `
                }}
              >
                {/* Field markings */}
                <div className="absolute inset-4 border-2 border-white/40 rounded-lg">
                  {/* Center circle */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/40 rounded-full" />
                  {/* Center line */}
                  <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white/40" />
                  {/* Goal areas */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 w-32 h-12 border-2 border-t-0 border-white/40" />
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-32 h-12 border-2 border-b-0 border-white/40" />
                  {/* Penalty areas */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-0 w-48 h-20 border-2 border-t-0 border-white/40" />
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-48 h-20 border-2 border-b-0 border-white/40" />
                </div>

                {/* Player positions */}
                {positions.map((pos, index) => (
                  <FieldPosition
                    key={index}
                    position={pos}
                    index={index}
                    player={lineup[index]}
                    onDrop={handleDrop}
                    onRemove={handleRemove}
                    onPlayerClick={setSelectedPlayer}
                  />
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Player Info Modal */}
        <Modal
          isOpen={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          title={t('tactics.playerInfo')}
          size="small"
        >
          {selectedPlayer && (
            <div className="text-center">
              <Avatar
                src={selectedPlayer.photo}
                firstName={selectedPlayer.firstName}
                lastName={selectedPlayer.lastName}
                size="xlarge"
                className="mx-auto mb-4"
              />
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {selectedPlayer.firstName} {selectedPlayer.lastName}
              </h3>
              <p className="text-gray-500 mb-4">
                #{selectedPlayer.jerseyNumber} - {selectedPlayer.position}
              </p>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedPlayer.statistics?.matchesPlayed || 0}
                  </p>
                  <p className="text-xs text-gray-500">{t('players.matchesPlayed')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {selectedPlayer.statistics?.goals || 0}
                  </p>
                  <p className="text-xs text-gray-500">{t('players.goals')}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {selectedPlayer.statistics?.assists || 0}
                  </p>
                  <p className="text-xs text-gray-500">{t('players.assists')}</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-2">{t('players.ratings')}</p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'].map(attr => (
                    <div key={attr} className="text-center">
                      <p className="text-lg font-bold text-primary-600">
                        {selectedPlayer.ratings?.[attr] || 50}
                      </p>
                      <p className="text-[10px] text-gray-400 uppercase">{attr.slice(0, 3)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DndProvider>
  );
};

export default Tactics;
