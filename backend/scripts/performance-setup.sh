#!/bin/bash

# P2Convert Performance Setup Script
# Intel Cascade Lake optimizations and hardware acceleration

set -e

echo "⚡ Setting up performance optimizations for P2Convert..."

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

# 1. Install hardware acceleration packages
print_status "Installing hardware acceleration packages..."

# NVIDIA drivers and CUDA (if NVIDIA GPU available)
if lspci | grep -i nvidia > /dev/null; then
    print_status "NVIDIA GPU detected, installing CUDA..."
    apt install nvidia-driver-470 nvidia-cuda-toolkit -y
fi

# Intel Media SDK for Quick Sync
if lscpu | grep -i intel > /dev/null; then
    print_status "Intel CPU detected, installing Intel Media SDK..."
    apt install intel-media-va-driver-non-free libmfx1 -y
fi

# VA-API for AMD/Intel GPU acceleration
apt install vainfo libva-dev libva-drm2 libva-x11-2 -y

# 2. Optimize FFmpeg with hardware acceleration
print_status "Installing optimized FFmpeg..."
apt install ffmpeg -y

# 3. Set up RAM disk for temporary files
print_status "Setting up RAM disk for temporary files..."

# Create RAM disk mount point
mkdir -p /tmp/videoconv

# Add to fstab for persistent mounting
if ! grep -q "tmpfs /tmp/videoconv" /etc/fstab; then
    echo "tmpfs /tmp/videoconv tmpfs defaults,size=4G,mode=1777 0 0" >> /etc/fstab
fi

# Mount RAM disk
mount -t tmpfs -o size=4G,mode=1777 tmpfs /tmp/videoconv

# 4. Optimize system for Intel Cascade Lake
print_status "Optimizing system for Intel Cascade Lake..."

# CPU governor optimization
echo 'performance' > /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Make CPU governor setting persistent
cat > /etc/systemd/system/cpu-performance.service << EOF
[Unit]
Description=Set CPU governor to performance
After=multi-user.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'echo performance > /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor'
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl enable cpu-performance.service

# 5. Optimize memory settings
print_status "Optimizing memory settings..."

# Increase shared memory
echo "tmpfs /dev/shm tmpfs defaults,size=2G 0 0" >> /etc/fstab

# Optimize kernel parameters
cat >> /etc/sysctl.conf << EOF

# P2Convert Performance Optimizations
# Memory management
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
vm.vfs_cache_pressure = 50

# Network optimizations
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 65536 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.core.netdev_max_backlog = 5000

# File system optimizations
fs.file-max = 2097152
fs.nr_open = 1048576
EOF

# Apply sysctl settings
sysctl -p

# 6. Optimize Redis for performance
print_status "Optimizing Redis configuration..."

# Backup original Redis config
cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Add performance optimizations to Redis config
cat >> /etc/redis/redis.conf << EOF

# P2Convert Performance Optimizations
# Memory optimization
maxmemory 1gb
maxmemory-policy allkeys-lru

# Persistence optimization
save 900 1
save 300 10
save 60 10000

# Network optimization
tcp-keepalive 300
timeout 0

# Advanced optimization
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
EOF

# 7. Optimize Nginx for performance
print_status "Optimizing Nginx configuration..."

# Add performance optimizations to Nginx config
cat >> /etc/nginx/nginx.conf << EOF

# P2Convert Performance Optimizations
worker_processes auto;
worker_cpu_affinity auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    # Performance optimizations
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 1000;
    
    # Buffer optimizations
    client_body_buffer_size 128k;
    client_max_body_size 250m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    
    # Gzip optimizations
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF

# 8. Set up process priorities
print_status "Setting up process priorities..."

# Create systemd override for PM2
mkdir -p /etc/systemd/system/p2convert.service.d
cat > /etc/systemd/system/p2convert.service.d/override.conf << EOF
[Service]
Nice=-5
IOSchedulingClass=1
IOSchedulingPriority=4
EOF

# 9. Install and configure monitoring tools
print_status "Installing performance monitoring tools..."
apt install htop iotop nethogs -y

# 10. Create performance monitoring script
print_status "Creating performance monitoring script..."

cat > /usr/local/bin/performance-monitor.sh << 'EOF'
#!/bin/bash

