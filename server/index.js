import express from 'express';
import cors from 'cors';
import { extractSchemaFromConnection } from './db-extractor.js';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'ChartDB API Server is running' });
});

// Extract schema from connection string
app.post('/api/extract-schema', async (req, res) => {
    try {
        const { connectionString } = req.body;

        if (!connectionString) {
            return res.status(400).json({
                error: 'Connection string is required',
            });
        }

        console.log('Attempting to extract schema from connection string...');
        const result = await extractSchemaFromConnection(connectionString);
        console.log('Schema extracted successfully!');
        res.json(result);
    } catch (error) {
        console.error('Schema extraction error:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({
            error: error.message || 'Failed to extract schema',
            details: error.code || error.stack,
        });
    }
});

app.listen(PORT, () => {
    console.log(`ChartDB API Server running on http://localhost:${PORT}`);
});
