-- ==========================================================
-- Project Name: NexusCon Database Setup (Safe Re-run Script)
-- ==========================================================

CREATE DATABASE IF NOT EXISTS nexuscon;
USE nexuscon;

-- Drop tables in reverse order of foreign keys if they exist (so we can re-run safely)
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS users;

-- Step 1: Create Users Table (Parent Table)
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create Events Table
CREATE TABLE events (
  event_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  category ENUM('Anime Con', 'Valorant', 'Free Fire') NOT NULL,
  description TEXT,
  venue VARCHAR(200),
  event_date DATETIME NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  total_seats INT NOT NULL,
  available_seats INT NOT NULL,
  poster_url VARCHAR(255),
  status ENUM('upcoming', 'live', 'closed') DEFAULT 'upcoming',
  created_by INT,
  FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Step 3: Create Bookings Table
CREATE TABLE bookings (
  booking_id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  event_id INT NOT NULL,
  ticket_type ENUM('General', 'VIP') DEFAULT 'General',
  quantity INT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('confirmed', 'cancelled') DEFAULT 'confirmed',
  booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (event_id) REFERENCES events(event_id)
);

-- Step 4: Create Notifications Table
CREATE TABLE notifications (
  notify_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

SELECT* FROM users;