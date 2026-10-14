# NexusCon - Event Booking System

NexusCon is a full-stack event booking website for anime conventions and esports tournaments (Valorant, Free Fire). Users can browse events, book tickets and get a QR ticket by email. Admins can manage events and bookings.

## Live Demo
https://project-1-vieq.onrender.com/index.html

Note: the site is on a free plan, so the first load can take up to a minute.

## Features
- User registration and login (JWT authentication)
- Admin event management (create, edit, delete, poster upload)
- Ticket booking and cancellation (Standard and VIP)
- Search, category filters and pagination
- Profile page with My Bookings
- QR ticket and public ticket verification page
- Email notifications (Brevo)
- In-app notifications
- Admin dashboard and bookings view
- Responsive design for mobile

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: MySQL (Aiven)
- File upload: Multer
- Email: Brevo
- Hosting: Render

## Project Structure
- backend/ - Express server, routes, middleware, database config
- frontend/ - HTML, CSS and JS pages
- database/ - schema.sql

## Run Locally
1. Clone the repo
2. Go to the backend folder: cd backend
3. Install packages: npm install
4. Create a .env file in the backend folder (see variables below)
5. Start the server: npm run dev
6. Open http://localhost:5000/index.html

## Environment Variables
Create backend/.env with these keys (add your own values):

    DB_HOST=
    DB_PORT=
    DB_USER=
    DB_PASSWORD=
    DB_NAME=
    DB_SSL=
    JWT_SECRET=
    TZ=Asia/Kolkata

Also add the Brevo email keys, using the same names as in your backend code.

## Deployment
The app runs as a single Render web service (root directory: backend) where Express also serves the frontend. The database is hosted on Aiven MySQL.

## Author
Your Name - SkillOrbit Web Development Capstone Project