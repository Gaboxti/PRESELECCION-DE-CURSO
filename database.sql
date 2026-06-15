-- Se utilia MySQL Shell para ejecutar este script y crear la base de datos y tablas necesarias para el sistema de preselección de materias. Asegúrate de tener los permisos adecuados para crear bases de datos y tablas en tu servidor MySQL.

\sql
\connect root@localhost
\use preseleccion_verano

-- =====================================================
-- ELIMINAR BASE DE DATOS SI EXISTE
-- =====================================================
DROP DATABASE IF EXISTS preseleccion_verano;

-- =====================================================
-- CREAR BASE DE DATOS
-- =====================================================
CREATE DATABASE preseleccion_verano;
USE preseleccion_verano;

-- =====================================================
-- 1. TABLA: estudiantes (usuarios del sistema)
-- =====================================================
CREATE TABLE estudiantes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    carnet VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    edad INT,
    semestre INT DEFAULT 1,
    password VARCHAR(100) NOT NULL,
    rol VARCHAR(20) DEFAULT 'estudiante',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. TABLA: materias (catálogo de materias)
-- =====================================================
CREATE TABLE materias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    uc INT NOT NULL,
    semestre INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. TABLA: preselecciones (selecciones de materias)
-- =====================================================
CREATE TABLE preselecciones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    estudiante_id INT NOT NULL,
    materia_id INT NOT NULL,
    periodo VARCHAR(10) NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
    UNIQUE KEY unique_preseleccion (estudiante_id, materia_id, periodo)
);

-- =====================================================
-- 4. TABLA: periodos (periodos académicos)
-- =====================================================
CREATE TABLE periodos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    anio INT NOT NULL,
    periodo VARCHAR(20) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado ENUM('ACTIVO', 'INACTIVO', 'CERRADO') DEFAULT 'INACTIVO',
    total_estudiantes_inscritos INT DEFAULT 0,
    tipo_periodo ENUM('PRESELECCION', 'REGULAR') DEFAULT 'REGULAR',
    preseleccion_activa BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_periodo (anio, periodo)
);

-- =====================================================
-- 5. TABLA: periodos_respaldo (historial de periodos cerrados)
-- =====================================================
CREATE TABLE periodos_respaldo (
    id INT PRIMARY KEY AUTO_INCREMENT,
    periodo_original_id INT,
    anio INT NOT NULL,
    periodo VARCHAR(20) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado VARCHAR(20) DEFAULT 'CERRADO',
    total_estudiantes_inscritos INT DEFAULT 0,
    fecha_cierre TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    datos_json JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 6. TABLA: inscripciones_periodo (inscripciones definitivas)
-- =====================================================
CREATE TABLE inscripciones_periodo (
    id INT PRIMARY KEY AUTO_INCREMENT,
    periodo_id INT NOT NULL,
    estudiante_id INT NOT NULL,
    materia_id INT NOT NULL,
    fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (periodo_id) REFERENCES periodos(id) ON DELETE CASCADE,
    FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
    UNIQUE KEY unique_inscripcion (periodo_id, estudiante_id, materia_id)
);

-- =====================================================
-- 7. TABLA: estadisticas_materias_periodo (totales por materia)
-- =====================================================
CREATE TABLE estadisticas_materias_periodo (
    id INT PRIMARY KEY AUTO_INCREMENT,
    periodo_id INT NOT NULL,
    materia_id INT NOT NULL,
    materia_codigo VARCHAR(20) NOT NULL,
    materia_nombre VARCHAR(200) NOT NULL,
    total_inscritos INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (periodo_id) REFERENCES periodos(id) ON DELETE CASCADE,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
    UNIQUE KEY unique_estadistica (periodo_id, materia_id)
);

-- =====================================================
-- 8. TABLA: control_preseleccion (control de apertura/cierre)
-- =====================================================
CREATE TABLE control_preseleccion (
    id INT PRIMARY KEY AUTO_INCREMENT,
    periodo_id INT NOT NULL,
    fecha_apertura DATETIME NOT NULL,
    fecha_cierre DATETIME,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (periodo_id) REFERENCES periodos(id),
    UNIQUE KEY unique_activo (activo)
);

-- =====================================================
-- 9. TABLA: configuracion_periodos
-- =====================================================
CREATE TABLE configuracion_periodos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    max_periodos_activos INT DEFAULT 1,
    periodo_activo_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (periodo_activo_id) REFERENCES periodos(id)
);

