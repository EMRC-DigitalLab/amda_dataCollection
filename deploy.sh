# deploy.sh - Manual deployment script for local testing
#!/bin/bash

set -e

# Configuration
CONTAINER_NAME="amda-collection-api"
BACKUP_CONTAINER_NAME="amda-collection-api-backup"
LOG_PATH="/srv/amda/logs"
DEPLOY_PATH="/srv/amda/prod/app"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log with timestamp and color
log() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] ${message}${NC}" | tee -a ${LOG_PATH}/manual_deployment.log
}

# Function to rollback
rollback() {
    log $RED "🔄 STARTING ROLLBACK PROCESS"
    
    # Stop current container
    if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
        log $YELLOW "Stopping failed container..."
        docker stop $CONTAINER_NAME || true
        docker rm $CONTAINER_NAME || true
    fi
    
    # Restore backup container if it exists
    if docker ps -a -q -f name=$BACKUP_CONTAINER_NAME | grep -q .; then
        log $YELLOW "Restoring backup container..."
        docker rename $BACKUP_CONTAINER_NAME $CONTAINER_NAME
        docker start $CONTAINER_NAME
        log $GREEN "✅ ROLLBACK COMPLETED - Service restored to previous version"
    else
        log $RED "❌ NO BACKUP CONTAINER FOUND - Manual intervention required"
        exit 1
    fi
}

# Function to health check
health_check() {
    log $BLUE "🔍 Starting health check..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker ps | grep -q $CONTAINER_NAME; then
            # Check if container is actually healthy
            if docker exec $CONTAINER_NAME curl -f http://localhost:3000/health 2>/dev/null || \
               docker logs $CONTAINER_NAME 2>&1 | tail -10 | grep -v "Error\|error" >/dev/null; then
                log $GREEN "✅ Health check passed (attempt $attempt/$max_attempts)"
                return 0
            fi
        fi
        
        log $YELLOW "⏳ Health check attempt $attempt/$max_attempts failed, waiting..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    log $RED "❌ Health check failed after $max_attempts attempts"
    return 1
}

# Main deployment function
deploy() {
    log $BLUE "🚀 STARTING MANUAL DEPLOYMENT PROCESS"
    
    # Create logs directory
    mkdir -p $LOG_PATH
    
    # Navigate to app directory
    cd $DEPLOY_PATH
    
    # Backup current running container
    if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
        log $YELLOW "📦 Creating backup of current container..."
        
        # Remove old backup if exists
        if docker ps -a -q -f name=$BACKUP_CONTAINER_NAME | grep -q .; then
            docker stop $BACKUP_CONTAINER_NAME || true
            docker rm $BACKUP_CONTAINER_NAME || true
        fi
        
        # Create backup
        docker stop $CONTAINER_NAME
        docker rename $CONTAINER_NAME $BACKUP_CONTAINER_NAME
        log $GREEN "✅ Backup created successfully"
    else
        log $YELLOW "ℹ️ No running container found to backup"
    fi
    
    # Pull latest code
    log $BLUE "📥 Pulling latest code from GitHub..."
    if ! git pull origin main; then
        log $RED "❌ Git pull failed"
        rollback
        exit 1
    fi
    
    # Build and deploy new container
    log $BLUE "🔨 Building new Docker container..."
    if ! npm run docker:prod; then
        log $RED "❌ Docker build failed"
        rollback
        exit 1
    fi
    
    # Wait for container to start
    sleep 5
    
    # Perform health check
    if ! health_check; then
        log $RED "❌ Health check failed - initiating rollback"
        # Capture logs before rollback
        docker logs $CONTAINER_NAME > $LOG_PATH/failed_deployment_logs_$(date +%Y%m%d_%H%M%S).log 2>&1 || true
        rollback
        exit 1
    fi
    
    # Clean up old backup if deployment successful
    if docker ps -a -q -f name=$BACKUP_CONTAINER_NAME | grep -q .; then
        log $BLUE "🧹 Cleaning up old backup container..."
        docker stop $BACKUP_CONTAINER_NAME || true
        docker rm $BACKUP_CONTAINER_NAME || true
    fi
    
    # Clean up old images
    log $BLUE "🧹 Cleaning up old Docker images..."
    docker image prune -f || true
    
    log $GREEN "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY"
    log $GREEN "Container: $CONTAINER_NAME is now running"
    
    # Final status check
    docker ps | grep $CONTAINER_NAME || true
}

# Rollback function for manual use
manual_rollback() {
    log $RED "🔄 MANUAL ROLLBACK INITIATED"
    rollback
}

# Status check function
status() {
    echo "=== AMDA APPLICATION STATUS ==="
    echo "Date: $(date)"
    echo ""
    echo "Container Status:"
    docker ps | grep amda || echo "No AMDA containers running"
    echo ""
    echo "Recent logs:"
    docker logs --tail 20 $CONTAINER_NAME 2>/dev/null || echo "Container not running"
    echo ""
    echo "Deployment logs:"
    tail -20 $LOG_PATH/deployment.log 2>/dev/null || echo "No deployment logs found"
}

# Main script logic
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "rollback")
        manual_rollback
        ;;
    "status")
        status
        ;;
    "logs")
        docker logs -f $CONTAINER_NAME
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|status|logs}"
        echo "  deploy   - Deploy latest code"
        echo "  rollback - Rollback to previous version"
        echo "  status   - Show current status"
        echo "  logs     - Follow container logs"
        exit 1
        ;;
esac