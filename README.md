# AEC Media Hub & Cinematic Slideshow System

A modern, full-stack project repository and digital showcase system designed for Architecture, Engineering, and Construction firms. This system allows for centralized project management, high-resolution media organization, and cinematic "Kiosk Mode" presentations.

## Tech Stack
- **Frontend:** Next.js, Tailwind CSS, Framer Motion, Lucide Icons
- **Backend:** Node.js, Express.js, Multer, Sharp (Image Processing)
- **Database:** SQLite (Local-first, zero-cost)

## Features
- **Project Repository:** Comprehensive metadata tracking (Manager, Value, Client, Partner).
- **In-Place Editing:** Real-time specification updates without page reloads.
- **Media Hub:** Automated image optimization (WebP conversion) and thumbnails.
- **Cinematic Slideshow:** Kiosk-ready display with Focus Mode and custom transitions.
- **Activity Logs:** Real-time tracking of creations, deletions, and media updates.
- **System Monitoring:** Live backend health status in the sidebar.

## Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/your-username/aec-media-hub.git
cd SIWES-PROJECT
```

### 2. Setup Backend (Server)
```bash
cd backend
npm install
# Create the uploads folder
mkdir uploads
mkdir uploads/temp
# Start the server
npm run dev
```
### 3. Setup Frontend (Client)
```bash
cd ../frontend
npm install
# Start the application
npm run dev
```
The application will be available at http://localhost:3000

## Project Structure
* /frontend: Next.js application (Presentation Tier)
* /server: Node.js API & Image Processing (Logic Tier)
* /server/database.db: SQLite database (Data Tier)
* /server/uploads: Physical storage for project photography

## 👨‍💻 Author
OLADEINDE FRANKLYN OLUWAKOMIYO
