# Youth Football Academy CRM - Deployment Guide

This guide provides step-by-step instructions for deploying the Youth Football Academy CRM to a production server.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Requirements](#server-requirements)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Database Setup](#database-setup)
6. [Nginx Configuration](#nginx-configuration)
7. [SSL/HTTPS Setup](#sslhttps-setup)
8. [PM2 Process Manager](#pm2-process-manager)
9. [Environment Variables](#environment-variables)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Node.js 18+ and npm
- MongoDB 6.0+
- Nginx
- SSL certificate (Let's Encrypt recommended)
- Domain name configured

## Server Requirements

- **Minimum**: 1 vCPU, 2GB RAM, 20GB SSD
- **Recommended**: 2 vCPU, 4GB RAM, 40GB SSD

---

## Backend Deployment

### 1. Clone the Repository

```bash
# Connect to your server
ssh user@your-server-ip

# Create application directory
sudo mkdir -p /var/www/football-academy
sudo chown -R $USER:$USER /var/www/football-academy
cd /var/www/football-academy

# Clone the repository
git clone https://github.com/your-repo/youth-football-academy-crm.git .
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install --production
```

### 3. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit the environment file
nano .env
```

Update the following values:

```env
NODE_ENV=production
PORT=5000

# MongoDB Connection - Use your production MongoDB URI
MONGODB_URI=mongodb://localhost:27017/youth_football_academy

# JWT Secret - Generate a secure random string
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
JWT_EXPIRE=7d

# File Upload
MAX_FILE_SIZE=10485760

# Frontend URL
FRONTEND_URL=https://your-domain.com

# Admin Credentials
ADMIN_EMAIL=admin@your-domain.com
ADMIN_PASSWORD=YourSecurePassword123!
```

### 4. Create Upload Directories

```bash
mkdir -p uploads/photos uploads/videos
chmod 755 uploads uploads/photos uploads/videos
```

### 5. Seed Initial Data (Optional)

```bash
npm run seed
```

---

## Frontend Deployment

### 1. Install Dependencies

```bash
cd /var/www/football-academy
npm install
```

### 2. Create Production Environment

```bash
# Create environment file for frontend
cat > .env.production << EOF
VITE_API_URL=https://your-domain.com/api
EOF
```

### 3. Build the Frontend

```bash
npm run build
```

This creates a `dist` folder with the production build.

---

## Database Setup

### 1. Install MongoDB (if not installed)

```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update and install
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 2. Secure MongoDB (Production)

```bash
# Connect to MongoDB
mongosh

# Create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "your-secure-admin-password",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

# Create application database user
use youth_football_academy
db.createUser({
  user: "academy_app",
  pwd: "your-secure-app-password",
  roles: [ { role: "readWrite", db: "youth_football_academy" } ]
})
```

Update your `.env` file:

```env
MONGODB_URI=mongodb://academy_app:your-secure-app-password@localhost:27017/youth_football_academy
```

---

## Nginx Configuration

### 1. Install Nginx

```bash
sudo apt install nginx
```

### 2. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/football-academy
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration (will be updated by Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Frontend (static files)
    root /var/www/football-academy/dist;
    index index.html;

    # Frontend routes - SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads proxy
    location /uploads {
        proxy_pass http://localhost:5000/uploads;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # File upload size
    client_max_body_size 20M;
}
```

### 3. Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/football-academy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## SSL/HTTPS Setup

### Using Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Certificate auto-renewal (usually automatic, but verify)
sudo certbot renew --dry-run
```

---

## PM2 Process Manager

### 1. Install PM2

```bash
sudo npm install -g pm2
```

### 2. Create PM2 Configuration

```bash
cd /var/www/football-academy/backend
nano ecosystem.config.js
```

Add:

```javascript
module.exports = {
  apps: [{
    name: 'football-academy-api',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

### 3. Start the Application

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Useful PM2 Commands

```bash
pm2 status          # Check application status
pm2 logs            # View logs
pm2 restart all     # Restart all processes
pm2 reload all      # Zero-downtime reload
pm2 monit           # Monitor CPU/Memory
```

---

## Environment Variables

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | API server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://user:pass@localhost:27017/db` |
| `JWT_SECRET` | Secret key for JWT | Random 32+ character string |
| `JWT_EXPIRE` | Token expiration | `7d` |
| `MAX_FILE_SIZE` | Max upload size in bytes | `10485760` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://your-domain.com` |
| `ADMIN_EMAIL` | Initial admin email | `admin@your-domain.com` |
| `ADMIN_PASSWORD` | Initial admin password | Secure password |

### Frontend (.env.production)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://your-domain.com/api` |

---

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Check if Node.js app is running: `pm2 status`
   - Check logs: `pm2 logs`
   - Verify port in Nginx matches app port

2. **MongoDB Connection Failed**
   - Verify MongoDB is running: `sudo systemctl status mongod`
   - Check connection string in `.env`
   - Verify firewall allows connection

3. **CORS Errors**
   - Verify `FRONTEND_URL` in backend `.env`
   - Check Nginx proxy headers

4. **File Upload Fails**
   - Check directory permissions: `ls -la uploads/`
   - Verify `client_max_body_size` in Nginx
   - Check `MAX_FILE_SIZE` in `.env`

### Logs

```bash
# PM2 logs
pm2 logs football-academy-api

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

### Backup Database

```bash
# Create backup
mongodump --db youth_football_academy --out /backup/$(date +%Y%m%d)

# Restore backup
mongorestore --db youth_football_academy /backup/20240101/youth_football_academy
```

---

## Quick Start Checklist

- [ ] Server provisioned with required specs
- [ ] Node.js 18+ installed
- [ ] MongoDB 6.0+ installed and secured
- [ ] Repository cloned
- [ ] Backend dependencies installed
- [ ] Frontend built for production
- [ ] Environment variables configured
- [ ] Nginx configured and running
- [ ] SSL certificate obtained
- [ ] PM2 configured and application running
- [ ] Initial admin user created (via seed or manually)
- [ ] Firewall configured (ports 80, 443 open)
- [ ] Backup strategy implemented

---

## Support

For issues and questions, please open an issue in the GitHub repository.
