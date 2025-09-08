import React, { useState, useRef } from 'react';
import { Upload, File, AlertCircle, CheckCircle, X, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';

/**
 * Componente para subida de archivos Excel de beneficiarios
 */
const ExcelUpload = ({ onUploadComplete, onUploadError, isUploading = false, className = "" }) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);

  // Manejo de drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    // Validar tipo de archivo
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      '.xlsx',
      '.xls'
    ];
    
    const isValidType = validTypes.some(type => 
      file.type === type || file.name.toLowerCase().endsWith(type)
    );
    
    if (!isValidType) {
      onUploadError('Por favor selecciona un archivo Excel válido (.xlsx o .xls)');
      return;
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      onUploadError('El archivo es demasiado grande. Máximo 10MB permitido.');
      return;
    }

    setFileName(file.name);
    
    try {
      const data = await processExcelFile(file);
      setPreviewData(data);
      setShowPreview(true);
    } catch (error) {
      onUploadError(`Error al procesar el archivo: ${error.message}`);
    }
  };

  const processExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Obtener la primera hoja
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convertir a JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '' // Valor por defecto para celdas vacías
          });
          
          // Validar que hay datos
          if (jsonData.length < 2) {
            reject(new Error('El archivo debe contener al menos una fila de datos además del encabezado'));
            return;
          }
          
          // Procesar datos según el formato esperado
          const headers = jsonData[0];
          const dataRows = jsonData.slice(1);
          
          // Mapear datos al formato esperado
          const processedData = dataRows
            .filter(row => row.some(cell => cell && cell.toString().trim() !== '')) // Filtrar filas vacías
            .map((row, index) => {
              return {
                Nombre: row[0] || '',
                Fono: row[1] || '',
                Sim: row[2] || '',
                Direccion: row[3] || '',
                'App Sim': row[4] || '',
                _rowIndex: index + 2 // +2 porque slice(1) y las filas empiezan en 1
              };
            });
          
          if (processedData.length === 0) {
            reject(new Error('No se encontraron datos válidos en el archivo'));
            return;
          }
          
          resolve({
            headers,
            data: processedData,
            totalRows: processedData.length
          });
        } catch (error) {
          reject(new Error(`Error al leer el archivo Excel: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  const confirmUpload = () => {
    if (previewData && onUploadComplete) {
      onUploadComplete(previewData.data, {
        fileName,
        totalRows: previewData.totalRows,
        onProgress: setUploadProgress
      });
      setShowPreview(false);
      setPreviewData(null);
      setFileName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const cancelUpload = () => {
    setShowPreview(false);
    setPreviewData(null);
    setFileName('');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Área de upload */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            {isUploading ? (
              <Loader2 className="h-12 w-12 animate-spin" />
            ) : (
              <Upload className="h-12 w-12" />
            )}
          </div>
          
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {isUploading 
                ? 'Procesando archivo...' 
                : dragActive 
                  ? 'Suelta el archivo aquí' 
                  : 'Arrastra tu archivo Excel aquí'
              }
            </p>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isUploading 
                ? `Progreso: ${uploadProgress}%`
                : 'o haz clic para seleccionar un archivo (.xlsx, .xls)'
              }
            </p>
            
            {fileName && !isUploading && (
              <div className="flex items-center justify-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
                <File className="h-4 w-4" />
                <span>{fileName}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Barra de progreso */}
        {isUploading && uploadProgress > 0 && (
          <motion.div 
            className="mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
              />
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Formato esperado */}
      <motion.div 
        className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          Formato esperado del Excel:
        </h4>
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <p><strong>Columna A:</strong> Nombre del beneficiario</p>
          <p><strong>Columna B:</strong> Fono (teléfono principal)</p>
          <p><strong>Columna C:</strong> Sim (teléfono secundario)</p>
          <p><strong>Columna D:</strong> Dirección</p>
          <p><strong>Columna E:</strong> App Sim (otro número de contacto)</p>
        </div>
        <div className="mt-2 text-xs text-blue-600 dark:text-blue-300">
          Nota: Los números "000000000" serán ignorados automáticamente
        </div>
      </motion.div>

      {/* Modal de vista previa */}
      {showPreview && previewData && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Vista previa del archivo
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {previewData.totalRows} beneficiarios encontrados
                </p>
              </div>
              <button
                onClick={cancelUpload}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Contenido */}
            <div className="p-6 overflow-y-auto max-h-96">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Fono
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Sim
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Dirección
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        App Sim
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {previewData.data.slice(0, 10).map((row, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {row.Nombre || 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {row.Fono || 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {row.Sim || 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                          {row.Direccion || 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {row['App Sim'] || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {previewData.data.length > 10 && (
                  <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                    ... y {previewData.data.length - 10} filas más
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={cancelUpload}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                onClick={confirmUpload}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Confirmar y cargar {previewData.totalRows} beneficiarios</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ExcelUpload;
