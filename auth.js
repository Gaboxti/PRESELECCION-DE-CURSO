const express = require('express');
const router = express.Router();
const db = require('../db');

// =====================================================
// REGISTRO DE NUEVO ESTUDIANTE
// =====================================================
router.post('/register', async (req, res) => {
    try {
        const { carnet, nombre, email, telefono, edad, semestre, password } = req.body;
        
        // Validar campos requeridos
        if (!carnet || !nombre || !email || !semestre || !password) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }
        
        // Verificar si ya existe el carnet
        const [existeCarnet] = await db.query('SELECT id FROM estudiantes WHERE carnet = ?', [carnet]);
        if (existeCarnet.length > 0) {
            return res.status(400).json({ error: 'Ya existe un estudiante con este carnet' });
        }
        
        // Verificar si ya existe el email
        const [existeEmail] = await db.query('SELECT id FROM estudiantes WHERE email = ?', [email]);
        if (existeEmail.length > 0) {
            return res.status(400).json({ error: 'Ya existe un estudiante con este email' });
        }
        
        // Insertar nuevo estudiante
        const [result] = await db.query(
            `INSERT INTO estudiantes (carnet, nombre, email, telefono, edad, semestre, password, rol) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'estudiante')`,
            [carnet, nombre, email, telefono || null, edad || null, semestre, password]
        );
        
        res.json({ 
            success: true, 
            message: 'Estudiante registrado exitosamente',
            id: result.insertId
        });
        
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// =====================================================
// LOGIN CON ANTI-PASSWORD SPRAYING
// =====================================================
// Almacenamiento temporal de intentos fallidos (en memoria)
const intentosFallidos = new Map();

function limpiarIntentosAntiguos() {
    const ahora = Date.now();
    for (const [key, data] of intentosFallidos.entries()) {
        if (ahora - data.timestamp > 15 * 60 * 1000) { // 15 minutos
            intentosFallidos.delete(key);
        }
    }
}

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const ip = req.ip || req.connection.remoteAddress;
        const clave = `${ip}_${username}`;
        
        limpiarIntentosAntiguos();
        
        // Verificar intentos fallidos recientes
        const intentos = intentosFallidos.get(clave);
        if (intentos && intentos.count >= 5) {
            const tiempoRestante = Math.ceil((intentos.timestamp + 15 * 60 * 1000 - Date.now()) / 1000);
            if (tiempoRestante > 0) {
                return res.status(429).json({ 
                    error: `Demasiados intentos. Espera ${tiempoRestante} segundos`,
                    esperar: tiempoRestante
                });
            } else {
                intentosFallidos.delete(clave);
            }
        }
        
        // Simular retardo anti-Password Spraying (2-3 segundos)
        const delay = Math.floor(Math.random() * (3000 - 2000 + 1) + 2000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Buscar usuario por carnet o email
        const [rows] = await db.query(
            `SELECT id, carnet, nombre, email, telefono, edad, semestre, rol, password 
             FROM estudiantes 
             WHERE (carnet = ? OR email = ?)`,
            [username, username]
        );
        
        if (rows.length === 0) {
            // Registrar intento fallido
            if (intentos) {
                intentos.count++;
                intentos.timestamp = Date.now();
            } else {
                intentosFallidos.set(clave, { count: 1, timestamp: Date.now() });
            }
            
            return res.status(401).json({ 
                error: 'Usuario no encontrado. ¿Deseas registrarte?',
                noExiste: true
            });
        }
        
        const user = rows[0];
        
        // Verificar contraseña
        if (user.password !== password) {
            // Registrar intento fallido
            if (intentos) {
                intentos.count++;
                intentos.timestamp = Date.now();
            } else {
                intentosFallidos.set(clave, { count: 1, timestamp: Date.now() });
            }
            
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }
        
        // Login exitoso - limpiar intentos fallidos
        intentosFallidos.delete(clave);
        
        // Eliminar password de la respuesta
        delete user.password;
        
        res.json({ 
            success: true, 
            user: user,
            delay: delay // Opcional: para mostrar en frontend
        });
        
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// =====================================================
// VERIFICAR SI USUARIO EXISTE (para el frontend)
// =====================================================
router.post('/verificar', async (req, res) => {
    try {
        const { username } = req.body;
        
        const [rows] = await db.query(
            'SELECT id FROM estudiantes WHERE carnet = ? OR email = ?',
            [username, username]
        );
        
        res.json({ existe: rows.length > 0 });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
