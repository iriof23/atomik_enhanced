# SaaS Penetration Testing Report Generation Platform

A production-ready dual-deployment platform for generating professional penetration testing reports.

## 🚀 Deployment Models

### Desktop Application (Freelancers)
- **Platform**: Windows (.exe) and macOS (.dmg)
- **Database**: SQLite (local)
- **Authentication**: License key validation
- **Features**: Offline-first, embedded backend, 30-day grace period

### Docker Deployment (Teams)
- **Platform**: Linux/macOS/Windows with Docker
- **Database**: PostgreSQL
- **Authentication**: Multi-user JWT
- **Features**: Team collaboration, multi-tenancy, cloud storage

## 🛠️ Tech Stack

- **Backend**: FastAPI (Python 3.11+)
- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Database**: Prisma ORM (SQLite/PostgreSQL)
- **Desktop**: Electron with embedded FastAPI
- **Docker**: Nginx + FastAPI + PostgreSQL + Redis + Celery

## 📦 Project Structure

```
report_maker/
├── backend/          # FastAPI backend
├── frontend/         # React + TypeScript frontend
├── desktop/          # Electron wrapper
├── shared/           # Shared types and utilities
├── docker/           # Docker configurations
└── docs/             # Documentation
```

## 🚀 Quick Start

### Desktop Development

```bash
# Install dependencies
cd desktop && npm install
cd ../frontend && npm install
cd ../backend && pip install -e .

# Run in development mode
npm run electron:dev
```

### Docker Deployment

```bash
# Start all services
cd docker
./start.sh

# Access at http://localhost
```

## 📋 Features

- ✅ Dual deployment (Desktop + Docker)
- ✅ License key validation with machine binding
- ✅ Multi-tenant organization support
- ✅ Client and project management
- ✅ Finding management with rich text editor
- ✅ CVSS v3.1 calculator
- ✅ CVE enrichment from NVD API
- ✅ Tool integrations (Burp Suite, Nessus)
- ✅ Evidence management with annotations
- ✅ Customizable report templates
- ✅ PDF generation
- ✅ Offline-first desktop mode
- ✅ Team collaboration (Docker mode)

## 📖 Documentation

See the [docs/](docs/) directory for detailed documentation:
- [Architecture Overview](docs/architecture.md)
- [API Documentation](docs/api.md)
- [Desktop Build Guide](docs/desktop-build.md)
- [Docker Deployment Guide](docs/docker-deployment.md)

## 🔐 Security

- SQL injection prevention (Prisma ORM)
- XSS prevention (input sanitization)
- JWT authentication with refresh tokens
- Rate limiting on API endpoints
- Multi-tenant data isolation
- Secure file upload handling

## 📄 License

Proprietary - All rights reserved
