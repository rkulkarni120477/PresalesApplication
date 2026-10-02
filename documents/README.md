# Presales Opportunity & Artifact Management Platform

A comprehensive enterprise web application for managing presales opportunities, artifacts, and their relationships with AWS Bedrock integration for AI-powered insights.

## Overview

The platform allows presales teams to:

- **Manage Opportunities**: Create, edit, and track sales opportunities across stages
- **Manage Artifacts**: Store and organize reusable presales artifacts
- **Map Artifacts to Opportunities**: Many-to-many relationship management
- **Generate AI Insights**: Leverage AWS Bedrock for summaries and recommendations
- **Track Reuse**: Monitor artifact usage across opportunities
- **Role-Based Access**: Control permissions for different user types
- **Audit Logging**: Complete activity tracking

## Technology Stack

### Frontend
- **Framework**: Next.js 14 with React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios

### Backend
- **Framework**: FastAPI (Python)
- **ORM**: SQLAlchemy
- **Database**: PostgreSQL
- **Authentication**: JWT
- **AI**: AWS Bedrock
- **Async**: Uvicorn

### Infrastructure
- **Database**: PostgreSQL 12+
- **AI Service**: Amazon Bedrock

## Project Structure

```
Presales App/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── auth.py              # Authentication logic
│   ├── config.py            # Configuration
│   ├── database.py          # Database setup
│   ├── seed.py              # Sample data generation
│   ├── services/
│   │   └── bedrock_service.py   # AWS Bedrock integration
│   ├── requirements.txt      # Python dependencies
│   ├── .env                  # Environment variables
│   └── .env.example          # Example environment file
│
├── frontend/
│   ├── pages/
│   │   ├── _app.tsx         # App entry point
│   │   ├── login.tsx        # Login page
│   │   ├── dashboard.tsx    # Dashboard
│   │   ├── opportunities.tsx# Opportunities module
│   │   ├── artifacts.tsx    # Artifacts module
│   │   ├── mapping.tsx      # Artifact mapping
│   │   ├── users.tsx        # Users management
│   │   ├── reports.tsx      # Reports
│   │   ├── ai-assistant.tsx # AI chat interface
│   │   ├── audit-logs.tsx   # Audit logs
│   │   └── settings.tsx     # Settings
│   ├── components/
│   │   └── Layout.tsx       # Main layout
│   ├── lib/
│   │   ├── api.ts           # API client
│   │   └── store.ts         # Auth store
│   ├── styles/
│   │   └── globals.css      # Global styles
│   ├── package.json         # Dependencies
│   ├── tsconfig.json        # TypeScript config
│   ├── next.config.js       # Next.js config
│   └── tailwind.config.js   # Tailwind config
│
└── README.md
```

## Prerequisites

- **Node.js**: 18.0 or higher
- **Python**: 3.9 or higher
- **PostgreSQL**: 12 or higher
- **AWS Account** (for Bedrock - optional for demo)

## Setup Instructions

### 1. Database Setup

#### PostgreSQL Installation

**Windows (using installer):**
1. Download PostgreSQL installer from https://www.postgresql.org/download/windows/
2. Run installer and follow the setup wizard
3. Note the password you set for the postgres user
4. Default port is 5432

**Create Database:**

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE presales_db;
CREATE USER presales WITH ENCRYPTED PASSWORD 'presales';
ALTER ROLE presales SET client_encoding TO 'utf8';
ALTER ROLE presales SET default_transaction_isolation TO 'read committed';
ALTER ROLE presales SET default_transaction_deferrable TO on;
ALTER ROLE presales SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE presales_db TO presales;
\q
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment (copy and edit as needed)
copy .env.example .env

# Initialize database and seed sample data
python -c "from database import init_db; from seed import seed_database; init_db(); seed_database()"

# Run the backend server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
# or
yarn install

# Run development server
npm run dev
# or
yarn dev
```

The frontend will be available at `http://localhost:3000`

## AWS Bedrock Setup

### Enable Bedrock Models

1. Go to AWS Console → Bedrock → Model Access
2. Enable models you want to use (e.g., Claude 3 Sonnet)
3. Wait for model access to be granted

### Configure AWS Credentials

**Option 1: Environment Variables (Development)**

Create or edit `backend/.env`:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

