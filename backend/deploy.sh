#!/bin/bash
sudo dnf update -y
sudo dnf install java-17-amazon-corretto -y
sudo dnf install postgresql15 postgresql15-server -y

# Initialize database
sudo postgresql-setup --initdb

# Start and enable on boot
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Wait for pg to start
sleep 2

# Switch to postgres user and create db & user
sudo -u postgres psql <<EOF
CREATE DATABASE realestate;
CREATE USER realestate_user WITH PASSWORD 'StrongPassword123!';
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

# CREATE PRODUCTION CONFIG
cat <<EOF > /home/ec2-user/application-prod.properties
server.port=9090

# PostgreSQL
spring.datasource.url=jdbc:postgresql://127.0.0.1:5432/realestate
spring.datasource.username=realestate_user
spring.datasource.password=StrongPassword123!
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA
spring.jpa.hibernate.ddl-auto=update
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.show-sql=false

# File upload
spring.servlet.multipart.max-file-size=100MB
spring.servlet.multipart.max-request-size=100MB
file.upload.path=/home/ec2-user/uploads/

# JWT
jwt.secret=YourSuperSecretJWTKeyThatIsLongEnough123456789
jwt.expiration=86400000

# Razorpay
razorpay.key.id=rzp_live_YOUR_KEY
razorpay.key.secret=YOUR_SECRET

# CORS
allowed.origins=http://13.127.129.43:9090,http://localhost:9090
EOF

# Restart backend
pm2 stop realestate-api || true
pm2 start "java -jar /home/ec2-user/app.jar --spring.config.additional-location=file:/home/ec2-user/application-prod.properties" --name realestate-api --log /home/ec2-user/logs/app.log
pm2 save
