import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Team from '../models/Team.js';
import Player from '../models/Player.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/youth_football_academy');
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    await Team.deleteMany({});
    await Player.deleteMany({});

    console.log('Existing data cleared');

    // Create Super Admin
    const superAdmin = await User.create({
      firstName: 'Admin',
      lastName: 'Director',
      email: process.env.ADMIN_EMAIL || 'admin@academy.com',
      password: process.env.ADMIN_PASSWORD || 'Admin123!',
      role: 'super_admin',
      phone: '+998901234567',
      preferredLanguage: 'uz'
    });

    console.log('Super Admin created:', superAdmin.email);

    // Create Teams
    const teams = await Team.create([
      {
        name: 'U-12 Lions',
        ageCategory: 'U-12',
        birthYear: 2014,
        description: 'Under 12 main team',
        primaryColor: '#1e40af',
        secondaryColor: '#ffffff',
        homeVenue: 'Academy Main Field',
        trainingSchedule: [
          { dayOfWeek: 1, startTime: '16:00', endTime: '18:00', location: 'Field A' },
          { dayOfWeek: 3, startTime: '16:00', endTime: '18:00', location: 'Field A' },
          { dayOfWeek: 5, startTime: '16:00', endTime: '18:00', location: 'Field A' }
        ]
      },
      {
        name: 'U-14 Tigers',
        ageCategory: 'U-14',
        birthYear: 2012,
        description: 'Under 14 main team',
        primaryColor: '#dc2626',
        secondaryColor: '#ffffff',
        homeVenue: 'Academy Main Field',
        trainingSchedule: [
          { dayOfWeek: 1, startTime: '18:00', endTime: '20:00', location: 'Field B' },
          { dayOfWeek: 3, startTime: '18:00', endTime: '20:00', location: 'Field B' },
          { dayOfWeek: 5, startTime: '18:00', endTime: '20:00', location: 'Field B' }
        ]
      },
      {
        name: 'U-16 Eagles',
        ageCategory: 'U-16',
        birthYear: 2010,
        description: 'Under 16 main team',
        primaryColor: '#059669',
        secondaryColor: '#ffffff',
        homeVenue: 'Academy Main Field',
        trainingSchedule: [
          { dayOfWeek: 2, startTime: '17:00', endTime: '19:00', location: 'Field A' },
          { dayOfWeek: 4, startTime: '17:00', endTime: '19:00', location: 'Field A' },
          { dayOfWeek: 6, startTime: '10:00', endTime: '12:00', location: 'Field A' }
        ]
      }
    ]);

    console.log('Teams created:', teams.length);

    // Create Coaches
    const coaches = await User.create([
      {
        firstName: 'Abdulla',
        lastName: 'Karimov',
        email: 'coach1@academy.com',
        password: 'Coach123!',
        role: 'coach',
        phone: '+998901111111',
        team: teams[0]._id,
        preferredLanguage: 'uz'
      },
      {
        firstName: 'Rustam',
        lastName: 'Yusupov',
        email: 'coach2@academy.com',
        password: 'Coach123!',
        role: 'coach',
        phone: '+998902222222',
        team: teams[1]._id,
        preferredLanguage: 'ru'
      },
      {
        firstName: 'Jamshid',
        lastName: 'Tursunov',
        email: 'coach3@academy.com',
        password: 'Coach123!',
        role: 'coach',
        phone: '+998903333333',
        team: teams[2]._id,
        preferredLanguage: 'uz'
      }
    ]);

    // Update teams with coaches
    for (let i = 0; i < teams.length; i++) {
      await Team.findByIdAndUpdate(teams[i]._id, { coach: coaches[i]._id });
    }

    console.log('Coaches created:', coaches.length);

    // Sample player names
    const playerFirstNames = ['Aziz', 'Bekzod', 'Davron', 'Eldor', 'Farrux', 'Gulom', 'Hamid', 'Ilhom', 'Jasur', 'Kamol', 'Laziz', 'Mirzo', 'Nodir', 'Obid', 'Pulat', 'Ravshan', 'Sardor', 'Timur', 'Ulugbek', 'Vohid'];
    const playerLastNames = ['Aliyev', 'Boboyev', 'Choriyev', 'Davlatov', 'Ergashev', 'Fozilov', 'Gafurov', 'Hasanov', 'Ibragimov', 'Jalolov', 'Kamolov', 'Latipov', 'Mahmudov', 'Nazarov', 'Olimov', 'Pulatov', 'Rahimov', 'Saidov', 'Tojiyev', 'Umarov'];
    const positions = ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

    // Create players for each team
    for (const team of teams) {
      const teamPlayers = [];
      for (let i = 0; i < 18; i++) {
        const firstName = playerFirstNames[Math.floor(Math.random() * playerFirstNames.length)];
        const lastName = playerLastNames[Math.floor(Math.random() * playerLastNames.length)];
        const position = positions[i % positions.length];
        const birthYear = team.birthYear;

        teamPlayers.push({
          firstName,
          lastName,
          fatherName: `${lastName}ovich`,
          birthDate: new Date(birthYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          birthYear,
          team: team._id,
          jerseyNumber: i + 1,
          position,
          preferredFoot: Math.random() > 0.3 ? 'right' : 'left',
          height: 140 + Math.floor(Math.random() * 40),
          weight: 35 + Math.floor(Math.random() * 25),
          parentName: `${lastName} Bekzod`,
          parentPhone: `+99890${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
          ratings: {
            pace: 40 + Math.floor(Math.random() * 40),
            shooting: 40 + Math.floor(Math.random() * 40),
            passing: 40 + Math.floor(Math.random() * 40),
            dribbling: 40 + Math.floor(Math.random() * 40),
            defending: 40 + Math.floor(Math.random() * 40),
            physical: 40 + Math.floor(Math.random() * 40)
          },
          statistics: {
            matchesPlayed: Math.floor(Math.random() * 20),
            goals: position === 'ST' || position === 'CF' ? Math.floor(Math.random() * 15) : Math.floor(Math.random() * 5),
            assists: Math.floor(Math.random() * 8),
            yellowCards: Math.floor(Math.random() * 3),
            redCards: Math.random() > 0.9 ? 1 : 0,
            minutesPlayed: Math.floor(Math.random() * 1500)
          },
          physicalCondition: 80 + Math.floor(Math.random() * 20),
          isInjured: Math.random() > 0.9
        });
      }

      await Player.create(teamPlayers);
    }

    console.log('Players created for all teams');

    console.log('\n=== Seeding Complete ===');
    console.log('\nLogin Credentials:');
    console.log('Super Admin: admin@academy.com / Admin123!');
    console.log('Coach 1 (U-12): coach1@academy.com / Coach123!');
    console.log('Coach 2 (U-14): coach2@academy.com / Coach123!');
    console.log('Coach 3 (U-16): coach3@academy.com / Coach123!');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
