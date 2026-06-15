const express = require('express');
const router = express.Router();
const db = require('../db');

// =====================================================
// OBTENER PRESELECCIONES DE UN ESTUDIANTE
// =====================================================
router.get('/estudiante/:estudianteId', async (req, res) => {
    try {
        const { estudianteId } = req.params;
        
        const [rows] = await db.query(
            `SELECT p.id, p.periodo, p.fecha, 
                    m.id as materia_id, m.codigo, m.nombre, m.uc, m.semestre
             FROM preselecciones p
             JOIN materias m ON p.materia_id = m.id
             WHERE p.estudiante_id = ? AND p.periodo = (SELECT valor FROM configuracion_sistema WHERE clave = 'periodo_activo')
             ORDER BY p.fecha DESC`,
            [estudianteId]
        );
        
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener preselecciones:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// OBTENER TODAS LAS MATERIAS CON INDICADOR DE SELECCIONADAS
// =====================================================
router.get('/materias-con-seleccion/:estudianteId', async (req, res) => {
    try {
        const { estudianteId } = req.params;
        
        const [periodoActivo] = await db.query(
            `SELECT valor FROM configuracion_sistema WHERE clave = 'periodo_activo'`
        );
        const periodo = periodoActivo[0]?.valor || '2026-3';
        
        const [rows] = await db.query(
            `SELECT m.*, 
                    CASE WHEN p.id IS NOT NULL THEN true ELSE false END as seleccionada
             FROM materias m
             LEFT JOIN preselecciones p ON m.id = p.materia_id 
                AND p.estudiante_id = ? AND p.periodo = ?
             ORDER BY m.semestre, m.codigo`,
            [estudianteId, periodo]
        );
        
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener materias con selección:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// GUARDAR PRESELECCIÓN
// =====================================================
router.post('/', async (req, res) => {
    try {
        const { estudiante_id, materia_id, periodo } = req.body;
        
        const [config] = await db.query(
            `SELECT valor FROM configuracion_sistema WHERE clave = 'max_materias'`
        );
        const maxMaterias = parseInt(config[0]?.valor || 2);
        
        const [actuales] = await db.query(
            `SELECT COUNT(*) as total FROM preselecciones WHERE estudiante_id = ? AND periodo = ?`,
            [estudiante_id, periodo]
        );
        
        if (actuales[0].total >= maxMaterias) {
            return res.status(400).json({ error: `Máximo ${maxMaterias} materias permitidas` });
        }
        
        const [duplicado] = await db.query(
            `SELECT id FROM preselecciones WHERE estudiante_id = ? AND materia_id = ? AND periodo = ?`,
            [estudiante_id, materia_id, periodo]
        );
        
        if (duplicado.length > 0) {
            return res.status(400).json({ error: 'Ya seleccionaste esta materia' });
        }
        
        const [result] = await db.query(
            `INSERT INTO preselecciones (estudiante_id, materia_id, periodo) VALUES (?, ?, ?)`,
            [estudiante_id, materia_id, periodo]
        );
        
        res.json({ success: true, message: 'Materia seleccionada exitosamente', id: result.insertId });
        
    } catch (error) {
        console.error('Error al guardar preselección:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ELIMINAR PRESELECCIÓN
// =====================================================
router.delete('/', async (req, res) => {
    try {
        const { estudiante_id, materia_id, periodo } = req.body;
        
        await db.query(
            `DELETE FROM preselecciones WHERE estudiante_id = ? AND materia_id = ? AND periodo = ?`,
            [estudiante_id, materia_id, periodo]
        );
        
        res.json({ success: true, message: 'Materia eliminada de tu selección' });
        
    } catch (error) {
        console.error('Error al eliminar preselección:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// REPORTE DE PRESELECCIONES POR PERIODO
// =====================================================
router.get('/reporte/:periodo', async (req, res) => {
    try {
        const { periodo } = req.params;
        
        const [rows] = await db.query(
            `SELECT m.codigo, m.nombre, m.uc, COUNT(*) as total_preselecciones,
             CEIL(COUNT(*) / (SELECT valor FROM configuracion_sistema WHERE clave = 'capacidad_seccion')) as secciones_sugeridas
             FROM preselecciones p
             JOIN materias m ON p.materia_id = m.id
             WHERE p.periodo = ?
             GROUP BY m.id
             ORDER BY total_preselecciones DESC`,
            [periodo]
        );
        
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener reporte:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// OBTENER ESTADO DE PRESELECCIÓN (abierta/cerrada)
// =====================================================
router.get('/estado', async (req, res) => {
    try {
        const [control] = await db.query(
            `SELECT cp.*, p.anio, p.periodo, p.fecha_inicio, p.fecha_fin 
             FROM control_preseleccion cp
             JOIN periodos p ON cp.periodo_id = p.id
             WHERE cp.activo = TRUE
             ORDER BY cp.id DESC LIMIT 1`
        );
        
        if (control.length === 0) {
            return res.json({ activo: false, mensaje: 'No hay periodo de preselección activo' });
        }
        
        const ahora = new Date();
        const fechaApertura = new Date(control[0].fecha_apertura);
        const fechaCierre = control[0].fecha_cierre ? new Date(control[0].fecha_cierre) : null;
        
        let estado = 'ACTIVO';
        let mensaje = 'Preselecciones abiertas';
        
        if (fechaCierre && ahora > fechaCierre) {
            estado = 'CERRADO';
            mensaje = 'Periodo de preselección cerrado';
        } else if (ahora < fechaApertura) {
            estado = 'PENDIENTE';
            mensaje = `Preselecciones abren el ${fechaApertura.toLocaleDateString()}`;
        }
        
        res.json({
            activo: control[0].activo && (!fechaCierre || ahora <= fechaCierre),
            estado: estado,
            mensaje: mensaje,
            periodo: {
                id: control[0].periodo_id,
                nombre: `${control[0].anio} - ${control[0].periodo}`,
                fecha_apertura: control[0].fecha_apertura,
                fecha_cierre: control[0].fecha_cierre,
                fecha_inicio_periodo: control[0].fecha_inicio,
                fecha_fin_periodo: control[0].fecha_fin
            }
        });
    } catch (error) {
        console.error('Error al obtener estado:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// ABRIR PERIODO DE PRESELECCIÓN (SOLO ADMIN)
// =====================================================
router.post('/abrir', async (req, res) => {
    try {
        const { periodo_id, fecha_apertura, fecha_cierre } = req.body;
        
        // Verificar si ya hay un periodo activo
        const [activo] = await db.query(
            `SELECT id FROM control_preseleccion WHERE activo = TRUE`
        );
        
        if (activo.length > 0) {
            return res.status(400).json({ 
                error: 'Ya hay un periodo de preselección activo. Debes cerrarlo primero.' 
            });
        }
        
        // Verificar que el periodo existe
        const [periodo] = await db.query(
            `SELECT id, anio, periodo FROM periodos WHERE id = ?`,
            [periodo_id]
        );
        
        if (periodo.length === 0) {
            return res.status(404).json({ error: 'Periodo no encontrado' });
        }
        
        // Crear nuevo control de preselección
        const [result] = await db.query(
            `INSERT INTO control_preseleccion (periodo_id, fecha_apertura, fecha_cierre, activo) 
             VALUES (?, ?, ?, TRUE)`,
            [periodo_id, fecha_apertura || new Date(), fecha_cierre || null]
        );
        
        // Actualizar la tabla periodos
        await db.query(
            `UPDATE periodos SET preseleccion_activa = TRUE WHERE id = ?`,
            [periodo_id]
        );
        
        res.json({ 
            success: true, 
            message: `Periodo de preselección abierto para ${periodo[0].anio} - ${periodo[0].periodo}`,
            id: result.insertId
        });
        
    } catch (error) {
        console.error('Error al abrir periodo:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// CERRAR PERIODO DE PRESELECCIÓN (SOLO ADMIN)
// =====================================================
router.post('/cerrar', async (req, res) => {
    try {
        const [activo] = await db.query(
            `SELECT cp.*, p.anio, p.periodo 
             FROM control_preseleccion cp
             JOIN periodos p ON cp.periodo_id = p.id
             WHERE cp.activo = TRUE`
        );
        
        if (activo.length === 0) {
            return res.status(400).json({ error: 'No hay periodo de preselección activo' });
        }
        
        // Cerrar el periodo activo
        await db.query(
            `UPDATE control_preseleccion SET activo = FALSE, fecha_cierre = NOW() WHERE id = ?`,
            [activo[0].id]
        );
        
        // Actualizar la tabla periodos
        await db.query(
            `UPDATE periodos SET preseleccion_activa = FALSE WHERE id = ?`,
            [activo[0].periodo_id]
        );
        
        res.json({ 
            success: true, 
            message: `Periodo de preselección cerrado para ${activo[0].anio} - ${activo[0].periodo}`
        });
        
    } catch (error) {
        console.error('Error al cerrar periodo:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// OBTENER LISTA DE PERIODOS DISPONIBLES (para admin)
// =====================================================
router.get('/periodos-disponibles', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, anio, periodo, fecha_inicio, fecha_fin 
             FROM periodos 
             WHERE tipo_periodo = 'PRESELECCION' OR tipo_periodo IS NULL
             ORDER BY anio DESC, id DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener periodos:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
