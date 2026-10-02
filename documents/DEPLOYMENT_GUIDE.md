# Deployment Guide

This guide covers deploying the Presales Platform to production environments.

## Pre-Deployment Checklist

- [ ] All code committed to version control
- [ ] Environment variables properly configured
- [ ] Database backups in place
- [ ] SSL certificates obtained
- [ ] AWS IAM roles/permissions configured
- [ ] Security audit completed
- [ ] Load testing performed
- [ ] Disaster recovery plan documented

## Backend Deployment

### Docker Deployment (Recommended)

Create `Dockerfile` in backend directory:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t presales-backend .
docker run -p 8000:8000 \
  -e DATABASE_URL="postgresql://..." \
  -e AWS_REGION="us-east-1" \
  -e AWS_ACCESS_KEY_ID="..." \
  -e AWS_SECRET_ACCESS_KEY="..." \
  presales-backend
```

### AWS ECS Deployment

1. **Create ECR Repository**
```bash
aws ecr create-repository --repository-name presales-backend
```

2. **Build and Push Image**
```bash
docker build -t presales-backend .
docker tag presales-backend:latest <account>.dkr.ecr.<region>.amazonaws.com/presales-backend:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/presales-backend:latest
```

3. **Create ECS Task Definition**
   - Container image: ECR image URL
   - Port: 8000
   - Memory: 1024 MB
   - CPU: 512
   - Environment variables (use AWS Secrets Manager):
     - DATABASE_URL
     - AWS_REGION
     - SECRET_KEY

4. **Create ECS Service**
   - Launch type: Fargate
   - Number of tasks: 2+
   - Load balancer: ALB
   - Auto-scaling: Yes (scale from 2-10 tasks)

### AWS Lambda Deployment

```bash
# Package FastAPI for Lambda
pip install -r requirements.txt -t ./package
cp -r . ./package

cd package
zip -r ../deployment.zip .
cd ..

# Deploy
aws lambda create-function \
  --function-name presales-api \
  --runtime python3.11 \
  --role <iam-role-arn> \
  --handler main.handler \
  --zip-file fileb://deployment.zip
```

### Production Server Configuration

**Gunicorn**:
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 \
  --timeout 60 \
  --access-logfile - \
  --error-logfile - \
  main:app
```

**Nginx Reverse Proxy**:
```nginx
upstream presales_api {
    server localhost:8000;
    server localhost:8001;
    server localhost:8002;
    server localhost:8003;
}

server {
    listen 443 ssl http2;
    server_name api.presales.com;
    
    ssl_certificate /etc/ssl/cert.pem;
    ssl_certificate_key /etc/ssl/key.pem;
    
    location / {
        proxy_pass http://presales_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Frontend Deployment

### Docker Deployment

Create `Dockerfile` in frontend directory:

```dockerfile
FROM node:18 AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package.json ./

EXPOSE 3000
CMD ["npm", "start"]
```

### AWS Amplify Deployment (Easiest)

1. **Connect Git Repository**
   - Push code to GitHub/GitLab
   - Create Amplify app
   - Connect repository

2. **Configure Build Settings**
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
         artifacts:
           files:
             - '**/*'
           baseDirectory: .next
           name: NextJSArtifact
   ```

3. **Environment Variables**
   - NEXT_PUBLIC_API_URL=https://api.presales.com

### AWS S3 + CloudFront

1. **Build for Static Export**
   ```bash
   npm run build
   npm run export
   ```

2. **Upload to S3**
   ```bash
   aws s3 sync out/ s3://presales-frontend/
   ```

3. **Create CloudFront Distribution**
   - Origin: S3 bucket
   - Default root object: index.html
   - Custom domain: presales.com
   - SSL certificate: ACM certificate

### Vercel Deployment (Recommended for Next.js)

1. **Connect GitHub Repository**
   - Push code to GitHub
   - Create Vercel account
   - Import project

2. **Configure Environment**
   ```
   NEXT_PUBLIC_API_URL=https://api.presales.com
   ```

3. **Deploy**
   - Automatic deployments on push
   - Automatic preview environments

## Database Deployment

