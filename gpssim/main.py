import gps
import time
import math

import gps.fake

latitude = 35.69
longitude = 50.73
speed = 1
bearing = 0

# Connect to gpsd
session = gps.gps()
gps.fake

while True:
  # Calculate new position based on speed and direction (replace with your preferred movement model)
  distance_traveled = speed * (time.time() / 3600)  # Distance in nautical miles traveled since last update
  new_latitude = latitude + distance_traveled * math.cos(math.radians(bearing))
  new_longitude = longitude + distance_traveled * math.sin(math.radians(bearing))

  # Create a basic NMEA sentence (replace with more comprehensive NMEA data if needed)
  sentence = f"$GPRMC,,,{new_latitude:.4f},{'N'},{new_longitude:.4f},{'E'},1.0,0.0,280424,000.0,0*72"

  # Send the NMEA sentence to gpsd
  session.send(sentence)

  # Update every second (adjust for desired update rate)
  time.sleep(1)