-- =====================================================
-- 10. TABLA: configuracion_sistema
-- =====================================================
CREATE TABLE configuracion_sistema (
    id INT PRIMARY KEY AUTO_INCREMENT,
    clave VARCHAR(50) NOT NULL UNIQUE,
    valor VARCHAR(100) NOT NULL,
    descripcion TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- INSERTAR MATERIAS (59 materias del pensum)
-- =====================================================

-- Semestre 1
INSERT INTO materias (codigo, nombre, uc, semestre) VALUES
('IC1222', 'Fundamentos de la Informática', 3, 1),
('DP0001', 'Deporte', 2, 1),
('IM1421', 'Matemática I', 5, 1),
('IM1223', 'Lógica Matemática', 3, 1),
('FC0001', 'Formación Constitucional', 2, 1),
('IH1124', 'Lenguaje y Comunicación', 2, 1),
('IH1125', 'Inglés I', 2, 1),
('EC005', 'Economía Digital', 2, 1);

-- Semestre 2
INSERT INTO materias (codigo, nombre, uc, semestre) VALUES
('IM2421', 'Matemática II', 5, 2),
('IH2124', 'Problemática Científica Tecnológica', 2, 2),
('IB2322', 'Física I', 4, 2),
('IME320', 'Electiva I (Conducta Humana)', 2, 2),
('IC2323', 'Algoritmos I', 3, 2),
('AC0001', 'Arte y Cultura', 2, 2),
('IH2125', 'Inglés II', 2, 2);

-- Semestre 3
INSERT INTO materias (codigo, nombre, uc, semestre) VALUES
('IC3323', 'Algoritmos II', 3, 3),
('IME520', 'Electiva II (Legislación Informática)', 2, 3),
('IC3244', 'Programación I', 4, 3),
('IM3421', 'Matemática III', 5, 3),
('IB3322', 'Física II', 4, 3),
('IH3125', 'Metodología y Técnicas de Investigación', 2, 3);

-- Semestre 4
INSERT INTO materias (codigo, nombre, uc, semestre) VALUES
('IM5421', 'Probabilidades y Estadística', 3, 4),
('IM4421', 'Matemática IV', 5, 4),
('IC4244', 'Programación II', 4, 4),
('IME720', 'Electiva III (Mantenimiento del Computador)', 2, 4),
('IM4323', 'Estructuras Discretas I', 4, 4),
('IS4225', 'Base de Datos', 3, 4);

-- Semestre 5
INSERT INTO materias (codigo, nombre, uc, semestre) VALUES
('IS5205', 'Teoría de Sistemas', 2, 5),
('IM5221', 'Álgebra Booleana', 3, 5),
('IM5323', 'Estructuras Discretas II', 4, 5),
('IC5244', 'Programación III', 4, 5),
('IMEIV', 'Electiva IV (Teleinformática)', 2, 5),
('IC5422', 'Organización del Computador', 5, 5);

-- Semestre 6
INSERT INTO materias (codigo, nombre, uc, semestre) VALUES
('ID6241', 'Investigación de Operaciones', 4, 6),
('IC6322', 'Arquitectura del Computador', 4, 6),
('IS6425', 'Sistemas de Información I', 5, 6),
('IM6243', 'Métodos Numéricos', 4, 6),
('ID6124', 'Ingeniería Económica', 2, 6),
('IMEV', 'Electiva V', 2, 6);

-- Semestre 7
INSERT INTO materias (codigo, nombre, uc, semestre) VALUES
('ID7323', 'Organización y Gestión Empresa', 4, 7),
('IS7244', 'Traductores e Intérpretes', 4, 7),
('IC7322', 'Sistemas Operativos', 4, 7),
('IS7324', 'Sistemas de Información II', 5, 7),
('ID7322', 'Control de Proyectos', 4, 7);

-- Semestre 8
INSERT INTO materias (codigo, nombre, uc, semestre) VALUES
('EA', 'Electiva de Área I', 4, 8),
('ID8082', 'Pasantía', 4, 8),
('IS8243', 'Lenguaje de Programación', 4, 8),
('IS8424', 'Sistemas de Información III', 5, 8),
('IT8241', 'Redes', 4, 8);

-- Semestre 9
INSERT INTO materias (codigo, nombre, uc, semestre) VALUES
('EL9325', 'Electiva Libre I', 3, 9),
('IT9241', 'Sistemas Distribuidos', 4, 9),
('EA9244', 'Electiva de Área II', 4, 9),
('IH9202', 'Ética Profesional', 2, 9),
('PG9083', 'Proyecto de Grado I', 4, 9);

-- Semestre 10
INSERT INTO materias (codigo, nombre, uc, semestre) VALUES
('EA0244', 'Electiva de Área III', 4, 10),
('EL', 'Electiva Libre II', 3, 10),
('PG0083', 'Proyecto de Grado II', 4, 10),
('ISO222', 'Informática Educativa', 3, 10),
('ID0221', 'Gerencia de Proyecto', 3, 10);

-- =====================================================
-- INSERTAR ESTUDIANTES DE PRUEBA
-- =====================================================
INSERT INTO estudiantes (carnet, nombre, email, semestre, password, rol) VALUES
('12345678', 'Usuario de Prueba', 'estudiante@ejemplo.com', 5, 'estudiante', 'estudiante'),
('admin', 'Administrador', 'admin@sistema.com', 0, 'admin', 'admin');

-- =====================================================
-- INSERTAR PERIODOS
-- =====================================================
INSERT INTO periodos (anio, periodo, fecha_inicio, fecha_fin, estado, tipo_periodo) VALUES
(2026, 'ENERO-MARZO', '2026-01-15', '2026-03-30', 'INACTIVO', 'REGULAR'),
(2026, 'ABRIL-JULIO', '2026-04-10', '2026-07-25', 'INACTIVO', 'REGULAR'),
(2026, 'VERANO', '2026-07-01', '2026-09-15', 'ACTIVO', 'PRESELECCION');

-- =====================================================
-- INSERTAR CONFIGURACIÓN
-- =====================================================
INSERT INTO configuracion_periodos (max_periodos_activos, periodo_activo_id) VALUES (1, 3);

INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
('periodo_activo', '2026-3', 'Periodo académico actual'),
('max_materias', '2', 'Máximo de materias por estudiante'),
('capacidad_seccion', '30', 'Capacidad máxima por sección');

-- =====================================================
-- ACTUALIZAR PERIODO VERANO
-- =====================================================
UPDATE periodos SET tipo_periodo = 'PRESELECCION', preseleccion_activa = TRUE WHERE periodo = 'VERANO' AND anio = 2026;

-- =====================================================
-- INSERTAR REGISTRO INICIAL EN CONTROL_PRESELECCION
-- =====================================================
INSERT INTO control_preseleccion (periodo_id, fecha_apertura, activo) 
SELECT id, NOW(), TRUE FROM periodos WHERE preseleccion_activa = TRUE LIMIT 1;

-- =====================================================
-- CREAR VISTAS ÚTILES
-- =====================================================

-- Vista: Reporte de preselecciones
CREATE OR REPLACE VIEW vw_reporte_preselecciones AS
SELECT 
    p.id,
    e.carnet,
    e.nombre as estudiante,
    m.codigo,
    m.nombre as materia,
    m.uc,
    p.periodo,
    p.fecha
FROM preselecciones p
JOIN estudiantes e ON p.estudiante_id = e.id
JOIN materias m ON p.materia_id = m.id
ORDER BY p.fecha DESC;

-- Vista: Materias más solicitadas
CREATE OR REPLACE VIEW vw_materias_top AS
SELECT 
    m.id,
    m.codigo,
    m.nombre,
    COUNT(p.id) as total_preselecciones,
    ROUND(COUNT(p.id) / (SELECT COUNT(*) FROM estudiantes WHERE semestre >= m.semestre - 1) * 100, 2) as porcentaje_demanda
FROM materias m
LEFT JOIN preselecciones p ON m.id = p.materia_id
GROUP BY m.id
ORDER BY total_preselecciones DESC;

-- =====================================================
-- PROCEDIMIENTOS ALMACENADOS
-- =====================================================

-- Procedimiento: Actualizar estadísticas de materias
DELIMITER //
CREATE PROCEDURE actualizar_estadisticas_materias(IN p_periodo_id INT)
BEGIN
    DELETE FROM estadisticas_materias_periodo WHERE periodo_id = p_periodo_id;
    
    INSERT INTO estadisticas_materias_periodo (periodo_id, materia_id, materia_codigo, materia_nombre, total_inscritos)
    SELECT 
        p_periodo_id,
        m.id,
        m.codigo,
        m.nombre,
        COUNT(i.id)
    FROM materias m
    LEFT JOIN inscripciones_periodo i ON m.id = i.materia_id AND i.periodo_id = p_periodo_id
    GROUP BY m.id;
    
    UPDATE periodos 
    SET total_estudiantes_inscritos = (
        SELECT COUNT(DISTINCT estudiante_id) 
        FROM inscripciones_periodo 
        WHERE periodo_id = p_periodo_id
    ) 
    WHERE id = p_periodo_id;
END//
DELIMITER ;

-- Procedimiento: Activar periodo (solo uno activo a la vez)
DELIMITER //
CREATE PROCEDURE activar_periodo(IN p_periodo_id INT)
BEGIN
    DECLARE v_max_activos INT;
    DECLARE v_activos_count INT;
    
    SELECT max_periodos_activos INTO v_max_activos FROM configuracion_periodos LIMIT 1;
    SELECT COUNT(*) INTO v_activos_count FROM periodos WHERE estado = 'ACTIVO';
    
    IF v_activos_count >= v_max_activos THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ya hay un periodo activo. Debes cerrarlo primero.';
    ELSE
        UPDATE periodos SET estado = 'ACTIVO' WHERE id = p_periodo_id;
        UPDATE configuracion_periodos SET periodo_activo_id = p_periodo_id;
    END IF;
END//
DELIMITER ;

-- Procedimiento: Cerrar periodo y generar respaldo
DELIMITER //
CREATE PROCEDURE cerrar_periodo(IN p_periodo_id INT)
BEGIN
    DECLARE v_anio INT;
    DECLARE v_periodo VARCHAR(20);
    DECLARE v_fecha_inicio DATE;
    DECLARE v_fecha_fin DATE;
    DECLARE v_total_estudiantes INT;
    DECLARE v_datos_json JSON;
    
    SELECT anio, periodo, fecha_inicio, fecha_fin, total_estudiantes_inscritos 
    INTO v_anio, v_periodo, v_fecha_inicio, v_fecha_fin, v_total_estudiantes
    FROM periodos WHERE id = p_periodo_id;
    
    SELECT JSON_OBJECT(
        'periodo', JSON_OBJECT('id', p_periodo_id, 'anio', v_anio, 'nombre', v_periodo),
        'estadisticas', (
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'materia_id', m.id,
                    'codigo', m.codigo,
                    'nombre', m.nombre,
                    'total_inscritos', e.total_inscritos
                )
            ) FROM estadisticas_materias_periodo e
            JOIN materias m ON e.materia_id = m.id
            WHERE e.periodo_id = p_periodo_id
        ),
        'total_estudiantes', v_total_estudiantes,
        'fecha_cierre', NOW()
    ) INTO v_datos_json;
    
    INSERT INTO periodos_respaldo (periodo_original_id, anio, periodo, fecha_inicio, fecha_fin, total_estudiantes_inscritos, datos_json)
    VALUES (p_periodo_id, v_anio, v_periodo, v_fecha_inicio, v_fecha_fin, v_total_estudiantes, v_datos_json);
    
    UPDATE periodos SET estado = 'CERRADO' WHERE id = p_periodo_id;
    UPDATE configuracion_periodos SET periodo_activo_id = NULL WHERE periodo_activo_id = p_periodo_id;
    
    SELECT v_datos_json AS reporte_json;
