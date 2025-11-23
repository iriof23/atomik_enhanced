# Quick Start Guide

## Docker Deployment (Recommended)

### Prerequisites
- Docker and Docker Compose installed
- 4GB+ RAM available
- Ports 80, 5432, 6379, 8000 available

### Steps

1. **Navigate to docker directory**
   ```bash
   cd /Users/iriof/.gemini/antigravity/scratch/report_maker/docker
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env if needed (optional for testing)
   ```

3. **Start the platform**
   ```bash
   ./start.sh
   ```

4. **Access the application**
   - Frontend: http://localhost
   - API Docs: http://localhost/api/docs
   - Health Check: http://localhost/health

### Default Credentials
Since this is a fresh installation, you'll need to:
1. Register a new account at http://localhost/login
2. Use any email/password combination
3. This will create your organization automatically

## Development Mode

### Backend Development

```bash
cd /Users/iriof/.gemini/antigravity/scratch/report_maker/backend

# Install dependencies
pip install poetry
poetry install

# Setup environment
cp .env.example .env

# Generate Prisma client
prisma generate

# Run migrations
prisma migrate dev --name init

# Start server
python -m app.main
```

Backend runs at: http://localhost:8000

### Frontend Development

```bash
cd /Users/iriof/.gemini/antigravity/scratch/report_maker/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: http://localhost:3000

## Testing the Platform

### 1. Register/Login
- Docker mode: Use email/password
- Desktop mode: Use license key (not yet implemented)

### 2. Create a Client
- Navigate to Clients page
- Click "Add Client" (to be implemented)
- Fill in client details

### 3. Create a Project
- Navigate to Projects page
- Select a client
- Add project details

### 4. Add Findings
- Navigate to Findings page
- Create vulnerability findings
- Upload evidence files

### 5. Generate Report
- Navigate to Reports page
- Select a project
- Generate PDF report

## Troubleshooting

### Docker Issues

**Services won't start:**
```bash
docker-compose down -v
docker-compose up -d
```

**Database connection errors:**
```bash
docker-compose logs postgres
```

**Backend errors:**
```bash
docker-compose logs backend
```

### Development Issues

**Prisma client not found:**
```bash
cd backend
prisma generate
```

**Frontend build errors:**
```bash
cd frontend
rm -rf node_modules
npm install
```

## Next Steps

1. **Complete the UI** - Implement data tables and forms
2. **Add Services** - PDF generation, CVE enrichment
3. **Build Desktop App** - Electron wrapper
4. **Test Everything** - Security, performance, UX
5. **Deploy** - Production environment setup

## Project Structure

```
report_maker/
├── backend/      # FastAPI + Prisma
├── frontend/     # React + TypeScript
├── docker/       # Docker Compose
├── desktop/      # Electron (to be built)
└── shared/       # Shared types (to be built)
```

## Support

For issues or questions:
1. Check the walkthrough.md for detailed documentation
2. Review the implementation_plan.md for architecture details
3. Check task.md for implementation status
