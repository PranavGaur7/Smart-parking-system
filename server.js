const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const cors = require('cors')
const app = express();
const PORT = 3000;
let isCarEntering = false;

app.use(cors())
// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));
require('dotenv').config();
// Arduino Serial Communication Setup
const serialPort = new SerialPort({
    path: 'COM3',
    baudRate: 9600
});

const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

// Handle serial port errors
serialPort.on('error', (err) => {
    console.error('Serial port error:', err);
});

serialPort.on('open', () => {
    console.log('Serial port opened');
    // Wait a moment for Arduino to initialize
    setTimeout(() => {
        updateArduinoSlotCount();
    }, 2000);
});
// Listen for data from Arduino
parser.on('data', (data) => {
    console.log('Data from Arduino:', data);

    if (data.includes('CAR_DETECTED_ENTRY')) {
        console.log('Car detected at entry. Waiting for user input...');
        isCarEntering = true;
    } else if (data.includes('CAR_PASSED_ENTRY')) {
        console.log('Car has passed through the entry gate.');
        isCarEntering = false;
    } else if (data.includes('CAR_DETECTED_EXIT') && !isCarEntering) {
        console.log('Car detected at exit. Opening gate...');
        serialPort.write('OPEN_GATE\n');

        // Increase available slots
        parkingSystem.availableSlots++;

        // Update Arduino with new slot count
        updateArduinoSlotCount();
    } else if (data.includes('CAR_PASSED_EXIT')) {
        console.log('Car has passed through the exit gate.');
        serialPort.write('CLOSE_GATE\n');
    }
    else if (data.includes('CAR_DETECTED_EXIT')) {
        console.log('Car detected at exit. Opening gate...');
        // Always open gate for exit, regardless of slot count
        serialPort.write('OPEN_GATE\n');

        // Only increment available slots if not already at maximum
        if (parkingSystem.availableSlots < parkingSystem.totalSlots) {
            parkingSystem.availableSlots++;
            updateArduinoSlotCount();
        }
    }
});


// Parking System State
const parkingSystem = {
    totalSlots: 4,
    availableSlots: 4,
    bookings: [],
    otps: {}
};

function updateArduinoSlotCount() {
    serialPort.write(`UPDATE_SLOTS:${parkingSystem.availableSlots}\n`);
}
// Email Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS 
    }
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/gate', (req, res) => {
    res.sendFile(__dirname + '/public/gate.html');
});

// API Endpoints
app.get('/api/slots', (req, res) => {
    res.json({ availableSlots: parkingSystem.availableSlots });
});

app.post('/api/book', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    if (parkingSystem.availableSlots <= 0) {
        return res.status(400).json({ success: false, message: 'No slots available' });
    }

    // Generate OTP
    const otp = generateOTP();

    // Store OTP
    parkingSystem.otps[email] = {
        otp,
        timestamp: Date.now(),
        used: false
    };

    // Reserve a slot and DECREMENT COUNT IMMEDIATELY for prebooking
    parkingSystem.availableSlots--;

    // Update Arduino with new slot count
    updateArduinoSlotCount();

    parkingSystem.bookings.push({
        email,
        timestamp: Date.now(),
        status: 'booked'
    });

    // Send OTP via email
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your Parking Slot Booking OTP',
        text: `Your OTP for parking slot booking is: ${otp}. This OTP is valid for 30 minutes.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });

    // Return OTP in response (for demo purposes)
    res.json({ success: true, message: 'Booking successful', otp });
});

app.get('/api/check-availability', (req, res) => {
    res.json({ available: parkingSystem.availableSlots > 0 });
});

app.post('/api/verify-otp', (req, res) => {
    const { otp } = req.body;

    if (!otp) {
        return res.status(400).json({ valid: false, message: 'OTP is required' });
    }

    // Check if OTP exists and is valid
    let validOtp = false;
    let userEmail = '';

    for (const email in parkingSystem.otps) {
        const otpData = parkingSystem.otps[email];

        if (otpData.otp === otp && !otpData.used) {
            // Check if OTP is not expired (30 minutes validity)
            const currentTime = Date.now();
            const otpTime = otpData.timestamp;
            const timeDiff = (currentTime - otpTime) / (1000 * 60); // in minutes

            if (timeDiff <= 30) {
                validOtp = true;
                userEmail = email;
                break;
            }
        }
    }

    if (validOtp) {
        // Mark OTP as used
        parkingSystem.otps[userEmail].used = true;

        // Update booking status
        const booking = parkingSystem.bookings.find(b => b.email === userEmail && b.status === 'booked');
        if (booking) {
            booking.status = 'confirmed';
        }

        return res.json({ valid: true, message: 'OTP verified successfully' });
    } else {
        serialPort.write('INVALID_OTP\n');
        return res.json({ valid: false, message: 'Invalid or expired OTP' });
    }
});

app.post('/api/open-gate', (req, res) => {
    const { prebooked } = req.body;

    if (prebooked) {
        // Send command to Arduino to open gate
        serialPort.write('PREBOOKED_ENTRY\n');
        serialPort.write('OPEN_GATE\n');


        isCarEntering = true;  // Set the entering state

        res.json({ success: true, message: 'Gate opening command sent' });
    } else {
        if (parkingSystem.availableSlots > 0) {
            // Decrement available slots
            parkingSystem.availableSlots--;

            // Send command to Arduino to open gate
            serialPort.write('OPEN_GATE\n');

            // Update Arduino with new slot count
            updateArduinoSlotCount();

            isCarEntering = true;

            res.json({ success: true, message: 'Gate opening command sent' });
        } else {
            res.status(400).json({ success: false, message: 'No slots available' });
        }
    }
});

// Helper Functions
function generateOTP() {
    // Generate a 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Cleanup on server shutdown
process.on('SIGINT', () => {
    console.log('Closing serial port and shutting down server...');
    serialPort.close();
    process.exit();
});