**Option 2: AWS CLI Configuration (Recommended)**

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Set default region (e.g., us-east-1)
# Set default output format (json)
```

**Option 3: IAM Role (Production)**

Use IAM roles for EC2, ECS, or Lambda instead of credentials.

### Demo Mode (Without AWS Credentials)

The application will work in demo mode if AWS credentials are not configured. AI features will provide pre-formatted responses instead of actual Bedrock calls.

## Demo Credentials

All demo users can log in with:

**Password**: `Demo@123`

**Available Users**:

| Name | Email | Role |
|------|-------|------|
| Priya Sharma | priya.sharma@example.com | Presales Solution Owner |
| Amit Kulkarni | amit.kulkarni@example.com | Presales Solution Owner |
| Rahul Mehta | rahul.mehta@example.com | Presales Solution Member |
| Sneha Patil | sneha.patil@example.com | Presales Solution Member |
| Neha Joshi | neha.joshi@example.com | Guest |
| Arjun Desai | arjun.desai@example.com | Guest |
| Vikram Shah | vikram.shah@example.com | Administrator |
| Ananya Rao | ananya.rao@example.com | Administrator |

## Sample Data

The application includes 10+ sample opportunities and 15+ sample artifacts, automatically seeded on first startup.

### Sample Opportunities

- GlobalBank Digital Transformation
- HealthFirst Patient Engagement Platform
- RetailOne Cloud Modernization
- FinServe AI Customer Service
- EduWorld Learning Platform
- And more...

### Sample Artifacts

- Banking Cloud Reference Architecture
- Enterprise AI Architecture
- RAG Solution Architecture
- Customer Service Chatbot Proposal
- Cloud Migration Proposal
- And more...

## User Roles & Permissions

### Presales Solution Owner
- Full access to opportunities and artifacts
- Create, edit, archive
- Map artifacts
- Manage opportunity ownership
- View reports and audit logs

### Presales Solution Member
- View assigned opportunities
- Create opportunities
- View and create artifacts
- Edit owned artifacts
- Search and view reports

### Guest
- Read-only access
- View opportunities and artifacts
- Search functionality
- No create/edit/delete permissions

### Administrator
- Full system access
- User management
- Role management
- System configuration
- View audit logs

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Opportunities
- `GET /api/opportunities` - List opportunities
- `POST /api/opportunities` - Create opportunity
- `GET /api/opportunities/{id}` - Get opportunity details
- `PUT /api/opportunities/{id}` - Update opportunity

### Artifacts
- `GET /api/artifacts` - List artifacts
- `POST /api/artifacts` - Create artifact
- `GET /api/artifacts/{id}` - Get artifact details
- `PUT /api/artifacts/{id}` - Update artifact

### Mapping
- `GET /api/opportunities/{id}/artifacts` - Get mapped artifacts
- `POST /api/opportunities/{id}/artifacts/{artifactId}` - Map artifact
- `DELETE /api/opportunities/{id}/artifacts/{artifactId}` - Unmap artifact

### AI Features
- `POST /api/ai/opportunity-summary` - Generate opportunity summary
- `POST /api/ai/artifact-summary` - Generate artifact summary
- `POST /api/ai/recommend-artifacts` - Get artifact recommendations
- `POST /api/ai/analyze-opportunity` - Analyze opportunity

### Other
- `GET /api/health` - Health check
- `GET /api/health/ai` - AI service health
- `GET /api/users` - List users
- `GET /api/audit-logs` - Get audit logs

## Color Scheme (Dark Green + White)

- **Primary Dark Green**: `#0B5D3B`
- **Deep Green**: `#06452D`
- **Medium Green**: `#148A58`
- **Light Green**: `#EAF6F0`
- **White**: `#FFFFFF`
- **Page Background**: `#F7F9F8`
- **Text**: `#1F2937`
- **Secondary Text**: `#6B7280`
- **Border**: `#DDE5E1`

## Development

### Running Both Services

Terminal 1 - Backend:
```bash
cd backend
venv\Scripts\activate
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

Then navigate to `http://localhost:3000`

### Database Migrations

To reset the database:
```bash
cd backend
python -c "from database import drop_db, init_db; drop_db(); init_db()"
python -c "from seed import seed_database; seed_database()"
```

## Production Deployment

### Backend (FastAPI)

```bash
# Install production server
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 main:app
```

### Frontend (Next.js)

```bash
# Build for production
npm run build

# Start production server
npm start
```

### AWS Deployment Options

- **Backend**: AWS ECS, Lambda, or EC2
- **Frontend**: AWS S3 + CloudFront, Amplify, or EC2
- **Database**: Amazon RDS for PostgreSQL
- **AI**: Amazon Bedrock (already configured in code)

## Security Considerations

1. **AWS Credentials**: Never commit credentials. Use environment variables or IAM roles
2. **JWT Secret**: Change the default secret key in production
3. **HTTPS**: Always use HTTPS in production
4. **Database**: Use strong passwords and restrict access
5. **Input Validation**: All inputs are validated with Pydantic
6. **Authorization**: Server-side authorization on all endpoints
7. **CORS**: Configure appropriate CORS settings for production

## Troubleshooting

### Database Connection Error
```
Error: could not connect to server
```
**Solution**: 
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists: `createdb -U postgres presales_db`

### Port Already in Use
```
Address already in use
```
**Solution**:
- Change port in the command: `--port 8001`
- Or kill the process using the port

### AI Service Unavailable
**Solution**:
- Verify AWS credentials are configured
- Check Bedrock model access in AWS Console
- Check internet connectivity
- The app will continue to function without AI features

### Frontend Cannot Connect to Backend
```
Error: Failed to login
```
**Solution**:
- Verify backend is running on `http://localhost:8000`
- Check `NEXT_PUBLIC_API_URL` environment variable
- Verify CORS configuration in FastAPI

## Features

✅ **Complete Opportunity Management**
- Full CRUD operations
- Advanced search and filtering
- Stage tracking
- Value and probability tracking

✅ **Artifact Management**
- Artifact creation and versioning
- Category and industry classification
- Usage tracking and reuse analytics

✅ **Many-to-Many Mapping**
- Map artifacts to opportunities
- Track artifact reuse
- View mapping relationships

✅ **AI-Powered Features**
- Opportunity summaries
- Artifact recommendations
- Opportunity analysis
- AI chat assistant

✅ **Role-Based Access Control**
- 4 role types
- Granular permissions
- Audit logging

✅ **Responsive UI**
- Dark green + white theme
- Desktop-optimized design
- Interactive dashboards
- Real-time data updates

✅ **Sample Data**
- 10+ opportunities
- 15+ artifacts
- Pre-configured mappings
- Ready-to-demo state

## Support & Documentation

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation at `/docs` (backend)
3. Check console logs for errors
4. Verify configuration settings

## License

Internal Use - Presales Platform

## Version History

**v1.0.0** - Initial Release
- Complete presales management platform
- AWS Bedrock integration
- Role-based access control
- Sample data and demo credentials
