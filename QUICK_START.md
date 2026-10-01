# Quick Start Guide

Get the Presales Platform up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- Python 3.9+ installed  
- PostgreSQL 12+ installed and running
- Git installed

## Step 1: Database Setup (2 minutes)

```bash
# Open PostgreSQL terminal
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

## Step 2: Backend Setup (1.5 minutes)

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate  # On Windows
# or: source venv/bin/activate  # On macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Initialize database
python -c "from database import init_db; from seed import seed_database; init_db(); seed_database()"

# Start backend (will run on http://localhost:8000)
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Keep this terminal open!

## Step 3: Frontend Setup (1.5 minutes)

In a **new terminal**:

```bash
cd frontend

# Install dependencies
npm install

# Start frontend (will run on http://localhost:3000)
npm run dev
```

## Step 4: Login and Explore

1. Open http://localhost:3000 in your browser
2. You should be redirected to the login page
3. Use any demo credentials:
   - **Email**: `priya.sharma@example.com`
   - **Password**: `Demo@123`

4. Explore the platform:
   - **Dashboard**: View KPIs and charts
   - **Opportunities**: See 10+ sample opportunities
   - **Artifacts**: Browse 15+ sample artifacts
   - **Mapping**: Map artifacts to opportunities
   - **Users**: View all demo users
   - **Reports**: Analysis and statistics
   - **AI Assistant**: Chat with AI assistant
   - **Audit Logs**: See all activity

## Demo Users by Role

### Solution Owners (Full Access)
- **Priya Sharma** - priya.sharma@example.com
- **Amit Kulkarni** - amit.kulkarni@example.com

### Solution Members (Limited Access)
- **Rahul Mehta** - rahul.mehta@example.com
- **Sneha Patil** - sneha.patil@example.com

### Guests (Read-Only)
- **Neha Joshi** - neha.joshi@example.com
- **Arjun Desai** - arjun.desai@example.com

### Administrators (Full System Access)
- **Vikram Shah** - vikram.shah@example.com
- **Ananya Rao** - ananya.rao@example.com

**All users use password**: `Demo@123`

## API Documentation

Once backend is running, view interactive API docs:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Troubleshooting

### Port 8000 already in use
```bash
# Use different port
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001
# Then update frontend NEXT_PUBLIC_API_URL=http://localhost:8001
```

### Port 3000 already in use
```bash
# Use different port
npm run dev -- -p 3001
```

### PostgreSQL connection error
```bash
# Verify PostgreSQL is running
psql -U postgres

# Check credentials match in backend/.env
```

### Python/Node modules not found
```bash
# Delete node_modules and venv, reinstall
rm -rf backend/venv frontend/node_modules
# Then follow setup steps again
```

## What's Included

✅ 10+ Sample Opportunities
- GlobalBank Digital Transformation ($5M)
- HealthFirst Patient Engagement ($3.5M)
- RetailOne Cloud Modernization ($4.2M)
- And 7 more...

✅ 15+ Sample Artifacts
- Cloud Reference Architectures
- Solution Proposals
- Case Studies
- Implementation Plans
- And more...

✅ Complete Features
- CRUD operations for opportunities and artifacts
- Many-to-many artifact mapping
- Role-based access control
- AI assistant (demo mode without AWS)
- Audit logging
- Reports and analytics

## Next Steps

1. **Try creating data**:
   - Create a new opportunity
   - Create a new artifact
   - Map an artifact to an opportunity

2. **Explore permissions**:
   - Log in as different roles
   - See what each role can access

3. **Check the UI**:
   - Dark green + white theme
   - Responsive navigation
   - Interactive charts and tables

4. **Review the code**:
   - Backend: `backend/main.py` (all API routes)
   - Frontend: `frontend/pages/` (all pages)
   - Database: `backend/models.py` (schema)

## Optional: AWS Bedrock Setup

To enable real AI responses instead of demo mode:

1. Configure AWS credentials in `backend/.env`:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

2. Restart the backend

3. Go to Settings page to check Bedrock connection status

## Production Deployment

For deploying to production, see `DEPLOYMENT_GUIDE.md`

---

**You're all set!** Start exploring the Presales Platform! 🚀
