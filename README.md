# Youth Football Academy CRM

A professional, full-stack CRM web application for managing youth football academies. Built with React, Node.js, Express, and MongoDB.

## Features

### User Roles

**Super Admin (Academy Director)**
- Manage all coaches (create/edit login credentials)
- Full access to all system data
- View all age categories and teams
- Track attendance for all trainings
- View training photos and videos
- See player ratings and evaluations
- Dashboard with charts, diagrams, and statistics
- Manage match days and view lineups
- View full match information and analytics

**Coach**
- Manage assigned team only
- Player management with profiles
- Training management with attendance tracking
- Tactics & lineup builder
- Match management

### Core Modules

- **Player Management**: Complete player profiles with photos, ratings, statistics
- **Team Management**: Age categories, coaches, training schedules
- **Training Management**: Daily attendance, player evaluation, media uploads
- **Match Management**: Scheduling, lineups, live scoring, statistics
- **Tactical Editor**: Drag-and-drop lineup builder with formations
- **Dashboard**: Charts, statistics, performance tracking
- **Export**: PDF and Excel reports

### Technical Features

- Multi-language support (Uzbek, Russian, English)
- Fully responsive design (desktop, tablet, mobile)
- Modern, minimal, football-oriented UI/UX
- Role-based authentication and authorization
- RESTful API architecture

## Tech Stack

### Frontend
- React 18 with Vite
- React Router v6
- Tailwind CSS
- React Query (TanStack Query)
- React Hook Form
- Chart.js
- React DnD (Drag and Drop)
- i18next (Internationalization)
- Axios
- Lucide React (Icons)

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- Multer (File uploads)
- ExcelJS & PDFKit (Exports)

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 6.0+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd crm-edu
```

2. **Install frontend dependencies**
```bash
npm install
```

3. **Install backend dependencies**
```bash
cd backend
npm install
```

4. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your settings
```

5. **Seed the database (optional)**
```bash
npm run seed
```

6. **Start the development servers**

Backend:
```bash
cd backend
npm run dev
```

Frontend (new terminal):
```bash
npm run dev
```

7. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### Default Credentials

After seeding:
- **Super Admin**: admin@academy.com / Admin123!
- **Coach (U-12)**: coach1@academy.com / Coach123!
- **Coach (U-14)**: coach2@academy.com / Coach123!
- **Coach (U-16)**: coach3@academy.com / Coach123!

## Project Structure

```
crm-edu/
├── backend/
│   ├── config/         # Database configuration
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Auth, upload, validation
│   ├── models/         # Mongoose models
│   ├── routes/         # API routes
│   ├── utils/          # Utility functions
│   ├── uploads/        # Uploaded files
│   └── server.js       # Entry point
├── src/
│   ├── components/     # React components
│   │   ├── common/     # Reusable UI components
│   │   ├── layout/     # Layout components
│   │   └── ...         # Feature components
│   ├── context/        # React context
│   ├── hooks/          # Custom hooks
│   ├── locales/        # i18n translations (uz, ru, en)
│   ├── pages/          # Page components
│   │   ├── admin/      # Admin pages
│   │   ├── coach/      # Coach pages
│   │   └── auth/       # Auth pages
│   ├── utils/          # Utility functions
│   ├── App.jsx         # Main app component
│   └── main.jsx        # Entry point
├── public/             # Static assets
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Change password

### Users (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Teams
- `GET /api/teams` - List teams
- `POST /api/teams` - Create team
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team

### Players
- `GET /api/players` - List players
- `POST /api/players` - Create player
- `PUT /api/players/:id` - Update player
- `DELETE /api/players/:id` - Delete player

### Trainings
- `GET /api/trainings` - List trainings
- `POST /api/trainings` - Create training
- `PUT /api/trainings/:id/attendance` - Update attendance

### Matches
- `GET /api/matches` - List matches
- `POST /api/matches` - Create match
- `PUT /api/matches/:id/lineup` - Set lineup
- `PUT /api/matches/:id/complete` - Complete match

### Dashboard
- `GET /api/dashboard/admin` - Admin dashboard data
- `GET /api/dashboard/coach` - Coach dashboard data

### Export
- `GET /api/export/players/excel` - Export players to Excel
- `GET /api/export/players/pdf` - Export players to PDF
- `GET /api/export/match/:id/pdf` - Export match report

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/youth_football_academy` |
| `JWT_SECRET` | JWT secret key | Required |
| `JWT_EXPIRE` | Token expiration | `7d` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |

## License

This project is licensed under the MIT License.
