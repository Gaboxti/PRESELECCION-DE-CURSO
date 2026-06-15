const express = require('express');
const router = express.Router();
const db = require('../db');

// Obtener todas las materias
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM materias ORDER BY semestre, codigo');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener materias por semestre
router.get('/semestre/:semestre', async (req, res) => {
    try {
        const { semestre } = req.params;
        const [rows] = await db.query('SELECT * FROM materias WHERE semestre = ? ORDER BY codigo', [semestre]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener una materia por código
router.get('/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        const [rows] = await db.query('SELECT * FROM materias WHERE codigo = ?', [codigo]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Materia no encontrada' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener todos los semestres disponibles
router.get('/semestres/all', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT DISTINCT semestre FROM materias ORDER BY semestre');
        const semestres = rows.map(row => row.semestre);
        res.json(semestres);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Contar materias por semestre
router.get('/stats/count', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT semestre, COUNT(*) as total FROM materias GROUP BY semestre ORDER BY semestre');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
