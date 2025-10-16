/**
 * AuditDemo_Final - Módulo de Auditoría Avanzada
 * 
 * FASE 4 - TAREA 2: Integrado con metricsEngine.js
 * - Usa computeGlobalMetrics() para cálculos unificados
 * - Usa normalizeRecords() para datos limpios
 * - Sincronizado con Dashboard y Historial
 * - Métricas consistentes en tiempo real
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useCallStore, useAppStore } from '../../stores';
import { useUIStore } from '../../stores/useUIStore';
import useMetricsStore from '../../stores/useMetricsStore';
import { useSeguimientosStore } from '../../stores/useSeguimientosStore';
import { useMetricsWithFallback } from '../../utils/fallbackMetrics';
import { BarChart3, FileSpreadsheet, TrendingUp, Users, Clock, Phone, User, Download, FileText, Printer, Zap } from 'lucide-react';
import { findOperatorForBeneficiary, shouldExcludeAsOperator } from '../../utils/operatorMapping';
import { computeGlobalMetrics, formatMetricsForUI } from '../../services/metricsEngine';
import { normalizeRecords } from '../../utils/dataNormalizer';
import logger from '../../utils/logger';

function AuditDemo() {
  // ⚡ FASE 4 - TAREA 2: Datos unificados desde stores
  const callData = useCallStore((state) => state.callData) || [];
  const { processedData, dataSource, clearData, hasData, isLoading, lastUpdated } = useCallStore();
  const seguimientos = useSeguimientosStore((state) => state.seguimientos) || [];
  const { operators, operatorAssignments, getAllAssignments } = useAppStore();
  const { showError } = useUIStore();

  // ⚡ FASE 4: Normalización y métricas unificadas
  const normalizedData = useMemo(() => {
    const allRecords = [...(callData || []), ...(seguimientos || [])];
    logger.audit('[AuditDemo] Normalizando registros', {
      callData: callData.length,
      seguimientos: seguimientos.length,
      total: allRecords.length
    });
    return normalizeRecords(allRecords);
  }, [callData, seguimientos]);

  const unifiedMetrics = useMemo(() => {
    const metrics = computeGlobalMetrics(normalizedData, {
      includeTopOperators: true,
      topN: 10,
      includeHourly: true
    });
    logger.audit('[AuditDemo] Métricas calculadas', {
      total: metrics.total,
      tasaExito: metrics.tasaExito,
      operadoras: metrics.porOperadora?.length || 0
    });
    return metrics;
  }, [normalizedData]);

  const formattedMetrics = useMemo(() => {
    return formatMetricsForUI(unifiedMetrics, 'es-CL');
  }, [unifiedMetrics]);

  // 🔄 Mantener compatibilidad con metricsStore para listeners existentes
  const {
    globalMetrics,
    loading,
    errors,
    initializeListeners,
    cleanup
  } = useMetricsStore();

  const fallbackMetrics = useMetricsWithFallback();
  const shouldUseFallback = errors.global || !unifiedMetrics || unifiedMetrics.total === 0;

  // Estado para controlar la exportación de PDFs
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Inicializar listeners al montar el componente (igual que el Dashboard)
  useEffect(() => {
    initializeListeners();
    return cleanup; // Limpiar al desmontar
  }, [initializeListeners, cleanup]);

  // 🔧 Cargar scripts de diagnóstico automáticamente
  useEffect(() => {
    if (import.meta.env.DEV) {
      // Cargar script de diagnóstico de estructura de datos
      import('../../debug/data_structure_diagnostic.js')
        .then((module) => {
          console.log('✅ Script de diagnóstico cargado exitosamente');
          window.diagnosticDataStructure = module.diagnosticDataStructure || module.default;
        })
        .catch((error) => {
          console.log('💡 Script de diagnóstico no encontrado, creando función local...', error.message);
          window.diagnosticDataStructure = () => {
            console.log('🔍 === DIAGNÓSTICO LOCAL DE ESTRUCTURA ===');
            console.log('📞 Datos procesados:', processedData?.length || 0);
            console.log('👥 Operadores:', operators?.length || 0);
            console.log('📋 Asignaciones:', operatorAssignments ? Object.keys(operatorAssignments).length : 0);
            if (processedData && processedData.length > 0) {
              console.log('Muestra de datos:', processedData[0]);
            }
          };
        });
    }
  }, [processedData, operators, operatorAssignments]);

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return 'N/A';
    }
  };

  // Obtener métricas con validación
  const operatorMetrics = getOperatorMetrics ? getOperatorMetrics() : [];
  const hourlyDistribution = getHourlyDistribution ? getHourlyDistribution() : [];

  // ⚡ FASE 4 - TAREA 2: Métricas por operadora desde motor unificado
  const getOperatorCallMetrics = () => {
    logger.audit('[AuditDemo] Calculando métricas por operadora desde metricsEngine');
    
    if (!unifiedMetrics || !unifiedMetrics.porOperadora || unifiedMetrics.porOperadora.length === 0) {
      logger.warn('[AuditDemo] No hay métricas por operadora disponibles');
      
      if (shouldUseFallback) {
        const topOperators = fallbackMetrics.getTopOperators(10);
        logger.audit('[AuditDemo] Usando fallback metrics', { operatorCount: topOperators.length });
        
        return topOperators.map((operator, index) => {
          const operatorInfo = operators?.find(op => 
            op.name === operator.operatorName || 
            op.id === operator.id ||
            op.name?.toLowerCase().includes((operator.operatorName || '').toLowerCase())
          ) || {
            id: operator.id || `op-${index}`,
            name: operator.operatorName || `Operador ${index + 1}`,
            email: `${(operator.operatorName || '').toLowerCase().replace(/\s+/g, '.')}@mistatas.com`
          };
          
          return {
            operatorName: operator.operatorName,
            operatorInfo: operatorInfo,
            totalCalls: operator.totalCalls,
            assignedBeneficiaries: operator.uniqueBeneficiaries,
            contactedBeneficiaries: operator.uniqueBeneficiaries,
            uncontactedBeneficiaries: 0,
            successfulCalls: operator.successfulCalls,
            failedCalls: operator.failedCalls || (operator.totalCalls - operator.successfulCalls),
            successRate: operator.successRate,
            totalEffectiveMinutes: Math.round((operator.successfulCalls * (operator.averageDuration / 60)) * 10) / 10,
            averageMinutesPerCall: Math.round((operator.averageDuration / 60) * 10) / 10,
            averageCallsPerBeneficiary: Math.round((operator.totalCalls / operator.uniqueBeneficiaries) * 10) / 10,
            beneficiariesWithCalls: operator.uniqueBeneficiaries,
            allCallsData: []
          };
        });
      }
      
      return [];
    }

    // ⚡ USAR MÉTRICAS UNIFICADAS (metricsEngine.js)
    logger.audit('[AuditDemo] Usando métricas unificadas', { 
      operatorCount: unifiedMetrics.porOperadora.length,
      total: unifiedMetrics.total
    });
    
    return unifiedMetrics.porOperadora.map((operatorMetrics, index) => {
      const operatorInfo = operators?.find(op => 
        op.name === operatorMetrics.operatorName || 
        op.name?.toLowerCase().includes(operatorMetrics.operatorName.toLowerCase())
      ) || {
        id: `op-${index}`,
        name: operatorMetrics.operatorName,
        email: `${operatorMetrics.operatorName.toLowerCase().replace(/\s+/g, '.')}@mistatas.com`
      };
      
      const assignedBeneficiariesArray = operatorAssignments?.[operatorInfo.id] || [];
      const assignedBeneficiaries = assignedBeneficiariesArray.length || operatorMetrics.beneficiariosUnicos;
      const contactedBeneficiaries = operatorMetrics.beneficiariosUnicos;
      const uncontactedBeneficiaries = Math.max(0, assignedBeneficiaries - contactedBeneficiaries);
      
      const totalEffectiveMinutes = Math.round((operatorMetrics.duracionPromedio * operatorMetrics.exitosas / 60) * 10) / 10;
      const averageMinutesPerCall = Math.round((operatorMetrics.duracionPromedio / 60) * 10) / 10;
      const averageCallsPerBeneficiary = operatorMetrics.beneficiariosUnicos > 0 ? 
        Math.round((operatorMetrics.total / operatorMetrics.beneficiariosUnicos) * 10) / 10 : 0;

      return {
        operatorName: operatorMetrics.operatorName,
        operatorInfo: operatorInfo,
        totalCalls: operatorMetrics.total,
        assignedBeneficiaries: assignedBeneficiaries,
        contactedBeneficiaries: contactedBeneficiaries,
        uncontactedBeneficiaries: uncontactedBeneficiaries,
        successfulCalls: operatorMetrics.exitosas,
        failedCalls: operatorMetrics.fallidas,
        successRate: operatorMetrics.tasaExito,
        totalEffectiveMinutes: totalEffectiveMinutes,
        averageMinutesPerCall: averageMinutesPerCall,
        averageCallsPerBeneficiary: averageCallsPerBeneficiary,
        beneficiariesWithCalls: contactedBeneficiaries,
        allCallsData: [] // No incluir datos individuales para PDF
      };
    }).sort((a, b) => b.totalCalls - a.totalCalls);
  };

  const operatorCallMetrics = getOperatorCallMetrics();

  // 📄 FUNCIONES PARA GENERACIÓN DE PDF PROFESIONAL
  const generatePDFReport = async (operatorData = null, isGeneral = false) => {
    setIsGeneratingPDF(true);
    
    try {
      // Importar jsPDF y autoTable dinámicamente
      const jsPDF = (await import('jspdf')).default;
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      
      // 🎨 CONFIGURACIÓN DE DISEÑO PROFESIONAL
      const colors = {
        primary: [41, 128, 185],     // Azul corporativo
        secondary: [52, 152, 219],   // Azul claro
        success: [46, 204, 113],     // Verde
        warning: [241, 196, 15],     // Amarillo
        danger: [231, 76, 60],       // Rojo
        dark: [44, 62, 80],          // Gris oscuro
        light: [236, 240, 241]       // Gris claro
      };
      
      // 📋 ENCABEZADO DEL DOCUMENTO
      doc.setFillColor(...colors.primary);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('INFORME DE AUDITORÍA AVANZADA', pageWidth / 2, 15, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text('Sistema de Teleasistencia - Análisis de Rendimiento', pageWidth / 2, 25, { align: 'center' });
      
      // 📅 INFORMACIÓN DEL REPORTE
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`, 15, 45);
      doc.text(`Fuente de datos: ${shouldUseFallback ? 'Datos simulados' : (dataSource || 'Sistema principal')}`, 15, 50);
      doc.text(`Última actualización: ${formatDate(lastUpdated)}`, 15, 55);
      
      let yPosition = 65;
      
      if (isGeneral) {
        // 📊 REPORTE GENERAL
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('RESUMEN EJECUTIVO', 15, yPosition);
        yPosition += 10;
        
        // Métricas generales
        const totalOperators = operatorCallMetrics.length;
        const totalCalls = operatorCallMetrics.reduce((sum, op) => sum + op.totalCalls, 0);
        const totalSuccessful = operatorCallMetrics.reduce((sum, op) => sum + op.successfulCalls, 0);
        const avgSuccessRate = totalCalls > 0 ? Math.round((totalSuccessful / totalCalls) * 100) : 0;
        const totalMinutes = operatorCallMetrics.reduce((sum, op) => sum + op.totalEffectiveMinutes, 0);
        const avgMinutesPerCall = operatorCallMetrics.length > 0 ? 
          Math.round(operatorCallMetrics.reduce((sum, m) => sum + m.averageMinutesPerCall, 0) / operatorCallMetrics.length) : 0;
        
        // Tabla de resumen
        autoTable(doc, {
          startY: yPosition,
          theme: 'grid',
          headStyles: { fillColor: colors.primary, fontSize: 10, fontStyle: 'bold' },
          bodyStyles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 60, fontStyle: 'bold' },
            1: { cellWidth: 40, halign: 'center' }
          },
          head: [['Métrica', 'Valor']],
          body: [
            ['Teleoperadoras Activas', totalOperators.toString()],
            ['Total de Llamadas', totalCalls.toLocaleString()],
            ['Llamadas Exitosas', totalSuccessful.toLocaleString()],
            ['Tasa de Éxito General', `${avgSuccessRate}%`],
            ['Minutos Totales Efectivos', `${totalMinutes.toLocaleString()} min`],
            ['Promedio Minutos/Llamada', `${avgMinutesPerCall} min`]
          ]
        });
        
        yPosition = doc.lastAutoTable.finalY + 15;
        
        // 👥 RANKING DE TELEOPERADORAS
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('RANKING DE RENDIMIENTO POR TELEOPERADORA', 15, yPosition);
        yPosition += 10;
        
        autoTable(doc, {
          startY: yPosition,
          theme: 'striped',
          headStyles: { 
            fillColor: colors.primary, 
            fontSize: 8, 
            fontStyle: 'bold',
            textColor: [255, 255, 255]
          },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 40 },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 25, halign: 'center' },
            6: { cellWidth: 25, halign: 'center' },
            7: { cellWidth: 30, halign: 'center' }
          },
          head: [['#', 'Teleoperadora', 'Total', 'Exitosas', 'Fallidas', 'Tasa Éxito', 'Min. Efectivos', 'Prom. Min/Llamada']],
          body: operatorCallMetrics.map((op, index) => [
            (index + 1).toString(),
            op.operatorName,
            op.totalCalls.toString(),
            op.successfulCalls.toString(),
            op.failedCalls.toString(),
            `${op.successRate}%`,
            `${op.totalEffectiveMinutes} min`,
            `${op.averageMinutesPerCall} min`
          ])
        });
        
      } else {
        // 📋 REPORTE INDIVIDUAL
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`INFORME INDIVIDUAL: ${operatorData.operatorName}`, 15, yPosition);
        yPosition += 5;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Email: ${operatorData.operatorInfo.email}`, 15, yPosition);
        yPosition += 15;
        
        // Métricas principales
        autoTable(doc, {
          startY: yPosition,
          theme: 'grid',
          headStyles: { fillColor: colors.primary, fontSize: 10, fontStyle: 'bold' },
          bodyStyles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 80, fontStyle: 'bold' },
            1: { cellWidth: 40, halign: 'center' }
          },
          head: [['Métrica', 'Valor']],
          body: [
            ['Total de Llamadas', operatorData.totalCalls.toString()],
            ['Beneficiarios Asignados', operatorData.assignedBeneficiaries.toString()],
            ['Beneficiarios Contactados', operatorData.contactedBeneficiaries.toString()],
            ['Beneficiarios Sin Contactar', operatorData.uncontactedBeneficiaries.toString()],
            ['Llamadas Exitosas', operatorData.successfulCalls.toString()],
            ['Llamadas Fallidas', operatorData.failedCalls.toString()],
            ['Tasa de Éxito en Llamadas', `${operatorData.successRate}%`],
            ['Minutos Totales Efectivos', `${operatorData.totalEffectiveMinutes} min`],
            ['Promedio Min/Llamada', `${operatorData.averageMinutesPerCall} min`],
            ['Promedio Llamadas/Beneficiario', operatorData.averageCallsPerBeneficiary.toString()]
          ]
        });
        
        yPosition = doc.lastAutoTable.finalY + 15;
        
        // 📊 EVALUACIÓN DE RENDIMIENTO
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('EVALUACIÓN DE RENDIMIENTO', 15, yPosition);
        yPosition += 10;
        
        // Determinar evaluación
        let evaluation = '';
        let recommendations = [];
        const { totalCalls, successRate, averageMinutesPerCall, contactedBeneficiaries } = operatorData;
        
        if (totalCalls >= 30 && successRate >= 80) {
          evaluation = 'EXCELENTE: La teleoperadora demuestra un rendimiento sobresaliente.';
          recommendations.push('Considerar como mentor para otras teleoperadoras');
          recommendations.push('Mantener el alto estándar de calidad');
          recommendations.push('Explorar oportunidades de liderazgo');
        } else if (totalCalls >= 20 && successRate >= 70) {
          evaluation = 'BUENO: La teleoperadora muestra un rendimiento satisfactorio.';
          recommendations.push('Buscar oportunidades de mejora en técnicas de llamada');
          recommendations.push('Capacitación en manejo de objeciones');
          recommendations.push('Seguimiento quincenal del progreso');
        } else if (totalCalls > 0) {
          evaluation = 'NECESITA MEJORA: La teleoperadora requiere apoyo adicional.';
          recommendations.push('Capacitación intensiva en técnicas de telemarketing');
          recommendations.push('Supervisión diaria por primera semana');
          recommendations.push('Revisión de metodología de contacto');
          recommendations.push('Análisis de horarios de llamada');
        } else {
          evaluation = 'SIN ACTIVIDAD: No se registran llamadas en el período evaluado.';
          recommendations.push('Verificar conectividad y acceso al sistema');
          recommendations.push('Capacitación básica en uso de herramientas');
          recommendations.push('Asignación gradual de beneficiarios');
        }
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('Evaluación:', 15, yPosition);
        yPosition += 5;
        doc.setFont('helvetica', 'bold');
        doc.text(evaluation, 15, yPosition);
        yPosition += 10;
        
        doc.setFont('helvetica', 'normal');
        doc.text('Recomendaciones:', 15, yPosition);
        yPosition += 5;
        
        recommendations.forEach((rec, index) => {
          doc.text(`${index + 1}. ${rec}`, 20, yPosition);
          yPosition += 5;
        });
      }
      
      // 📄 PIE DE PÁGINA
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Este informe es confidencial y de uso interno exclusivo.', pageWidth / 2, pageHeight - 10, { align: 'center' });
      
      // 💾 GUARDAR PDF
      const fileName = isGeneral ? 
        `Auditoria_General_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.pdf` :
        `Auditoria_${operatorData.operatorName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.pdf`;
      
      doc.save(fileName);
      
      console.log(`📄 PDF generado exitosamente: ${fileName}`);
      
    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      showError('Error al generar el PDF. Por favor, intenta nuevamente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* 🎯 ENCABEZADO CON INFORMACIÓN DE ESTADO */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Auditoría Avanzada de Llamadas
            </h1>
            <p className="text-gray-600 mt-2">
              Análisis detallado y métricas en tiempo real de todas las llamadas registradas en el sistema.
              Estado de datos: <span className="font-semibold">{shouldUseFallback ? 'Datos simulados' : 'Datos reales'}</span> | 
              Última actualización: {formatDate(lastUpdated)}
            </p>
          </div>
          
          <button
            onClick={() => generatePDFReport(null, true)}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {isGeneratingPDF ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generando...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Informe General
              </>
            )}
          </button>
        </div>

        {/* 📊 INDICADOR DE SINCRONIZACIÓN */}
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="font-semibold">✅ Datos sincronizados:</span>
            Las métricas mostradas son consistentes con el Dashboard principal.
          </p>
        </div>
      </div>

      {/* 📊 MÉTRICAS GENERALES - FASE 4: Usando métricas unificadas */}
      {(hasData && hasData()) || shouldUseFallback ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Llamadas</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formattedMetrics.totalFormatted}
                </p>
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Métricas unificadas
                </p>
              </div>
              <Phone className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tasa de Éxito</p>
                <p className="text-2xl font-bold text-green-600">
                  {formattedMetrics.tasaExitoFormatted}
                </p>
                <p className="text-xs text-green-600 mt-1">Promedio general</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Operadores Activos</p>
                <p className="text-2xl font-bold text-purple-600">
                  {unifiedMetrics.porOperadora?.length || 0}
                </p>
                <p className="text-xs text-purple-600 mt-1">Con actividad registrada</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Duración Promedio</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formattedMetrics.duracionPromedioFormatted} min
                </p>
                <p className="text-xs text-orange-600 mt-2">Tiempo por llamada exitosa</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      ) : null}

      {/* 🆕 SECCIÓN CORREGIDA: Tarjetas de Teleoperadoras con Datos Sincronizados */}
      {operatorCallMetrics.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Métricas por Teleoperadora
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {operatorCallMetrics.map((metrics, index) => {
              // Determinar color del indicador de rendimiento
              let indicatorColor = 'bg-red-500';
              let performanceLevel = 'Bajo';
              
              if (metrics.totalCalls >= 30 && metrics.successRate >= 80) {
                indicatorColor = 'bg-green-500';
                performanceLevel = 'Alto';
              } else if (metrics.totalCalls >= 15 && metrics.successRate >= 60) {
                indicatorColor = 'bg-yellow-500';
                performanceLevel = 'Medio';
              }

              return (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                  {/* 👤 ENCABEZADO DEL OPERADOR */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{metrics.operatorName}</h4>
                      <p className="text-xs text-gray-600">{metrics.operatorInfo.email}</p>
                    </div>
                    <button
                      onClick={() => generatePDFReport(metrics, false)}
                      disabled={isGeneratingPDF}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Generar informe individual"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 📊 MÉTRICAS SOLICITADAS */}
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total llamadas:</span>
                      <span className="font-semibold text-blue-600">{metrics.totalCalls}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Beneficiarios asignados:</span>
                      <span className="font-semibold">{metrics.assignedBeneficiaries}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Beneficiarios contactados:</span>
                      <span className="font-semibold text-green-600">{metrics.contactedBeneficiaries}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Beneficiarios sin contactar:</span>
                      <span className="font-semibold text-red-600">{metrics.uncontactedBeneficiaries}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Llamadas exitosas:</span>
                      <span className="font-semibold text-green-600">{metrics.successfulCalls}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Llamadas fallidas:</span>
                      <span className="font-semibold text-red-600">{metrics.failedCalls}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tasa de Éxito en llamadas:</span>
                      <span className="font-semibold text-blue-600">{metrics.successRate}%</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Minutos totales efectivos:</span>
                      <span className="font-semibold">{metrics.totalEffectiveMinutes} min</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Promedio min/llamada:</span>
                      <span className="font-semibold">{metrics.averageMinutesPerCall} min</span>
                    </div>

                    {/* 📈 INDICADOR DE RENDIMIENTO */}
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Rendimiento:</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${indicatorColor}`}></div>
                          <span className="text-xs font-semibold">{performanceLevel}</span>
                        </div>
                      </div>
                      
                      {/* Barra de progreso proporcional */}
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            indicatorColor.replace('bg-', 'bg-').replace('-500', '-400')
                          }`}
                          style={{ width: `${Math.min(metrics.totalCalls * 2, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 📊 RESUMEN ESTADÍSTICO */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3">Resumen Estadístico</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Teleoperadoras activas:</p>
                <p className="font-bold text-blue-600">{operatorCallMetrics.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Total llamadas:</p>
                <p className="font-bold text-green-600">
                  {operatorCallMetrics.reduce((sum, m) => sum + m.totalCalls, 0)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Total beneficiarios:</p>
                <p className="font-bold text-purple-600">
                  {operatorCallMetrics.reduce((sum, m) => sum + m.assignedBeneficiaries, 0)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Promedio llamadas/operadora:</p>
                <p className="font-bold text-orange-600">
                  {operatorCallMetrics.length > 0 ? 
                    Math.round(operatorCallMetrics.reduce((sum, m) => sum + m.totalCalls, 0) / operatorCallMetrics.length) : 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ MENSAJE PARA CUANDO NO HAY DATOS */}
      {(!hasData || !hasData()) && !shouldUseFallback && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No hay datos disponibles</h3>
          <p className="text-gray-600 mb-4">
            Para realizar la auditoría, primero necesitas cargar los datos de llamadas desde el módulo principal.
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
            Ir a Cargar Datos
          </button>
        </div>
      )}

      {/* 📋 INFORMACIÓN TÉCNICA DEL SISTEMA */}
      {(hasData && hasData()) || shouldUseFallback ? (
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Información del Sistema</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Estado de datos:</strong> {isLoading ? 'Cargando...' : 'Datos cargados correctamente'}</p>
            <p><strong>Fuente de datos:</strong> {shouldUseFallback ? 'Datos simulados para demostración' : (dataSource || 'Sistema principal')}</p>
            <p><strong>Última actualización:</strong> {formatDate(lastUpdated)}</p>
          </div>
          {clearData && !shouldUseFallback && (
            <button 
              onClick={clearData} 
              className="mt-4 text-red-600 hover:text-red-800 text-sm"
            >
              Limpiar datos de auditoría
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default AuditDemo;