### RDS PostgreSQL

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier presales-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.2 \
  --master-username postgres \
  --master-user-password <strong-password> \
  --allocated-storage 100 \
  --storage-type gp3 \
  --db-name presales_db \
  --publicly-accessible false

# Enable automated backups
aws rds modify-db-instance \
  --db-instance-identifier presales-db \
  --backup-retention-period 30 \
  --apply-immediately
```

### Database Migrations

```bash
# Connect to production database
export DATABASE_URL="postgresql://user:pass@host/db"

# Run migrations (use Alembic for production)
pip install alembic
alembic upgrade head
```

### Backup Strategy

```bash
# Automated daily backups via AWS
# Retention: 30 days

# Manual backup
aws rds create-db-snapshot \
  --db-instance-identifier presales-db \
  --db-snapshot-identifier presales-db-backup-$(date +%Y%m%d)
```

## AWS Bedrock Configuration

### Enable Models

```bash
# Check available models
aws bedrock list-foundation-models

# Models are enabled per-region
# Typically enable:
# - Claude 3 Sonnet
# - Claude 3 Haiku
```

### IAM Role for Bedrock

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:*:*:foundation-model/*"
    }
  ]
}
```

### Cost Optimization

- Use Claude 3 Haiku for simple tasks
- Implement request caching
- Set rate limits (10 requests/user/minute)
- Monitor token usage

## Monitoring & Logging

### CloudWatch

```bash
# Create log groups
aws logs create-log-group --log-group-name /presales/api
aws logs create-log-group --log-group-name /presales/frontend

# Create alarms
aws cloudwatch put-metric-alarm \
  --alarm-name presales-api-5xx \
  --alarm-description "Alert on 5xx errors" \
  --metric-name 5XXError \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

### Application Insights

- Backend: Add logging in main.py
- Frontend: Add error tracking (Sentry/Rollbar)
- Database: Enable RDS Enhanced Monitoring

## Security Hardening

### SSL/TLS Certificates

```bash
# Use AWS ACM for free certificates
aws acm request-certificate \
  --domain-name presales.com \
  --subject-alternative-names "*.presales.com" \
  --validation-method DNS
```

### Security Groups

```bash
# Backend security group
# Inbound: Port 8000 from ALB
# Outbound: All (for AWS APIs)

# Database security group
# Inbound: Port 5432 from Backend
# Outbound: None (RDS controls)
```

### Secrets Management

```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name presales/db-password \
  --secret-string "$(date +%s | sha256sum | head -c 32)"

# Use IAM roles instead of hardcoded credentials
```

## Performance Optimization

### Frontend
- Enable compression (gzip)
- Minify JavaScript/CSS
- Use CDN (CloudFront)
- Enable caching headers
- Lazy load images

### Backend
- Connection pooling (SQLAlchemy)
- Database indexing
- API response caching
- Async operations
- Rate limiting

### Database
- Create indexes on frequently queried columns
- Enable query logging
- Monitor slow queries
- Regular maintenance

## Load Testing

```bash
# Using Apache Bench
ab -n 1000 -c 100 https://api.presales.com/api/health

# Using k6
k6 run script.js

# Expected performance:
# - API: < 200ms latency
# - Database: < 100ms queries
# - Frontend: < 3s page load
```

## Rollback Plan

```bash
# ECS: Roll back to previous task definition
aws ecs update-service \
  --cluster presales \
  --service presales-api \
  --task-definition presales-api:previous

# Database: Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier presales-db-restored \
  --db-snapshot-identifier presales-db-backup-20240101

# Frontend: Revert DNS to previous CloudFront distribution
```

## Post-Deployment

- [ ] Verify all services are running
- [ ] Test login and core workflows
- [ ] Monitor error logs
- [ ] Check Bedrock functionality
- [ ] Validate security headers
- [ ] Performance testing
- [ ] Backup database
- [ ] Document infrastructure

## Infrastructure as Code (Optional)

Consider using Terraform or CloudFormation for production:

```hcl
# Terraform example
resource "aws_rds_instance" "presales" {
  identifier = "presales-db"
  engine = "postgres"
  instance_class = "db.t3.micro"
  ...
}
```

---

For questions or issues during deployment, refer to the README.md or contact your infrastructure team.