# Performance monitoring script
LOG_FILE="/var/log/performance-monitor.log"
DATE=$(date)

# CPU usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')

# Memory usage
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')

# Disk I/O
DISK_IO=$(iostat -x 1 1 | tail -n +4 | awk '{sum+=$10} END {print sum}')

# Network I/O
NET_IO=$(cat /proc/net/dev | grep eth0 | awk '{print $2+$10}')

# Log performance metrics
echo "$DATE - CPU: ${CPU_USAGE}%, Memory: ${MEM_USAGE}%, Disk IO: ${DISK_IO}, Network IO: ${NET_IO}" >> $LOG_FILE

# Alert if performance is poor
if (( $(echo "$CPU_USAGE > 90" | bc -l) )); then
    echo "$DATE - WARNING: High CPU usage: ${CPU_USAGE}%" >> $LOG_FILE
fi

if (( $(echo "$MEM_USAGE > 90" | bc -l) )); then
    echo "$DATE - WARNING: High memory usage: ${MEM_USAGE}%" >> $LOG_FILE
fi
EOF

chmod +x /usr/local/bin/performance-monitor.sh

# Add to crontab for monitoring
echo "*/5 * * * * /usr/local/bin/performance-monitor.sh" >> /etc/crontab

# 11. Restart services
print_status "Restarting services with optimizations..."
systemctl restart redis-server
systemctl restart nginx
systemctl daemon-reload

# 12. Test hardware acceleration
print_status "Testing hardware acceleration..."

# Test FFmpeg with hardware acceleration
if command -v nvidia-smi &> /dev/null; then
    print_status "Testing NVIDIA hardware acceleration..."
    ffmpeg -f lavfi -i testsrc=duration=1:size=320x240:rate=1 -c:v h264_nvenc -f null - 2>/dev/null && echo "✅ NVIDIA acceleration working" || echo "❌ NVIDIA acceleration failed"
fi

if command -v vainfo &> /dev/null; then
    print_status "Testing VA-API hardware acceleration..."
    vainfo 2>/dev/null && echo "✅ VA-API acceleration available" || echo "❌ VA-API acceleration not available"
fi

# 13. Create performance report
print_status "Generating performance report..."

cat > /var/log/performance-setup-report.txt << EOF
P2Convert Performance Setup Report
==================================
Date: $(date)
Hostname: $(hostname)

System Information:
- CPU: $(lscpu | grep "Model name" | cut -d: -f2 | xargs)
- Cores: $(nproc)
- Memory: $(free -h | grep Mem | awk '{print $2}')
- Disk: $(df -h / | tail -1 | awk '{print $2}')

Hardware Acceleration:
- NVIDIA: $(command -v nvidia-smi &> /dev/null && echo "Available" || echo "Not available")
- Intel QSV: $(command -v vainfo &> /dev/null && echo "Available" || echo "Not available")
- VA-API: $(command -v vainfo &> /dev/null && echo "Available" || echo "Not available")

Optimizations Applied:
- RAM disk: 4GB at /tmp/videoconv
- CPU governor: performance
- Redis: 1GB memory limit, LRU eviction
- Nginx: worker processes auto, 4096 connections
- System limits: optimized for high load

Performance Monitoring:
- Script: /usr/local/bin/performance-monitor.sh
- Log: /var/log/performance-monitor.log
- Frequency: Every 5 minutes

Next Steps:
1. Monitor performance logs
2. Adjust settings based on load
3. Test video conversion performance
4. Optimize queue settings if needed
EOF

print_status "✅ Performance setup completed successfully!"

echo ""
print_status "Performance optimizations applied:"
echo "  - RAM disk: 4GB at /tmp/videoconv"
echo "  - CPU governor: performance mode"
echo "  - Redis: 1GB memory limit with LRU"
echo "  - Nginx: optimized worker processes"
echo "  - Hardware acceleration: configured"
echo "  - Performance monitoring: active"
echo ""
print_warning "IMPORTANT:"
echo "1. Reboot the system to apply all optimizations"
echo "2. Monitor /var/log/performance-monitor.log"
echo "3. Test video conversion performance"
echo "4. Adjust settings based on actual load"
echo ""
print_status "Performance setup is complete! ⚡"
