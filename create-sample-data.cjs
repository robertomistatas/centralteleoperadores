const XLSX = require('xlsx');
const fs = require('fs');

// Crear datos de muestra para testing
const sampleData = [
  {
    fecha: '2024-01-15',
    teleoperadora: 'María González',
    beneficiario: 'Juan Pérez',
    telefono: '987654321',
    duracion: 180,
    exitosa: 'true',
    motivo: 'Seguimiento rutinario',
    comuna: 'Santiago'
  },
  {
    fecha: '2024-01-16',
    teleoperadora: 'Ana Silva',
    beneficiario: 'Carmen López',
    telefono: '912345678',
    duracion: 240,
    exitosa: 'false',
    motivo: 'No contesta',
    comuna: 'Valparaíso'
  },
  {
    fecha: '2024-01-17',
    teleoperadora: 'María González',
    beneficiario: 'Roberto Martínez',
    telefono: '956789012',
    duracion: 320,
    exitosa: 'true',
    motivo: 'Consulta médica',
    comuna: 'Concepción'
  },
  {
    fecha: '2024-01-18',
    teleoperadora: 'Ana Silva',
    beneficiario: 'Elena Rodríguez',
    telefono: '934567890',
    duracion: 150,
    exitosa: 'true',
    motivo: 'Recordatorio cita',
    comuna: 'Santiago'
  },
  {
    fecha: '2024-01-19',
    teleoperadora: 'Carlos Mendoza',
    beneficiario: 'Pedro García',
    telefono: '923456789',
    duracion: 0,
    exitosa: 'false',
    motivo: 'Teléfono desconectado',
    comuna: 'Antofagasta'
  },
  {
    fecha: '2024-01-20',
    teleoperadora: 'María González',
    beneficiario: 'Sofía Herrera',
    telefono: '945678901',
    duracion: 280,
    exitosa: 'true',
    motivo: 'Seguimiento post-alta',
    comuna: 'Valparaíso'
  },
  {
    fecha: '2024-01-21',
    teleoperadora: 'Laura Torres',
    beneficiario: 'Miguel Flores',
    telefono: '967890123',
    duracion: 195,
    exitosa: 'true',
    motivo: 'Consulta telefónica',
    comuna: 'La Serena'
  },
  {
    fecha: '2024-01-22',
    teleoperadora: 'Ana Silva',
    beneficiario: 'Carmen López',
    telefono: '912345678',
    duracion: 160,
    exitosa: 'true',
    motivo: 'Seguimiento exitoso',
    comuna: 'Valparaíso'
  },
  {
    fecha: '2024-01-23',
    teleoperadora: 'Carlos Mendoza',
    beneficiario: 'Luis Morales',
    telefono: '978901234',
    duracion: 0,
    exitosa: 'false',
    motivo: 'No localizado',
    comuna: 'Temuco'
  },
  {
    fecha: '2024-01-24',
    teleoperadora: 'Laura Torres',
    beneficiario: 'Isabel Castro',
    telefono: '989012345',
    duracion: 220,
    exitosa: 'true',
    motivo: 'Orientación familiar',
    comuna: 'Santiago'
  }
];

// Crear más datos para hacer el ejemplo más realista
const expandedData = [];
const nombres = ['María González', 'Ana Silva', 'Carlos Mendoza', 'Laura Torres', 'Patricia Vega', 'José Ramírez', 'Claudia Soto', 'Diego Moreno'];
const beneficiarios = ['Juan Pérez', 'Carmen López', 'Roberto Martínez', 'Elena Rodríguez', 'Pedro García', 'Sofía Herrera', 'Miguel Flores', 'Luis Morales', 'Isabel Castro', 'Fernando Díaz', 'Luz Marina', 'Carlos Espinoza', 'Verónica Núñez', 'Andrés Pinto', 'Gloria Vargas'];
const comunas = ['Santiago', 'Valparaíso', 'Concepción', 'La Serena', 'Antofagasta', 'Temuco', 'Rancagua', 'Talca', 'Arica', 'Iquique'];
const motivos = ['Seguimiento rutinario', 'Consulta médica', 'Recordatorio cita', 'No contesta', 'Teléfono desconectado', 'Seguimiento post-alta', 'Consulta telefónica', 'Orientación familiar', 'No localizado', 'Reagendamiento'];

// Generar 200 registros de muestra
for (let i = 0; i < 200; i++) {
  const fecha = new Date(2024, 0, 1 + Math.floor(Math.random() * 90)); // Enero a Marzo 2024
  const teleoperadora = nombres[Math.floor(Math.random() * nombres.length)];
  const beneficiario = beneficiarios[Math.floor(Math.random() * beneficiarios.length)];
  const telefono = '9' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  const exitosa = Math.random() > 0.3; // 70% de éxito
  const duracion = exitosa ? Math.floor(Math.random() * 300) + 60 : Math.floor(Math.random() * 30); // Si es exitosa, 60-360 seg, sino 0-30
  const motivo = motivos[Math.floor(Math.random() * motivos.length)];
  const comuna = comunas[Math.floor(Math.random() * comunas.length)];
  
  expandedData.push({
    fecha: fecha.toISOString().split('T')[0],
    teleoperadora,
    beneficiario,
    telefono,
    duracion,
    exitosa: exitosa.toString(),
    motivo,
    comuna
  });
}

// Crear el archivo Excel
const worksheet = XLSX.utils.json_to_sheet(expandedData);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Llamadas');

// Guardar el archivo
const filePath = './data/llamadas.xlsx';
XLSX.writeFile(workbook, filePath);

console.log(`✅ Archivo Excel de muestra creado: ${filePath}`);
console.log(`📊 Registros generados: ${expandedData.length}`);
console.log(`👥 Teleoperadoras: ${nombres.length}`);
console.log(`🏥 Beneficiarios únicos: ${beneficiarios.length}`);
console.log(`📍 Comunas: ${comunas.length}`);
console.log('\n💡 Ahora puedes ejecutar:');
console.log('   node src/scripts/initializeFirestore.js');