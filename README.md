# Smart Parking System Using Arduino UNO

## Overview
The Smart Parking System is an IoT-based solution designed to automate parking management, reduce congestion, and improve user experience. It integrates hardware components (Arduino UNO, IR sensors, servo motor, LCD display) with software technologies (Node.js server, web interfaces) to provide real-time parking slot availability, pre-booking functionality, and automated gate control.

## Features
- **Real-Time Slot Availability:** Displays available parking slots on an LCD and web interface.
- **Pre-Booking:** Allows users to reserve parking slots via a web interface.
- **Automated Entry/Exit:** Uses IR sensors and a servo motor for gate control.
- **OTP Verification:** Ensures secure access for pre-booked users.
- **User-Friendly Web Interfaces:** Includes booking and gate access portals.

## System Components

### Hardware
- **Arduino UNO:** Central controller for sensors and actuators.
- **IR Sensors:**
  - **Entry Sensor:** Detects incoming vehicles.
  - **Exit Sensor:** Confirms vehicle departure.
- **Servo Motor:** Controls gate movement (open/close).
- **LCD Display with I2C Module:** Shows system status and slot availability.

### Software
- **Arduino Firmware:** Manages hardware operations and communicates with the server.
- **Node.js Server:**
  - Handles slot management, booking requests, and OTP generation/verification.
  - Communicates with Arduino via serial connection.
- **Web Interfaces:**
  - **Booking Portal (`index.html`)**: Enables users to check availability and book slots.
  - **Gate Access Portal (`gate.html`)**: Facilitates entry using OTP or regular parking.

## Setup Instructions

### Hardware Setup
Connect components as follows:

- **IR Sensors:**
  - Entry sensor to digital pin 2.
  - Exit sensor to digital pin 3.
- **LCD Display:**
  - SDA to A4, SCL to A5 on Arduino UNO.
  - Set I2C address to `0x27`.
- **Servo Motor:**
  - Signal pin to digital pin 4.
  - Power supply via Arduino’s 5V or external source for larger motors.
- Connect the Arduino UNO to the computer via USB for power and serial communication.

### Software Setup

#### Prerequisites
- Install Node.js (v16 or higher).
- Install Arduino IDE (for uploading firmware).
- Install required Node.js packages:

```bash
npm install express body-parser nodemailer serialport cors dotenv
```

#### Steps
1. Clone the repository:

```bash
git clone <repository-url>
cd smart-parking-system
```

2. Upload the Arduino firmware:

   - Open `arduino_code.ino` in Arduino IDE.
   - Select the appropriate COM port and board type (Arduino UNO).
   - Click "Upload."

3. Configure environment variables:

   - Create a `.env` file in the root directory with:

   ```text
   EMAIL_USER=<your-email>
   EMAIL_PASS=<your-email-password>
   ```

4. Start the Node.js server:

```bash
node server.js
```

5. Access the web interfaces:
   - **Booking Portal:** [http://localhost:3000/](http://localhost:3000/)
     ![image](https://github.com/user-attachments/assets/84401e9c-2d07-47b6-abaa-813b2d20b84d)

   - **Gate Access Portal:** [http://localhost:3000/gate](http://localhost:3000/gate)
      ![image](https://github.com/user-attachments/assets/86a38b66-cabc-463d-b95e-0298504c46a3)
      ![image](https://github.com/user-attachments/assets/b866a348-701d-4e67-9c43-d123bfe5ddbf)

## Running Instructions

### Regular Parking Entry
1. Drive up to the entry gate; IR sensor detects your vehicle.
2. If slots are available:
   - Gate opens automatically; LCD displays updated slot count.
3. If slots are full:
   - Access is denied; LCD shows "Parking Full."

### Pre-Booked Parking Entry
1. Visit the booking portal (`index.html`) and reserve a slot using your email.
2. Receive an OTP via email.
3. At the entry gate:
   - Select "I have prebooked" on the gate interface (`gate.html`).
   - Enter your OTP; gate opens upon verification.

### Exit Process
1. Drive up to the exit gate; IR sensor detects your vehicle.
2. Gate opens automatically; LCD displays updated slot count.

## Visuals

### System Architecture Diagram
![image](https://github.com/user-attachments/assets/f9e2c709-b3bc-43a3-b379-51b2f7331618)

### Hardware Setup
![image](https://github.com/user-attachments/assets/40665dc5-4998-4800-95c9-ccc4af50614e)

### Booking Portal Interface
![image](https://github.com/user-attachments/assets/84401e9c-2d07-47b6-abaa-813b2d20b84d)

### Gate Access Interface
![image](https://github.com/user-attachments/assets/86a38b66-cabc-463d-b95e-0298504c46a3)
![image](https://github.com/user-attachments/assets/b866a348-701d-4e67-9c43-d123bfe5ddbf)


## Future Enhancements
- Mobile app integration for booking and notifications.
- Payment gateway for online transactions.
- Support for multiple entry/exit points.
- License plate recognition using cameras.
