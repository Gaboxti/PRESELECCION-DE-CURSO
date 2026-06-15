const express = require('express');
const router = express.Router();
const db = require('../db');

// =====================================================
// OBTENER TODOS LOS ESTUDIANTES
// =====================================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT id, carnet, nombre, email, telefono, edad, semestre, rol, 
                   (SELECT COUNT(*) FROM preselecciones WHERE estudiante_id = estudiantes.id) as total_preselecciones
            FROM estudiantes 
            ORDER BY id DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// OBTENER ESTUDIANTE POR ID
// =====================================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(`
            SELECT id, carnet, nombre, email, telefono, edad, semestre, rol 
            FROM estudiantes WHERE id = ?
        `, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// OBTENER ESTUDIANTE POR CARNET
// =====================================================
router.get('/carnet/:carnet', async (req, res) => {
    try {
        const { carnet } = req.params;
        const [rows] = await db.query(`
            SELECT id, carnet, nombre, email, telefono, edad, semestre, rol 
            FROM estudiantes WHERE carnet = ?
        `, [carnet]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// REGISTRAR NUEVO ESTUDIANTE
// =====================================================
router.post('/', async (req, res) => {
    try {
        const { carnet, nombre, email, telefono, edad, semestre, password } = req.body;
        
        // Verificar si ya existe el carnet
        const [existe] = await db.query('SELECT id FROM estudiantes WHERE carnet = ?', [carnet]);
        if (existe.length > 0) {
            return res.status(400).json({ error: 'Ya existe un estudiante con este carnet' });
        }
        
        // Verificar si ya existe el email
        const [existeEmail] = await db.query('SELECT id FROM estudiantes WHERE email = ?', [email]);
        if (existeEmail.length > 0) {
            return res.status(400).json({ error: 'Ya existe un estudiante con este email' });
        }
        
        // Insertar estudiante
        const [result] = await db.query(`
            INSERT INTO estudiantes (carnet, nombre, email, telefono, edad, semestre, password, rol) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'estudiante')
        `, [carnet, nombre, email, telefono, edad, semestre, password]);
        
        res.json({ 
            success: true, 
            message: 'Estudiante registrado exitosamente',
            id: result.insertId 
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ACTUALIZAR ESTUDIANTE
// =====================================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { email, telefono, edad, semestre, password } = req.body;  // ← Eliminado 'nombre'
        
        // Verificar si existe
        const [existe] = await db.query('SELECT id FROM estudiantes WHERE id = ?', [id]);
        if (existe.length === 0) {
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        }
        
        let query = 'UPDATE estudiantes SET email = ?, telefono = ?, edad = ?, semestre = ?';
        let params = [email, telefono, edad, semestre];
        
        if (password && password.trim() !== '') {
            query += ', password = ?';
            params.push(password);
        }
        
        query += ' WHERE id = ?';
        params.push(id);
        
        await db.query(query, params);
        
        res.json({ success: true, message: 'Perfil actualizado exitosamente' });
        
    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ELIMINAR ESTUDIANTE
// =====================================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [existe] = await db.query('SELECT id FROM estudiantes WHERE id = ?', [id]);
        if (existe.length === 0) {
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        }
        
        await db.query('DELETE FROM estudiantes WHERE id = ?', [id]);
        
        res.json({ success: true, message: 'Estudiante eliminado exitosamente' });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// OBTENER PRESELECCIONES DE UN ESTUDIANTE
// =====================================================
router.get('/:id/preselecciones', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await db.query(`
            SELECT p.id, p.periodo, p.fecha, 
                   m.id as materia_id, m.codigo, m.nombre, m.uc, m.semestre as materia_semestre
            FROM preselecciones p
            JOIN materias m ON p.materia_id = m.id
            WHERE p.estudiante_id = ?
            ORDER BY p.fecha DESC
        `, [id]);
        
        res.json(rows);
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ESTADÍSTICAS GENERALES
// =====================================================
router.get('/stats/all', async (req, res) => {
    try {
        const [total] = await db.query('SELECT COUNT(*) as total FROM estudiantes');
        const [porSemestre] = await db.query('SELECT semestre, COUNT(*) as total FROM estudiantes GROUP BY semestre ORDER BY semestre');
        const [activos] = await db.query('SELECT COUNT(*) as con_preselecciones FROM estudiantes WHERE id IN (SELECT DISTINCT estudiante_id FROM preselecciones)');
        
        res.json({
            total: total[0].total,
            porSemestre: porSemestre,
            conPreselecciones: activos[0].con_preselecciones
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
