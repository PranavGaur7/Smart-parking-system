#include <LiquidCrystal_I2C.h>
#include <Wire.h>
#include <Servo.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);
Servo myservo;

// Pin definitions
int IR1 = 2;  // Entry sensor
int IR2 = 3;  // Exit sensor
bool isCarEntering = false;
// Parking system variables
int Slot = 0;  // Will be updated from server
int flag1 = 0;
int flag2 = 0;
bool gateCommandReceived = false;
bool isPrebookedEntry = false;
unsigned long lastIR1DetectionTime = 0;
const unsigned long debounceDelay = 500; // 500ms debounce
void setup() {
  Serial.begin(9600);

  lcd.init();
  lcd.backlight();

  pinMode(IR1, INPUT);
  pinMode(IR2, INPUT);

  myservo.attach(4);
  myservo.write(100);  // Initial position - gate closed

  lcd.setCursor(0, 0);
  lcd.print("     ARDUINO    ");
  lcd.setCursor(0, 1);
  lcd.print(" PARKING SYSTEM ");
  delay(2000);
  lcd.clear();

  // Show idle state
  displayIdleState();
}
void loop() {
  // Check for commands from Node.js server
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command == "OPEN_GATE") {
      openGate();
      gateCommandReceived = true;
    } else if (command == "CLOSE_GATE") {
      closeGate();
    } else if (command.startsWith("UPDATE_SLOTS:")) {
      // Extract slot count from command
      String slotCountStr = command.substring(13);
      Slot = slotCountStr.toInt();

      // Update display with new slot count
      displayIdleState();
    } else if (command == "INVALID_OTP") {
      // Display invalid OTP message
      displayInvalidOTP();
      
      // Reset flags
      flag1 = 0;
      gateCommandReceived = false;
      isCarEntering = false;
    } else if (command == "PREBOOKED_ENTRY") {
      // openGate();
      gateCommandReceived = true;
      isPrebookedEntry = true;
    }
    
  }

  // Entry detection - IR1 (first sensor)
  if (digitalRead(IR1) == LOW && flag1 == 0) {
    // Car detected at entry
    Serial.println("CAR_DETECTED_ENTRY");

    if (Slot > 0) {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("  CAR DETECTED  ");
      lcd.setCursor(0, 1);
      lcd.print("  PLEASE WAIT   ");

      flag1 = 1;
      isCarEntering = true;
    }
    else if(Slot==0 && isPrebookedEntry){
      lcd.setCursor(0, 0);
      lcd.print("  PARKING FULL  ");
      lcd.setCursor(0, 1);
      lcd.print("  VERIFY PREBOOK   ");
      flag1 = 1;
      isCarEntering = true;
    }
     else {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("    SORRY :(    ");
      lcd.setCursor(0, 1);
      lcd.print("  Parking Full  ");

      delay(3000);         // Show the message for 3 seconds
      displayIdleState();  // Return to idle state
    }
  }

  // Exit detection - IR2 (second sensor)
  if (digitalRead(IR2) == LOW && flag2 == 0 && !isCarEntering) {
    // Car detected at exit - should ALWAYS work regardless of slot count
    Serial.println("CAR_DETECTED_EXIT");

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("  EXITING CAR   ");
    lcd.setCursor(0, 1);
    lcd.print("  OPENING GATE  ");

    // Open gate unconditionally for exiting cars
    openGate();

    flag2 = 1;
  }

  // Car has passed through entry
  if (flag1 == 1 && digitalRead(IR2) == LOW && gateCommandReceived) {
    isPrebookedEntry = false;
    Serial.println("CAR_PASSED_ENTRY");

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("  CAR ENTERED   ");
    lcd.setCursor(0, 1);
    lcd.print("SLOTS LEFT: ");
    lcd.print(Slot);

    delay(1000);
    closeGate();

    flag1 = 0;
    gateCommandReceived = false;
    isCarEntering = false;

    // Return to idle state after a few seconds
    delay(3000);
    displayIdleState();
  }

  // Car has passed through exit
  if (flag2 == 1 && digitalRead(IR1) == LOW) {
    Serial.println("CAR_PASSED_EXIT");

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("   THANK YOU    ");
    lcd.setCursor(0, 1);
    lcd.print("  VISIT AGAIN   ");

    delay(1000);
    closeGate();

    flag1 = 0;
    flag2 = 0;
    isCarEntering = false;
    isPrebookedEntry = false;
    gateCommandReceived = false;

    // Return to idle state after a few seconds
    delay(3000);
    displayIdleState();
  }

  // If no activity, display idle state
  if (flag1 == 0 && flag2 == 0 && !gateCommandReceived) {
    // Only update the display if it's been changed
    static unsigned long lastDisplayUpdate = 0;
    if (millis() - lastDisplayUpdate > 5000) {  // Update every 5 seconds
      displayIdleState();
      lastDisplayUpdate = millis();
    }
  }
}

void openGate() {
  myservo.write(0);  // Open position
}

void closeGate() {
  myservo.write(100);  // Closed position
}

void displayIdleState() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(" PARKING SYSTEM ");
  lcd.setCursor(0, 1);
  lcd.print("SLOTS LEFT: ");
  lcd.print(Slot);
}

void displayInvalidOTP() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("  INVALID OTP   ");
  lcd.setCursor(0, 1);
  lcd.print("   TRY AGAIN    ");
  
  // Show message for 3 seconds
  delay(3000);
  
  // Return to idle state
  displayIdleState();
}