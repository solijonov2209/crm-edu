import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import Training from '../models/Training.js';
import Match from '../models/Match.js';

// @desc    Export players to Excel
// @route   GET /api/export/players/excel
// @access  Private
export const exportPlayersExcel = async (req, res) => {
  try {
    const { team } = req.query;
    const query = { isActive: true };

    if (req.user.role === 'coach' && req.user.team) {
      query.team = req.user.team._id;
    } else if (team) {
      query.team = team;
    }

    const players = await Player.find(query)
      .populate('team', 'name ageCategory')
      .sort({ lastName: 1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Youth Football Academy';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Players');

    // Set columns
    worksheet.columns = [
      { header: 'First Name', key: 'firstName', width: 15 },
      { header: 'Last Name', key: 'lastName', width: 15 },
      { header: 'Father Name', key: 'fatherName', width: 15 },
      { header: 'Birth Date', key: 'birthDate', width: 12 },
      { header: 'Age', key: 'age', width: 8 },
      { header: 'Team', key: 'team', width: 20 },
      { header: 'Position', key: 'position', width: 10 },
      { header: 'Jersey #', key: 'jerseyNumber', width: 10 },
      { header: 'Preferred Foot', key: 'preferredFoot', width: 12 },
      { header: 'Height (cm)', key: 'height', width: 12 },
      { header: 'Weight (kg)', key: 'weight', width: 12 },
      { header: 'Matches', key: 'matches', width: 10 },
      { header: 'Goals', key: 'goals', width: 8 },
      { header: 'Assists', key: 'assists', width: 8 },
      { header: 'Yellow Cards', key: 'yellowCards', width: 12 },
      { header: 'Red Cards', key: 'redCards', width: 10 },
      { header: 'Overall Rating', key: 'rating', width: 12 },
      { header: 'Parent Name', key: 'parentName', width: 20 },
      { header: 'Parent Phone', key: 'parentPhone', width: 15 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data
    players.forEach(player => {
      worksheet.addRow({
        firstName: player.firstName,
        lastName: player.lastName,
        fatherName: player.fatherName || '',
        birthDate: player.birthDate ? new Date(player.birthDate).toLocaleDateString() : '',
        age: player.age,
        team: player.team?.name || '',
        position: player.position,
        jerseyNumber: player.jerseyNumber || '',
        preferredFoot: player.preferredFoot,
        height: player.height || '',
        weight: player.weight || '',
        matches: player.statistics.matchesPlayed,
        goals: player.statistics.goals,
        assists: player.statistics.assists,
        yellowCards: player.statistics.yellowCards,
        redCards: player.statistics.redCards,
        rating: player.overallRating,
        parentName: player.parentName || '',
        parentPhone: player.parentPhone || ''
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=players.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export players Excel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Export players to PDF
// @route   GET /api/export/players/pdf
// @access  Private
export const exportPlayersPDF = async (req, res) => {
  try {
    const { team } = req.query;
    const query = { isActive: true };

    if (req.user.role === 'coach' && req.user.team) {
      query.team = req.user.team._id;
    } else if (team) {
      query.team = team;
    }

    const players = await Player.find(query)
      .populate('team', 'name ageCategory')
      .sort({ lastName: 1 });

    const teamInfo = team ? await Team.findById(team) : null;

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=players.pdf');

    doc.pipe(res);

    // Title
    doc.fontSize(20).text('Youth Football Academy', { align: 'center' });
    doc.fontSize(16).text('Player Roster', { align: 'center' });
    if (teamInfo) {
      doc.fontSize(12).text(`Team: ${teamInfo.name} (${teamInfo.ageCategory})`, { align: 'center' });
    }
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Table header
    const startY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Name', 50, startY);
    doc.text('Position', 180, startY);
    doc.text('Age', 240, startY);
    doc.text('Matches', 290, startY);
    doc.text('Goals', 350, startY);
    doc.text('Assists', 400, startY);
    doc.text('Rating', 460, startY);

    doc.moveTo(50, startY + 15).lineTo(550, startY + 15).stroke();

    // Table rows
    doc.font('Helvetica');
    let y = startY + 25;

    players.forEach((player) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }

      doc.text(`${player.firstName} ${player.lastName}`, 50, y);
      doc.text(player.position, 180, y);
      doc.text(player.age.toString(), 240, y);
      doc.text(player.statistics.matchesPlayed.toString(), 290, y);
      doc.text(player.statistics.goals.toString(), 350, y);
      doc.text(player.statistics.assists.toString(), 400, y);
      doc.text(player.overallRating.toString(), 460, y);

      y += 20;
    });

    // Summary
    doc.moveDown(2);
    doc.font('Helvetica-Bold').text(`Total Players: ${players.length}`);

    doc.end();
  } catch (error) {
    console.error('Export players PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Export training attendance to Excel
// @route   GET /api/export/trainings/excel
// @access  Private
export const exportTrainingsExcel = async (req, res) => {
  try {
    const { team, startDate, endDate } = req.query;
    const query = {};

    if (req.user.role === 'coach' && req.user.team) {
      query.team = req.user.team._id;
    } else if (team) {
      query.team = team;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const trainings = await Training.find(query)
      .populate('team', 'name')
      .populate('coach', 'firstName lastName')
      .populate('attendance.player', 'firstName lastName')
      .sort({ date: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Training Attendance');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Team', key: 'team', width: 20 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Start Time', key: 'startTime', width: 10 },
      { header: 'End Time', key: 'endTime', width: 10 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Total Players', key: 'total', width: 12 },
      { header: 'Present', key: 'present', width: 10 },
      { header: 'Absent', key: 'absent', width: 10 },
      { header: 'Attendance %', key: 'percentage', width: 12 },
      { header: 'Coach', key: 'coach', width: 20 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    trainings.forEach(training => {
      const stats = training.attendanceStats;
      worksheet.addRow({
        date: new Date(training.date).toLocaleDateString(),
        team: training.team?.name || '',
        type: training.type,
        startTime: training.startTime,
        endTime: training.endTime,
        location: training.location || '',
        status: training.status,
        total: stats.total,
        present: stats.present + stats.late,
        absent: stats.absent,
        percentage: `${stats.percentage}%`,
        coach: training.coach ? `${training.coach.firstName} ${training.coach.lastName}` : ''
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=trainings.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export trainings Excel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Export match report to PDF
// @route   GET /api/export/match/:id/pdf
// @access  Private
export const exportMatchPDF = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('team', 'name ageCategory')
      .populate('lineup.player', 'firstName lastName jerseyNumber position')
      .populate('goals.player', 'firstName lastName jerseyNumber')
      .populate('goals.assist', 'firstName lastName')
      .populate('cards.player', 'firstName lastName jerseyNumber')
      .populate('substitutions.playerOut', 'firstName lastName')
      .populate('substitutions.playerIn', 'firstName lastName')
      .populate('manOfTheMatch', 'firstName lastName');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=match-report-${match._id}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Match Report', { align: 'center' });
    doc.moveDown();

    // Match info
    doc.fontSize(16).text(`${match.team.name} vs ${match.opponent.name}`, { align: 'center' });
    doc.fontSize(24).text(match.finalScore, { align: 'center' });
    doc.moveDown();

    doc.fontSize(10);
    doc.text(`Date: ${new Date(match.matchDate).toLocaleDateString()}`);
    doc.text(`Kickoff: ${match.kickoffTime}`);
    doc.text(`Venue: ${match.venue || 'N/A'}`);
    doc.text(`Competition: ${match.competition}`);
    doc.text(`Formation: ${match.formation}`);
    doc.moveDown();

    // Goals
    if (match.goals.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Goals');
      doc.font('Helvetica').fontSize(10);
      match.goals.forEach(goal => {
        const assistText = goal.assist ? ` (assist: ${goal.assist.firstName} ${goal.assist.lastName})` : '';
        doc.text(`${goal.minute}' - ${goal.player.firstName} ${goal.player.lastName}${assistText}`);
      });
      doc.moveDown();
    }

    // Cards
    if (match.cards.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Cards');
      doc.font('Helvetica').fontSize(10);
      match.cards.forEach(card => {
        doc.text(`${card.minute}' - ${card.player.firstName} ${card.player.lastName} (${card.type})`);
      });
      doc.moveDown();
    }

    // Substitutions
    if (match.substitutions.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Substitutions');
      doc.font('Helvetica').fontSize(10);
      match.substitutions.forEach(sub => {
        doc.text(`${sub.minute}' - ${sub.playerIn.firstName} ${sub.playerIn.lastName} for ${sub.playerOut.firstName} ${sub.playerOut.lastName}`);
      });
      doc.moveDown();
    }

    // Lineup
    doc.fontSize(14).font('Helvetica-Bold').text('Starting Lineup');
    doc.font('Helvetica').fontSize(10);
    const starters = match.lineup.filter(l => !l.isSubstitute);
    starters.forEach(l => {
      doc.text(`${l.player.jerseyNumber || '-'} - ${l.player.firstName} ${l.player.lastName} (${l.position})`);
    });
    doc.moveDown();

    // Statistics
    doc.fontSize(14).font('Helvetica-Bold').text('Match Statistics');
    doc.font('Helvetica').fontSize(10);
    doc.text(`Possession: ${match.statistics.possession}%`);
    doc.text(`Shots: ${match.statistics.shots} (On target: ${match.statistics.shotsOnTarget})`);
    doc.text(`Corners: ${match.statistics.corners}`);
    doc.text(`Fouls: ${match.statistics.fouls}`);

    // Man of the Match
    if (match.manOfTheMatch) {
      doc.moveDown();
      doc.fontSize(12).font('Helvetica-Bold')
        .text(`Man of the Match: ${match.manOfTheMatch.firstName} ${match.manOfTheMatch.lastName}`);
    }

    // Coach Notes
    if (match.coachNotes) {
      doc.moveDown();
      doc.fontSize(14).font('Helvetica-Bold').text('Coach Notes');
      doc.font('Helvetica').fontSize(10).text(match.coachNotes);
    }

    doc.end();
  } catch (error) {
    console.error('Export match PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Export team statistics to Excel
// @route   GET /api/export/team/:id/stats
// @access  Private
export const exportTeamStatsExcel = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const players = await Player.find({ team: team._id, isActive: true })
      .sort({ 'statistics.goals': -1 });

    const matches = await Match.find({ team: team._id, status: 'completed' })
      .sort({ matchDate: -1 });

    const workbook = new ExcelJS.Workbook();

    // Team Overview Sheet
    const overviewSheet = workbook.addWorksheet('Team Overview');
    overviewSheet.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Value', key: 'value', width: 15 }
    ];

    overviewSheet.addRows([
      { metric: 'Team Name', value: team.name },
      { metric: 'Age Category', value: team.ageCategory },
      { metric: 'Total Players', value: players.length },
      { metric: 'Matches Played', value: team.statistics.totalMatches },
      { metric: 'Wins', value: team.statistics.wins },
      { metric: 'Draws', value: team.statistics.draws },
      { metric: 'Losses', value: team.statistics.losses },
      { metric: 'Goals For', value: team.statistics.goalsFor },
      { metric: 'Goals Against', value: team.statistics.goalsAgainst },
      { metric: 'Goal Difference', value: team.statistics.goalsFor - team.statistics.goalsAgainst }
    ]);

    // Player Stats Sheet
    const playerSheet = workbook.addWorksheet('Player Statistics');
    playerSheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Position', key: 'position', width: 10 },
      { header: 'Matches', key: 'matches', width: 10 },
      { header: 'Goals', key: 'goals', width: 10 },
      { header: 'Assists', key: 'assists', width: 10 },
      { header: 'Yellow Cards', key: 'yellow', width: 12 },
      { header: 'Red Cards', key: 'red', width: 10 },
      { header: 'Rating', key: 'rating', width: 10 }
    ];

    players.forEach(player => {
      playerSheet.addRow({
        name: `${player.firstName} ${player.lastName}`,
        position: player.position,
        matches: player.statistics.matchesPlayed,
        goals: player.statistics.goals,
        assists: player.statistics.assists,
        yellow: player.statistics.yellowCards,
        red: player.statistics.redCards,
        rating: player.overallRating
      });
    });

    // Match Results Sheet
    const matchSheet = workbook.addWorksheet('Match Results');
    matchSheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Opponent', key: 'opponent', width: 25 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Result', key: 'result', width: 10 },
      { header: 'Competition', key: 'competition', width: 20 },
      { header: 'Venue', key: 'venue', width: 20 }
    ];

    matches.forEach(match => {
      matchSheet.addRow({
        date: new Date(match.matchDate).toLocaleDateString(),
        opponent: match.opponent.name,
        score: match.finalScore,
        result: match.result?.toUpperCase() || 'N/A',
        competition: match.competition,
        venue: match.venue || 'N/A'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${team.name}-statistics.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export team stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
