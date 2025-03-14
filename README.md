# Vigor22
## Setup for local operation
Create and actiate the local environment using conda/miniforge:

conda env create -f environment.yml

conda activate vigor22

To run the cloud API as a single process:

python backend_cloud.py

If you want to use self-hosted OpenStreetMap data, you need to set up fonts and OSM vector data.

Install fonts required for vector tiles:

git clone https://github.com/klokantech/klokantech-gl-fonts fonts

## Raspberry Pi setup
This installation procedure is partly identical to that of https://github.com/jaluebbe/GPSTracker .
The focus of GPSTracker is on the readout of multiple sensors while this repository focuses on basic GPS data and motor control.


Start with a fresh image of the Raspberry Pi OS in the Lite version.
Depending on the type of your Raspberry Pi your may either the 32bit or the 64bit version.
Using the imager for the SD card you could already set up your WiFi credentials, username, hostname and SSH access.
You are free to choose your username except for the name "gpstracker" which will be generated later.
In the following we assume "pi" as username.

### Installation with sudo privileges
These steps are performed under your username with sudo privileges:
```
sudo apt update
sudo apt upgrade -y
sudo apt dist-upgrade -y
sudo apt autoremove -y
sudo apt install chrony gpsd git redis-server python3-pip python3-venv \
hostapd dnsmasq anacron iptables python3-requests iptables -y
sudo systemctl unmask hostapd
sudo systemctl disable hostapd
sudo systemctl disable dnsmasq
sudo useradd -m gpstracker
sudo usermod -a -G i2c,video,gpio gpstracker
sudo passwd gpstracker
```


### GPS setup and test
If a compatible GPS device is attached via USB set these options in /etc/default/gpsd :
```
DEVICES=""
GPSD_OPTIONS="-n"
USBAUTO="true"
```
Or if the GPS device is attached via serial port, set the following parameters in /etc/default/gpsd :
```
DEVICES="/dev/serial0"
GPSD_OPTIONS="-n"
USBAUTO="false"
```

You have to enable the serial port via
```
sudo raspi-config
```
and select "Interface Options" -> "Serial Port" -> "No" -> "Yes" -> "Ok".
The I2C interface needs to be enabled as well to control the motors and other sensors.

Reboot your device with
```
sudo reboot
```
if not done before.

Put the GPS antenna close to a window or outdoors and call cgps (terminate with Ctrl+C).
You should see messages from your device every second or even the coordinates of your location.

### Obtain time from GPS
When the GPS is running, it’s time to setup the retrieval of the time via GPS.
Edit /etc/chrony/chrony.conf and set the following parameters:
```
makestep 1 -1
refclock SHM 0 offset 0.2 refid GPS
```

Restart chrony by calling
```
sudo /etc/init.d/chrony restart
```
and call:
```
chronyc sources
```

In the GPS row, the value Reach should be above zero.
It could take some time, you may recheck later.

### Install vigor22 software
We created a "gpstracker" user with the required privileges.
Now let's switch to this user (to go back to your user, type "exit"):
```
sudo su - gpstracker  # or login as user gpstracker directly
git clone https://github.com/jaluebbe/vigor22.git
cd vigor22
git clone https://github.com/klokantech/klokantech-gl-fonts fonts
python -m venv venv
source venv/bin/activate
pip install -r requirements_raspi.txt
```
Check your Python version by calling:
```
python --version
```
If your version is below 3.10 call:
```
pip install eval_type_backport
```

### Prepare OpenStreetMap offline data
```
docker run -e JAVA_TOOL_OPTIONS="-Xmx10g" -v "$(pwd)/data":/data ghcr.io/onthegomap/planetiler:latest --download --area=europe
```
You need Docker. Do not try this on a Raspberry Pi. It may take more than a day to create
the output.mbtiles even on a powerful machine. You may choose another or a
smaller region (e.g. "germany" or "dach" to include Austria, Germany and Switzerland).
For more information see the
[planetiler documentation](https://github.com/onthegomap/planetiler).
Finally, copy the output.mbtiles to the following location on your Raspberry Pi:
```
/home/gpstracker/osm_offline.mbtiles
```

### Test Python scripts
You are already in the vigor22 folder where you could perform some tests.

First, open a second terminal window where you call
```
redis-cli
```
and enter:
```
subscribe gps motor_status
```
Go back to your first window and start consuming GPS data by calling:
```
./gps_poller.py
```
The script should start without errors and if the GPS has a fix, messages may appear
on the "gps" channel on the Redis server (see the other window).
Prepare to start this script on boot and restart if crashed:
```
sudo cp /home/gpstracker/vigor22/etc/systemd/system/gpspoller.service /etc/systemd/system/
sudo systemctl enable gpspoller.service
```
Instead of "enable" you may also call "disable", "start", "stop" or "restart".
Attention, do not try these steps as "gpstracker" user as it is missing sudo privileges.
Use your personal user e.g. "pi" instead.

Test the motor controller:
```
./motor_controller.py
```
Permanent install:
```
sudo cp /home/gpstracker/vigor22/etc/systemd/system/motor_controller.service /etc/systemd/system/
sudo systemctl enable motor_controller.service
```

Test the vigor22 process:
```
./vigor22_process.py
```
Permanent install:
```
sudo cp /home/gpstracker/vigor22/etc/systemd/system/vigor22_process.service /etc/systemd/system/
sudo systemctl enable vigor22_process.service
```

### Local web API
```
sudo cp /home/gpstracker/vigor22/etc/systemd/system/vigor22_api.service /etc/systemd/system/
sudo systemctl enable vigor22_api.service
sudo cp /home/gpstracker/vigor22/etc/cron.daily/archive_data /etc/cron.daily/
```
You may access the API via [ip or hostname]:8080/docs .

If you would like to create a redirection from port 80 to port 8080,
you should add the following line to /etc/rc.local :
```
/usr/sbin/iptables -A PREROUTING -t nat -i wlan0 -p tcp --dport 80 -j REDIRECT --to-port 8080
```

### WiFi access point
For WiFi access point setup look into the README of https://github.com/jaluebbe/GPSTracker
