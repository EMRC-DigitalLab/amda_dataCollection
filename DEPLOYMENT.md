# AMDA CI/CD Auto-Deployment

## What This Does
Automatically deploys your app to Hostinger server when you push code to `main` branch.

## How It Works
1. Push code to GitHub `main` branch
2. GitHub Actions runs deployment workflow
3. Connects to server via SSH
4. Backs up current running container
5. Pulls latest code and rebuilds Docker container
6. Runs health checks
7. Auto-rollback if deployment fails

## Setup

### 1. SSH Keys
```bash
# Generate deployment key (no passphrase)
ssh-keygen -t ed25519 -f ~/.ssh/github_actions_deploy

# Add public key to server
cat ~/.ssh/github_actions_deploy.pub
# Paste into server: ~/.ssh/authorized_keys

# Copy private key for GitHub
cat ~/.ssh/github_actions_deploy
```

### 2. GitHub Secrets
Go to: Repository → Settings → Secrets and variables → Actions

Add these secrets:
- `SSH_PRIVATE_KEY` - Your private key content
- `SSH_USER` - `root`  
- `HOST` - `srv880665.hstgr.cloud`

### 3. Workflow File
Create: `.github/workflows/deploy.yml`
```yaml
name: Deploy to Production
on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}
      - name: Deploy
        run: |
          ssh -o StrictHostKeyChecking=no ${{ secrets.SSH_USER }}@${{ secrets.HOST }} << 'EOF'
            cd /srv/amda/prod/app
            docker stop amda-collection-api || true
            docker rename amda-collection-api amda-collection-api-backup || true
            git pull origin main
            npm run docker:prod
            # Health check and rollback logic here
          EOF
```

## Manual Commands
```bash
# Deploy manually
./deploy.sh deploy

# Check status  
./deploy.sh status

# Rollback
./deploy.sh rollback
```

## Troubleshooting
- Check GitHub Actions logs for deployment errors
- View server logs: `docker logs amda-collection-api`
- Manual rollback: `docker rename amda-collection-api-backup amda-collection-api && docker start amda-collection-api`

## Files Structure
```
Server: /srv/amda/prod/app/
├── deploy.sh (manual deployment script)
└── .github/workflows/deploy.yml (auto deployment)
```