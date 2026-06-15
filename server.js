const express = require('express');
const cors = require('cors');
require('dotenv').config();

const materiasRoutes = require('./routes/materias');
const authRoutes = require('./routes/auth');
const preseleccionesRoutes = require('./routes/preselecciones');
const estudiantesRoutes = require('./routes/estudiantes');  // ← AGREGAR ESTA LÍNEA

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/materias', materiasRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/preselecciones', preseleccionesRoutes);
app.use('/api/estudiantes', estudiantesRoutes);  // ← MOVER AQUÍ (dentro de las rutas)

// Ruta de prueba
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Servidor funcionando correctamente' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📚 API de materias: http://localhost:${PORT}/api/materias`);
    console.log(`🔐 API de auth: http://localhost:${PORT}/api/auth`);
    console.log(`👨‍🎓 API de estudiantes: http://localhost:${PORT}/api/estudiantes`);
});
