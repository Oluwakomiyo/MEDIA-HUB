const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const JWT_SECRET = 'your_company_secret_key_123'; // Keep this private
const setupDatabase = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadsDir = path.join(__dirname, 'uploads');
const tempDir = path.join(uploadsDir, 'temp');

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

const upload = multer({ dest: tempDir });

// Initialize Database and Start Server
setupDatabase().then((db) => {
    const isAdmin = (req, res, next) => {
        const token = req.headers['authorization'];
        if (!token) return res.status(401).json({ error: "Access Denied. No token provided." });

        try {
            const verified = jwt.verify(token.split(" ")[1], JWT_SECRET);
            req.user = verified;
            next(); // Token is valid, proceed to the route
        } catch (err) {
            res.status(400).json({ error: "Invalid Token" });
        }
    };

    app.post('/api/auth/login', async (req, res) => {
        const { username, password } = req.body;
        try {
            const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
            if (!user) return res.status(400).json({ error: "User not found" });

            const validPass = await bcrypt.compare(password, user.password_hash);
            if (!validPass) return res.status(400).json({ error: "Invalid password" });

            const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ token, role: user.role });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    const logActivity = async (action, name) => {
        await db.run(
            'INSERT INTO activity_logs (action_type, project_name) VALUES (?, ?)',
            [action, name]
        );
    };

    // 1. Route to create a new project
    app.post('/api/projects', isAdmin, async (req, res) => {
        // Destructure every field from the frontend request
        const {
            name, description, category, location, client_name,
            completion_date, is_featured, is_award_winning, is_landmark, is_recently_completed, is_premium, project_manager,
            project_value, partner, tags
        } = req.body;

        try {
            const result = await db.run(
                `INSERT INTO projects (
                name, description, category, location, client_name, 
                completion_date, is_featured, is_award_winning, is_landmark, is_recently_completed, is_premium, project_manager, 
                project_value, partner, tags
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    name, description, category, location, client_name,
                    completion_date, is_featured ? 1 : 0, is_award_winning ? 1 : 0, is_landmark ? 1 : 0, is_recently_completed ? 1 : 0, is_premium ? 1 : 0, project_manager,
                    project_value, partner, tags
                ]
            );
            await logActivity('PROJECT_CREATE', name);
            res.status(201).json({ id: result.lastID });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // Route to update project details
    app.put('/api/projects/:id', isAdmin, async (req, res) => {
        const {
            name, description, category, location, client_name,
            completion_date, is_featured, is_award_winning, is_landmark, is_recently_completed, is_premium, project_manager,
            project_value, partner, tags
        } = req.body;

        const projectId = req.params.id;

        try {
            await db.run(
                `UPDATE projects SET 
                name = ?, description = ?, category = ?, location = ?, 
                client_name = ?, completion_date = ?, is_featured = ?, is_award_winning = ?, is_landmark = ?, is_recently_completed = ?, is_premium = ?,
                project_manager = ?, project_value = ?, partner = ?, tags = ?
             WHERE id = ?`,
                [
                    name, description, category, location, client_name,
                    completion_date, is_featured ? 1 : 0, is_award_winning ? 1 : 0, is_landmark ? 1 : 0, is_recently_completed ? 1 : 0, is_premium ? 1 : 0, project_manager,
                    project_value, partner, tags, projectId
                ]
            );
            res.json({ message: "Project updated successfully" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // 2. Route to upload and optimize images for a project
    app.post('/api/projects/:id/upload', isAdmin, upload.array('images', 20), async (req, res) => {
        const projectId = req.params.id;
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).send('No files uploaded.');
        }

        try {
            const project = await db.get('SELECT name FROM projects WHERE id = ?', [req.params.id]);
            if (!project) {
                return res.status(404).json({
                    error: 'Project not found'
                });
            }

            const uploadPromises = files.map(async (file) => {
                const baseName = path.parse(file.originalname).name
                    .replace(/[^a-zA-Z0-9_-]/g, '_');

                const fileName =
                    `${Date.now()}-${crypto.randomUUID()}-${baseName}.jpg`;
                const fullPath = path.join(__dirname, 'uploads', fileName);
                const thumbPath = path.join(__dirname, 'uploads', `thumb_${fileName}`);

                // USE SHARP TO OPTIMIZE:
                // High-res version (Max 1920px width for performance)
                try {
                    await sharp(file.path)
                        .resize(1920, 1080, {
                            fit: 'inside',
                            withoutEnlargement: true
                        })
                        .jpeg({
                            quality: 80,
                            mozjpeg: true
                        })
                        .toFile(fullPath);

                    await sharp(file.path)
                        .resize(400, 300, {
                            fit: 'inside',
                            withoutEnlargement: true
                        })
                        .jpeg({
                            quality: 80,
                            mozjpeg: true
                        })
                        .toFile(thumbPath);

                } finally {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                }

                // Save the file path to the database
                return db.run(
                    `INSERT INTO images (project_id, file_path) VALUES (?, ?)`,
                    [projectId, fileName]
                );
            });

            await Promise.all(uploadPromises);
            await logActivity(
                'IMAGE_ADD',
                `${files.length} image(s) uploaded to ${project.name}`
            );
            res.status(201).json({
                success: true,
                uploaded: files.length,
                projectId,
                message: 'Images uploaded and optimized successfully!'
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Image processing failed." });
        }
    });

    // Route to delete a single image
    app.delete('/api/images/:id', isAdmin, async (req, res) => {
        const imageId = req.params.id;

        try {
            const image = await db.get(
                `
            SELECT
                images.file_path,
                projects.name AS project_name
            FROM images
            JOIN projects
                ON projects.id = images.project_id
            WHERE images.id = ?
            `,
                [imageId]
            );

            if (!image) {
                return res.status(404).json({
                    error: "Image not found"
                });
            }

            const fullPath = path.join(
                __dirname,
                'uploads',
                image.file_path
            );

            const thumbPath = path.join(
                __dirname,
                'uploads',
                `thumb_${image.file_path}`
            );

            if (fs.existsSync(fullPath))
                fs.unlinkSync(fullPath);

            if (fs.existsSync(thumbPath))
                fs.unlinkSync(thumbPath);

            await db.run(
                'DELETE FROM images WHERE id = ?',
                [imageId]
            );

            await logActivity(
                'IMAGE_DELETE',
                `Image removed from ${image.project_name}`
            );

            res.json({
                message: 'Image deleted successfully'
            });
        } catch (err) {
            console.error(err);

            res.status(500).json({
                error: err.message
            });
        }
    });

    // New Route: Get a single project with ALL its images
    app.get('/api/projects/:id', async (req, res) => {
        try {
            // Use * to ensure ALL columns (Manager, Value, Partner, etc.) are fetched
            const project = await db.get('SELECT * FROM projects WHERE id = ?', [req.params.id]);
            const images = await db.all('SELECT * FROM images WHERE project_id = ?', [req.params.id]);

            if (!project) {
                return res.status(404).json({ error: "Project not found" });
            }

            res.json({ ...project, images });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Route to delete a project and all its images
    app.delete('/api/projects/:id', isAdmin, async (req, res) => {
        const projectId = req.params.id;

        try {
            // Get project details for activity log
            const project = await db.get(
                'SELECT name FROM projects WHERE id = ?',
                [projectId]
            );

            if (!project) {
                return res.status(404).json({
                    error: 'Project not found'
                });
            }

            // 1. Get all image filenames for this project
            const images = await db.all('SELECT file_path FROM images WHERE project_id = ?', [projectId]);


            // 3. Delete from database (Images first, then Project)
            await db.exec('BEGIN TRANSACTION');

            try {
                await db.run(
                    'DELETE FROM images WHERE project_id = ?',
                    [projectId]
                );

                await db.run(
                    'DELETE FROM projects WHERE id = ?',
                    [projectId]
                );

                await db.run(
                    'INSERT INTO activity_logs (action_type, project_name) VALUES (?, ?)',
                    ['PROJECT_DELETE', project.name]
                );

                await db.exec('COMMIT');

                // 2. Delete physical files from the hard drive
                images.forEach(img => {
                    const fullPath = path.join(__dirname, 'uploads', img.file_path);
                    const thumbPath = path.join(__dirname, 'uploads', `thumb_${img.file_path}`);

                    try {
                        if (fs.existsSync(fullPath)) {
                            fs.unlinkSync(fullPath);
                        }

                        if (fs.existsSync(thumbPath)) {
                            fs.unlinkSync(thumbPath);
                        }
                    } catch (err) {
                        console.error('Failed deleting image files:', err);
                    }
                });

            } catch (err) {
                await db.exec('ROLLBACK');
                throw err;
            }

            res.json({ message: "Project and associated files deleted successfully" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // 3. Route to get all projects (for our gallery)
    app.get('/api/projects', async (req, res) => {
        const projects = await db.all(`
        SELECT
    p.*,
    (
        SELECT file_path
        FROM images
        WHERE project_id = p.id
        ORDER BY id ASC
        LIMIT 1
    ) AS cover_image
FROM projects p
    `);
        res.json(projects);
    });

    // Route for the Slideshow: Gets all images from all projects
    app.get('/api/slideshow', async (req, res) => {
        const { category, distinction } = req.query;

        try {
            // We use INNER JOIN to ensure we ONLY get images that actually belong to projects
            let query = `
            SELECT i.file_path, p.id as project_id, p.name as project_name, p.category, p.location,
            p.is_featured, p.is_award_winning, p.is_landmark, p.is_recently_completed, p.is_premium
            FROM images i
            INNER JOIN projects p ON i.project_id = p.id
        `;

            let params = [];
            let conditions = [];

            // Distinction Filtering
            if (distinction === 'featured') conditions.push("p.is_featured = 1");
            else if (distinction === 'award') conditions.push("p.is_award_winning = 1");
            else if (distinction === 'landmark') conditions.push("p.is_landmark = 1");
            else if (distinction === 'recent') conditions.push("p.is_recently_completed = 1");
            else if (distinction === 'premium') conditions.push("p.is_premium = 1");

            // Category Filtering
            // Ensure "All" actually pulls everything, and specific categories pull ONLY their own
            if (category && category !== 'All') {
                conditions.push("p.category = ?");
                params.push(category);
            }

            if (conditions.length > 0) {
                query += " WHERE " + conditions.join(" AND ");
            }

            query += ` ORDER BY i.id DESC`;

            const images = await db.all(query, params);

            // Final Safety Check: If no images found, return an empty array []
            res.json(images || []);

        } catch (err) {
            console.error("Slideshow API Error:", err);
            res.status(500).json({ error: "Failed to fetch slideshow data" });
        }
    });

    // --- DASHBOARD STATS API ---
    app.get('/api/stats', async (req, res) => {
        try {
            // 1. Get Totals from Database
            const projectCount = await db.get('SELECT COUNT(*) as count FROM projects');
            const assetCount = await db.get('SELECT COUNT(*) as count FROM images');
            const featuredCount = await db.get('SELECT COUNT(*) as count FROM projects WHERE is_featured = 1');

            // 2. Calculate Real Storage Usage (Scanning the uploads folder)
            const uploadsDir = path.join(__dirname, 'uploads');
            let totalSizeBytes = 0;

            if (fs.existsSync(uploadsDir)) {
                const files = fs.readdirSync(uploadsDir);
                files.forEach(file => {
                    const stats = fs.statSync(path.join(uploadsDir, file));
                    if (stats.isFile()) totalSizeBytes += stats.size;
                });
            }

            const logs = await db.all(`SELECT * FROM activity_logs ORDER BY id DESC LIMIT 8`);

            const highlights = await db.all(`
            SELECT p.id, p.name, p.category, p.location,
            (SELECT file_path FROM images WHERE project_id = p.id ORDER BY id ASC LIMIT 1) as thumbnail
            FROM projects p ORDER BY p.id DESC LIMIT 4
        `);

            // Convert bytes to Megabytes for display
            const storageMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);

            // 3. Get Recent Activity (The last 5 projects added)
            const recentActivity = await db.all(`
            SELECT action_type, project_name, timestamp 
            FROM activity_logs 
            ORDER BY id DESC LIMIT 8
        `);

            const categoryStats = await db.all(`
            SELECT category as name, COUNT(*) as count 
            FROM projects 
            GROUP BY category
            ORDER BY count DESC
        `);

            res.json({
                projects: projectCount.count,
                assets: assetCount.count,
                featured: featuredCount.count,
                storage: `${storageMB} MB`,
                activity: recentActivity,
                highlights: highlights,
                categoryData: categoryStats
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // Simple Route to test if it's working
    app.get('/', (req, res) => {
        res.send("Project Management API is running...");
    });

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on ${PORT}`);
    });

    app.use((err, req, res, next) => {
        console.error(err);

        res.status(500).json({
            error: 'Internal Server Error'
        });
    });
});