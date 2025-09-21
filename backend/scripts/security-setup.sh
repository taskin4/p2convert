#!/bin/bash

# P2Convert Security Setup Script
# Advanced security configuration

set -e

echo "🔒 Setting up advanced security for P2Convert..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Update system
print_status "Updating system packages..."
apt update

# 1. Install Fail2ban
print_status "Installing Fail2ban..."
apt install fail2ban -y

# Configure Fail2ban
print_status "Configuring Fail2ban..."
cp config/fail2ban/jail.local /etc/fail2ban/jail.local
cp config/fail2ban/filter.d/p2convert-*.conf /etc/fail2ban/filter.d/

# Start and enable Fail2ban
systemctl start fail2ban
systemctl enable fail2ban

# 2. Configure SSH security
print_status "Configuring SSH security..."

# Backup original SSH config
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Update SSH configuration
cat >> /etc/ssh/sshd_config << EOF

# P2Convert SSH Security Settings
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
PermitEmptyPasswords no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
PermitTunnel no
ChrootDirectory none
EOF

# 3. Install and configure UFW firewall
print_status "Configuring UFW firewall..."
apt install ufw -y

# Reset UFW
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow ssh

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow backend API (if needed externally)
# ufw allow 3001/tcp

# Enable UFW
ufw --force enable

# 4. Install and configure ClamAV
print_status "Configuring ClamAV antivirus..."
apt install clamav clamav-daemon clamav-freshclam -y

# Update ClamAV database
freshclam

# Configure ClamAV daemon
systemctl start clamav-daemon
systemctl enable clamav-daemon

# 5. Configure log rotation
print_status "Configuring log rotation..."
cat > /etc/logrotate.d/p2convert << EOF
/var/log/nginx/p2convert_*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}

/var/log/p2convert-*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}

/var/log/p2convert-reports/*.txt {
    weekly
    missingok
    rotate 12
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF

# 6. Set up file permissions
print_status "Setting up file permissions..."

# Secure application directories
chmod 755 /var/www/p2convert
chmod 700 /var/www/p2convert/backend/config
chmod 600 /var/www/p2convert/backend/.env

# Secure log directories
chmod 755 /var/log/nginx
chmod 644 /var/log/nginx/p2convert_*.log

# 7. Configure system limits
print_status "Configuring system limits..."
cat >> /etc/security/limits.conf << EOF

# P2Convert system limits
www-data soft nofile 65536
www-data hard nofile 65536
www-data soft nproc 32768
www-data hard nproc 32768
EOF

# 8. Install and configure AIDE (file integrity monitoring)
print_status "Installing AIDE for file integrity monitoring..."
apt install aide -y

# Initialize AIDE database
aideinit

# Move database to proper location
mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# 9. Configure automatic security updates
print_status "Configuring automatic security updates..."
apt install unattended-upgrades -y

cat > /etc/apt/apt.conf.d/50unattended-upgrades << EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
};

Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

# 10. Set up monitoring and alerting
print_status "Setting up security monitoring..."

# Create security monitoring script
cat > /usr/local/bin/security-monitor.sh << 'EOF'
#!/bin/bash

# Security monitoring script
LOG_FILE="/var/log/security-monitor.log"
DATE=$(date)

# Check for failed login attempts
FAILED_LOGINS=$(grep "Failed password" /var/log/auth.log | grep "$(date +%b\ %d)" | wc -l)
if [ "$FAILED_LOGINS" -gt 10 ]; then
    echo "$DATE: WARNING - High number of failed login attempts: $FAILED_LOGINS" >> $LOG_FILE
fi

# Check for banned IPs
BANNED_IPS=$(fail2ban-client status sshd | grep "Currently banned" | awk '{print $4}')
if [ "$BANNED_IPS" -gt 5 ]; then
    echo "$DATE: WARNING - High number of banned IPs: $BANNED_IPS" >> $LOG_FILE
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "$DATE: CRITICAL - Disk usage is ${DISK_USAGE}%" >> $LOG_FILE
fi

# Check memory usage
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ "$MEM_USAGE" -gt 90 ]; then
    echo "$DATE: CRITICAL - Memory usage is ${MEM_USAGE}%" >> $LOG_FILE
fi
EOF

chmod +x /usr/local/bin/security-monitor.sh

# Add to crontab
echo "*/5 * * * * /usr/local/bin/security-monitor.sh" >> /etc/crontab

# 11. Restart services
print_status "Restarting services..."
systemctl restart sshd
systemctl restart fail2ban
systemctl restart nginx
systemctl restart redis-server

# 12. Generate SSH key pair for deployment
print_status "Generating SSH key pair for deployment..."
if [ ! -f /root/.ssh/id_rsa ]; then
    ssh-keygen -t rsa -b 4096 -f /root/.ssh/id_rsa -N ""
    print_warning "SSH key pair generated. Public key:"
    cat /root/.ssh/id_rsa.pub
fi

print_status "✅ Security setup completed successfully!"

echo ""
print_warning "IMPORTANT SECURITY NOTES:"
echo "1. SSH key authentication is now required"
echo "2. Root login is disabled"
echo "3. Fail2ban is protecting against brute force attacks"
echo "4. UFW firewall is configured and active"
echo "5. Automatic security updates are enabled"
echo "6. File integrity monitoring is active"
echo ""
print_warning "NEXT STEPS:"
echo "1. Add your SSH public key to ~/.ssh/authorized_keys"
echo "2. Test SSH connection before closing current session"
echo "3. Monitor /var/log/security-monitor.log for alerts"
echo "4. Review Fail2ban status: fail2ban-client status"
echo "5. Check UFW status: ufw status"
echo ""
print_status "Security setup is complete! 🔒"