END//
DELIMITER ;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Evitar más de un periodo activo
DELIMITER //
CREATE TRIGGER before_periodo_update
BEFORE UPDATE ON periodos
FOR EACH ROW
BEGIN
    DECLARE v_activos_count INT;
    
    IF NEW.estado = 'ACTIVO' AND OLD.estado != 'ACTIVO' THEN
        SELECT COUNT(*) INTO v_activos_count FROM periodos WHERE estado = 'ACTIVO' AND id != NEW.id;
        
        IF v_activos_count >= 1 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ya existe un periodo activo. Debes cerrarlo primero.';
        END IF;
    END IF;
END//
DELIMITER ;

-- Trigger: Actualizar estadísticas al insertar inscripción
DELIMITER //
CREATE TRIGGER after_inscripcion_insert
AFTER INSERT ON inscripciones_periodo
FOR EACH ROW
BEGIN
    CALL actualizar_estadisticas_materias(NEW.periodo_id);
END//
DELIMITER ;

-- =====================================================
-- CONSULTAS DE VERIFICACIÓN
-- =====================================================
SELECT '=== TABLAS CREADAS ===' as '';
SHOW TABLES;

SELECT '=== ESTUDIANTES ===' as '';
SELECT id, carnet, nombre, email, semestre, rol FROM estudiantes;

SELECT '=== MATERIAS ===' as '';
SELECT COUNT(*) as total_materias FROM materias;

SELECT '=== MATERIAS POR SEMESTRE ===' as '';
SELECT semestre, COUNT(*) as total FROM materias GROUP BY semestre ORDER BY semestre;

SELECT '=== PERIODOS ===' as '';
SELECT id, anio, periodo, estado, tipo_periodo, preseleccion_activa FROM periodos;

SELECT '=== CONFIGURACIÓN ===' as '';
SELECT * FROM configuracion_sistema;

SELECT '=== CONTROL PRESELECCIÓN ===' as '';
SELECT cp.*, p.anio, p.periodo 
FROM control_preseleccion cp
JOIN periodos p ON cp.periodo_id = p.id;
