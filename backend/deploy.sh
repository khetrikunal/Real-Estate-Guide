#!/bin/bash
set -euo pipefail

: "${DB_PASSWORD:?Set DB_PASSWORD before deploying}"
: "${JWT_SECRET:?Set JWT_SECRET before deploying}"
if [ "${#JWT_SECRET}" -lt 32 ]; then
  echo "JWT_SECRET must contain at least 32 characters" >&2
  exit 1
fi
export DB_PASSWORD JWT_SECRET

sudo dnf update -y
sudo dnf install java-21-amazon-corretto -y
sudo dnf install postgresql15 postgresql15-server -y

# Initialize database
if [ ! -f /var/lib/pgsql/data/PG_VERSION ]; then
  sudo postgresql-setup --initdb
fi

# Start and enable on boot
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Wait for pg to start
sleep 2

# Switch to postgres user and create db & user
sudo --preserve-env=DB_PASSWORD -u postgres psql -v ON_ERROR_STOP=1 <<'EOF'
\getenv db_password DB_PASSWORD
SELECT 'CREATE ROLE realestate_user LOGIN' WHERE NOT EXISTS
  (SELECT 1 FROM pg_roles WHERE rolname = 'realestate_user') \gexec
ALTER ROLE realestate_user PASSWORD :'db_password';
SELECT 'CREATE DATABASE realestate OWNER realestate_user' WHERE NOT EXISTS
  (SELECT 1 FROM pg_database WHERE datname = 'realestate') \gexec
GRANT ALL PRIVILEGES ON DATABASE realestate TO realestate_user;
ALTER DATABASE realestate OWNER TO realestate_user;
EOF

# Update pg_hba.conf to allow md5
# Note: Sometimes it has multiple spaces
sudo sed -E -i 's/local\s+all\s+all\s+peer/local   all   all   md5/' /var/lib/pgsql/data/pg_hba.conf
sudo sed -E -i 's/host\s+all\s+all\s+127.0.0.1\/32\s+ident/host    all   all   127.0.0.1\/32   md5/' /var/lib/pgsql/data/pg_hba.conf

sudo systemctl restart postgresql

# CREATE UPLOADS FOLDER
mkdir -p /home/ec2-user/uploads
chmod 755 /home/ec2-user/uploads
mkdir -p /home/ec2-user/logs

# Install Node.js and PM2
sudo dnf install nodejs -y
sudo npm install -g pm2

# Use the versioned production configuration; secrets are resolved from the environment.
install -m 600 "$(dirname "$0")/src/main/resources/application-prod.properties" /home/ec2-user/application-prod.properties

# Restart backend
pm2 stop realestate-api || true
pm2 start "java -jar /home/ec2-user/app.jar --spring.profiles.active=prod --spring.config.additional-location=file:/home/ec2-user/application-prod.properties" --name realestate-api --log /home/ec2-user/logs/app.log --update-env
pm2 save
