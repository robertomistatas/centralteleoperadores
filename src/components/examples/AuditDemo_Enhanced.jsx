import React, { useEffect, useState } from 'react';
import { useCallStore, useAppStore } from '../../stores';
import { BarChart3, FileSpreadsheet, TrendingUp, Users, Clock, Phone, User, Download, FileText, Printer } from 'lucide-react';
import { findOperatorForBeneficiary, shouldExcludeAsOperator } from '../../utils/operatorMapping';

function AuditDemo() {
  const {
    callData,
    callMetrics,
    processedData,
    isLoading,
    lastUpdated,
    dataSource,
    clearData,
    hasData,
    getSuccessRate,
    getOperatorMetrics,
    getHourlyDistribution,
    getFollowUpData
  } = useCallStore();

  const {
    operators,
    operatorAssignments,
    getAllAssignments
  } = useAppStore();

  // Estado para controlar la exportación de PDFs
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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

  // 🎯 MEJORA CRÍTICA: Cálculo Completo de Métricas por Teleoperadora
  const getOperatorCallMetrics = () => {
    console.log('🔍 [AUDIT ENHANCED] === CÁLCULO COMPLETO DE MÉTRICAS ===');
    console.log('📞 [AUDIT] Datos disponibles:', processedData?.length || 0);
    console.log('👥 [AUDIT] Operadores disponibles:', operators?.length || 0);
    console.log('📋 [AUDIT] Asignaciones disponibles:', operatorAssignments ? Object.keys(operatorAssignments).length : 0);
    
    if (!processedData || processedData.length === 0 || !operators || operators.length === 0) {
      console.log('⚠️ [AUDIT] Sin datos suficientes para análisis');
      return [];
    }

    // 🔍 PASO 1: Analizar las llamadas y mapearlas a operadores usando las utilidades
    const operatorMetrics = {};
    let mappedCalls = 0;
    let unmappedCalls = 0;
    let excludedCalls = 0;

    processedData.forEach((call, index) => {
      const beneficiaryName = call.beneficiario || call.beneficiary || '';
      
      // Debug de las primeras 5 llamadas
      if (index < 5) {
        console.log(`🔍 [AUDIT] Llamada ${index}: beneficiario="${beneficiaryName}"`);
      }

      // Verificar si el "operador" en los datos es realmente un estado
      const operatorFromCall = call.operador || call.operator || call.teleoperadora;
      if (operatorFromCall && shouldExcludeAsOperator(operatorFromCall)) {
        excludedCalls++;
        if (index < 10) {
          console.log(`❌ [AUDIT] Excluido estado como operador: "${operatorFromCall}"`);
        }
      }

      // Buscar operador asignado para este beneficiario usando las utilidades
      const operatorMapping = findOperatorForBeneficiary(beneficiaryName, operatorAssignments, operators);
      
      if (operatorMapping) {
        mappedCalls++;
        const operatorName = operatorMapping.operatorName;
        
        if (!operatorMetrics[operatorName]) {
          operatorMetrics[operatorName] = {
            operatorInfo: operatorMapping.operatorInfo,
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            totalDuration: 0,
            totalDurationEffective: 0, // Duración de llamadas exitosas
            contactedBeneficiaries: new Set(),
            allCalls: []
          };
        }
        
        const metrics = operatorMetrics[operatorName];
        metrics.totalCalls++;
        metrics.contactedBeneficiaries.add(beneficiaryName);
        metrics.allCalls.push(call);
        
        // Clasificar éxito/fallo de manera más robusta
        const isSuccessful = call.isSuccessful || 
                           call.categoria === 'exitosa' || 
                           call.resultado === 'Llamado exitoso' ||
                           call.estado === 'Contactado' ||
                           call.result === 'successful' ||
                           (call.duration && call.duration > 0) ||
                           (call.duracion && call.duracion > 0);
        
        if (isSuccessful) {
          metrics.successfulCalls++;
          // Solo contabilizar duración de llamadas exitosas para el promedio efectivo
          const duration = call.duracion || call.duration || 0;
          metrics.totalDurationEffective += duration;
        } else {
          metrics.failedCalls++;
        }
        
        // Duración total (exitosas + fallidas)
        metrics.totalDuration += (call.duracion || call.duration || 0);
      } else {
        unmappedCalls++;
        if (index < 10) { // Log solo las primeras 10 para no saturar
          console.log(`⚠️ [AUDIT] Llamada sin mapeo: beneficiario="${beneficiaryName}"`);
        }
      }
    });

    console.log(`📊 [AUDIT] Resultado del mapeo: ${mappedCalls} mapeadas, ${unmappedCalls} sin mapeo, ${excludedCalls} excluidas`);
    console.log(`📊 [AUDIT] Operadores con actividad:`, Object.keys(operatorMetrics));

    // 🔢 PASO 2: Completar métricas y calcular todas las estadísticas solicitadas
    const result = Object.entries(operatorMetrics).map(([operatorName, metrics]) => {
      // Contar beneficiarios asignados reales desde operatorAssignments
      const operatorId = metrics.operatorInfo.id;
      const assignedBeneficiariesArray = operatorAssignments?.[operatorId] || [];
      const assignedBeneficiaries = assignedBeneficiariesArray.length;
      
      // Calcular beneficiarios sin contactar
      const contactedBeneficiariesArray = Array.from(metrics.contactedBeneficiaries);
      const uncontactedBeneficiaries = assignedBeneficiaries - contactedBeneficiariesArray.length;
      
      // Calcular promedios
      const averageCallsPerBeneficiary = assignedBeneficiaries > 0 
        ? Math.round((metrics.totalCalls / assignedBeneficiaries) * 10) / 10
        : 0;
      
      // Promedio de minutos por llamada (solo llamadas exitosas)
      const averageMinutesPerCall = metrics.successfulCalls > 0 
        ? Math.round((metrics.totalDurationEffective / metrics.successfulCalls / 60) * 10) / 10
        : 0;
      
      // Minutos totales hablados efectivos (convertir segundos a minutos)
      const totalEffectiveMinutes = Math.round((metrics.totalDurationEffective / 60) * 10) / 10;
      
      // Tasa de éxito
      const successRate = metrics.totalCalls > 0 
        ? Math.round((metrics.successfulCalls / metrics.totalCalls) * 100) 
        : 0;

      return {
        operatorName: operatorName,
        operatorInfo: metrics.operatorInfo,
        // Métricas principales solicitadas
        totalCalls: metrics.totalCalls,
        assignedBeneficiaries: assignedBeneficiaries,
        contactedBeneficiaries: contactedBeneficiariesArray.length,
        uncontactedBeneficiaries: Math.max(0, uncontactedBeneficiaries),
        successfulCalls: metrics.successfulCalls,
        failedCalls: metrics.failedCalls,
        successRate: successRate,
        totalEffectiveMinutes: totalEffectiveMinutes,
        averageMinutesPerCall: averageMinutesPerCall,
        // Métricas adicionales
        averageCallsPerBeneficiary: averageCallsPerBeneficiary,
        beneficiariesWithCalls: metrics.contactedBeneficiaries.size,
        allCallsData: metrics.allCalls // Para análisis detallado y PDF
      };
    });

    // 🔄 PASO 3: Incluir operadores sin actividad
    if (operators) {
      operators.forEach(operator => {
        if (!operatorMetrics[operator.name]) {
          const assignedBeneficiariesArray = operatorAssignments?.[operator.id] || [];
          const assignedBeneficiaries = assignedBeneficiariesArray.length;
          
          result.push({
            operatorName: operator.name,
            operatorInfo: operator,
            // Métricas principales solicitadas
            totalCalls: 0,
            assignedBeneficiaries: assignedBeneficiaries,
            contactedBeneficiaries: 0,
            uncontactedBeneficiaries: assignedBeneficiaries,
            successfulCalls: 0,
            failedCalls: 0,
            successRate: 0,
            totalEffectiveMinutes: 0,
            averageMinutesPerCall: 0,
            // Métricas adicionales
            averageCallsPerBeneficiary: 0,
            beneficiariesWithCalls: 0,
            allCallsData: [] // Para análisis detallado y PDF
          });
        }
      });
    }

    console.log('✅ [AUDIT] Métricas finales calculadas:', result.length, 'operadores');
    result.forEach((r, index) => {
      console.log(`  ${index + 1}. "${r.operatorName}": ${r.totalCalls} llamadas (${r.successfulCalls} exitosas), ${r.assignedBeneficiaries} asignados, ${r.contactedBeneficiaries} contactados`);
    });

    return result.sort((a, b) => b.totalCalls - a.totalCalls); // Ordenar por total de llamadas
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
      
      // 📋 ENCABEZADO PROFESIONAL
      const addHeader = (title) => {
        // Fondo del encabezado
        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, pageWidth, 30, 'F');
        
        // Logo/Título
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('CENTRO DE TELEASISTENCIA', 20, 12);
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text(title, 20, 22);
        
        // Fecha y hora
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-CL', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        const timeStr = now.toLocaleTimeString('es-CL');
        
        doc.setFontSize(10);
        doc.text(`Generado: ${dateStr} - ${timeStr}`, pageWidth - 20, 12, { align: 'right' });
        doc.text(`Página 1`, pageWidth - 20, 22, { align: 'right' });
        
        return 40; // Altura del encabezado
      };
      
      // 📊 PIE DE PÁGINA PROFESIONAL
      const addFooter = () => {
        const footerY = pageHeight - 20;
        doc.setFillColor(...colors.light);
        doc.rect(0, footerY - 5, pageWidth, 20, 'F');
        
        doc.setTextColor(...colors.dark);
        doc.setFontSize(9);
        doc.text('Este documento es confidencial y de uso interno exclusivo', pageWidth / 2, footerY, { align: 'center' });
        doc.text('Centro de Teleasistencia - Seguimiento y Auditoría', pageWidth / 2, footerY + 7, { align: 'center' });
      };

      if (isGeneral) {
        // 📊 INFORME GENERAL DE TODAS LAS TELEOPERADORAS
        let yPosition = addHeader('INFORME GENERAL DE AUDITORÍA');
        
        // Resumen ejecutivo
        doc.setTextColor(...colors.dark);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMEN EJECUTIVO', 20, yPosition);
        yPosition += 10;
        
        const totalOperators = operatorCallMetrics.length;
        const totalCallsSum = operatorCallMetrics.reduce((sum, m) => sum + m.totalCalls, 0);
        const totalAssignedSum = operatorCallMetrics.reduce((sum, m) => sum + m.assignedBeneficiaries, 0);
        const totalContactedSum = operatorCallMetrics.reduce((sum, m) => sum + m.contactedBeneficiaries, 0);
        const totalSuccessfulSum = operatorCallMetrics.reduce((sum, m) => sum + m.successfulCalls, 0);
        const avgSuccessRate = totalCallsSum > 0 ? Math.round((totalSuccessfulSum / totalCallsSum) * 100) : 0;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        const summaryData = [
          ['Teleoperadoras Activas', totalOperators.toString()],
          ['Total de Llamadas Realizadas', totalCallsSum.toLocaleString()],
          ['Beneficiarios Asignados', totalAssignedSum.toLocaleString()],
          ['Beneficiarios Contactados', totalContactedSum.toLocaleString()],
          ['Llamadas Exitosas', totalSuccessfulSum.toLocaleString()],
          ['Tasa de Éxito General', `${avgSuccessRate}%`],
          ['Cobertura de Contacto', `${totalAssignedSum > 0 ? Math.round((totalContactedSum / totalAssignedSum) * 100) : 0}%`]
        ];
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Métrica', 'Valor']],
          body: summaryData,
          theme: 'striped',
          headStyles: { fillColor: colors.primary, textColor: [255, 255, 255] },
          styles: { fontSize: 10 },
          margin: { left: 20, right: 20 }
        });
        
        yPosition = doc.lastAutoTable.finalY + 20;
        
        // Tabla detallada de teleoperadoras
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('DETALLE POR TELEOPERADORA', 20, yPosition);
        yPosition += 10;
        
        const tableData = operatorCallMetrics.map(m => [
          m.operatorName,
          m.totalCalls.toString(),
          m.assignedBeneficiaries.toString(),
          m.contactedBeneficiaries.toString(),
          m.uncontactedBeneficiaries.toString(),
          m.successfulCalls.toString(),
          m.failedCalls.toString(),
          `${m.successRate}%`,
          `${m.totalEffectiveMinutes} min`,
          `${m.averageMinutesPerCall} min`
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [[
            'Teleoperadora',
            'Total Llamadas',
            'Asignados',
            'Contactados',
            'Sin Contactar',
            'Exitosas',
            'Fallidas',
            'Tasa Éxito',
            'Min. Efectivos',
            'Prom/Llamada'
          ]],
          body: tableData,
          theme: 'grid',
          headStyles: { 
            fillColor: colors.secondary, 
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold'
          },
          styles: { 
            fontSize: 8,
            cellPadding: 2
          },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 15, halign: 'center' },
            2: { cellWidth: 15, halign: 'center' },
            3: { cellWidth: 15, halign: 'center' },
            4: { cellWidth: 15, halign: 'center' },
            5: { cellWidth: 15, halign: 'center' },
            6: { cellWidth: 15, halign: 'center' },
            7: { cellWidth: 15, halign: 'center' },
            8: { cellWidth: 20, halign: 'center' },
            9: { cellWidth: 20, halign: 'center' }
          },
          margin: { left: 10, right: 10 },
          didDrawCell: function(data) {
            // Resaltar filas según rendimiento
            if (data.section === 'body' && data.column.index === 7) {
              const rate = parseInt(data.cell.text[0]);
              if (rate >= 80) {
                doc.setFillColor(...colors.success);
              } else if (rate >= 60) {
                doc.setFillColor(...colors.warning);
              } else if (rate < 60 && rate > 0) {
                doc.setFillColor(...colors.danger);
              }
              
              if (rate > 0) {
                doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                doc.setTextColor(255, 255, 255);
                doc.text(data.cell.text, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, {
                  align: 'center',
                  baseline: 'middle'
                });
              }
            }
          }
        });
        
      } else if (operatorData) {
        // 👤 INFORME INDIVIDUAL DE TELEOPERADORA
        let yPosition = addHeader(`INFORME INDIVIDUAL - ${operatorData.operatorName.toUpperCase()}`);
        
        // Información personal
        doc.setTextColor(...colors.dark);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMACIÓN DE LA TELEOPERADORA', 20, yPosition);
        yPosition += 10;
        
        const operatorInfo = [
          ['Nombre Completo', operatorData.operatorName],
          ['Email', operatorData.operatorInfo?.email || `${operatorData.operatorName.toLowerCase().replace(/\s+/g, '.')}@mistatas.com`],
          ['Fecha del Informe', new Date().toLocaleDateString('es-CL')],
          ['Período Evaluado', dataSource || 'Datos actuales cargados']
        ];
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Campo', 'Información']],
          body: operatorInfo,
          theme: 'plain',
          headStyles: { fillColor: colors.primary, textColor: [255, 255, 255] },
          styles: { fontSize: 11 },
          margin: { left: 20, right: 20 }
        });
        
        yPosition = doc.lastAutoTable.finalY + 20;
        
        // Métricas principales
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('MÉTRICAS DE RENDIMIENTO', 20, yPosition);
        yPosition += 10;
        
        const metricsData = [
          ['Total de Llamadas Realizadas', operatorData.totalCalls.toString()],
          ['Beneficiarios Asignados', operatorData.assignedBeneficiaries.toString()],
          ['Beneficiarios Contactados', operatorData.contactedBeneficiaries.toString()],
          ['Beneficiarios Sin Contactar', operatorData.uncontactedBeneficiaries.toString()],
          ['Llamadas Exitosas', operatorData.successfulCalls.toString()],
          ['Llamadas Fallidas', operatorData.failedCalls.toString()],
          ['Tasa de Éxito en Llamadas', `${operatorData.successRate}%`],
          ['Minutos Totales Hablados Efectivos', `${operatorData.totalEffectiveMinutes} minutos`],
          ['Promedio de Minutos por Llamada', `${operatorData.averageMinutesPerCall} minutos`],
          ['Promedio de Llamadas por Beneficiario', operatorData.averageCallsPerBeneficiary.toString()]
        ];
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Métrica', 'Valor']],
          body: metricsData,
          theme: 'striped',
          headStyles: { fillColor: colors.secondary, textColor: [255, 255, 255] },
          styles: { fontSize: 11 },
          margin: { left: 20, right: 20 },
          didDrawCell: function(data) {
            // Resaltar métricas importantes
            if (data.section === 'body' && data.column.index === 0) {
              const metricName = data.cell.text[0];
              if (metricName.includes('Tasa de Éxito')) {
                const rate = parseInt(operatorData.successRate);
                if (rate >= 80) {
                  doc.setFillColor(...colors.success);
                } else if (rate >= 60) {
                  doc.setFillColor(...colors.warning);
                } else if (rate > 0) {
                  doc.setFillColor(...colors.danger);
                }
                doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
                doc.setTextColor(255, 255, 255);
                doc.text(data.cell.text, data.cell.x + 5, data.cell.y + data.cell.height / 2, {
                  baseline: 'middle'
                });
              }
            }
          }
        });
        
        yPosition = doc.lastAutoTable.finalY + 20;
        
        // Evaluación y recomendaciones
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('EVALUACIÓN Y RECOMENDACIONES', 20, yPosition);
        yPosition += 10;
        
        const getPerformanceEvaluation = (metrics) => {
          const { successRate, totalCalls, contactedBeneficiaries, assignedBeneficiaries } = metrics;
          
          let evaluation = '';
          let recommendations = [];
          
          if (successRate >= 80 && totalCalls >= 20) {
            evaluation = 'EXCELENTE: La teleoperadora demuestra un rendimiento excepcional.';
            recommendations.push('Continuar con las buenas prácticas actuales');
            recommendations.push('Considerar como mentora para otras teleoperadoras');
            recommendations.push('Evaluar para reconocimiento por desempeño');
          } else if (successRate >= 60 && totalCalls >= 10) {
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
            recommendations.push('Revisión de asignaciones de beneficiarios');
            recommendations.push('Capacitación básica en uso del sistema');
          }
          
          return { evaluation, recommendations };
        };
        
        const { evaluation, recommendations } = getPerformanceEvaluation(operatorData);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Evaluación General:', 20, yPosition);
        yPosition += 7;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        const splitEvaluation = doc.splitTextToSize(evaluation, pageWidth - 40);
        doc.text(splitEvaluation, 20, yPosition);
        yPosition += splitEvaluation.length * 5 + 10;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Recomendaciones:', 20, yPosition);
        yPosition += 7;
        
        doc.setFont('helvetica', 'normal');
        recommendations.forEach((rec, index) => {
          doc.text(`${index + 1}. ${rec}`, 25, yPosition);
          yPosition += 5;
        });
      }
      
      // Agregar pie de página
      addFooter();
      
      // Generar y descargar el PDF
      const fileName = isGeneral 
        ? `Informe_General_Auditoria_${new Date().toISOString().split('T')[0]}.pdf`
        : `Informe_${operatorData.operatorName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor, inténtelo nuevamente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header - Auditoría Avanzada */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Auditoría Avanzada de Llamadas
            </h2>
            <p className="text-gray-600">
              Análisis detallado y métricas en tiempo real de todas las llamadas registradas en el sistema.
              Estado de datos: <span className="font-semibold">{hasData && hasData() ? 'Datos cargados' : 'Sin datos'}</span>
              {lastUpdated && ` | Última actualización: ${formatDate(lastUpdated)}`}
            </p>
          </div>
          
          {/* 📊 CONTROLES DE EXPORTACIÓN */}
          {operatorCallMetrics.length > 0 && (
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => generatePDFReport(null, true)}
                disabled={isGeneratingPDF}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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
          )}
        </div>
      </div>

      {/* Métricas Principales */}
      {hasData && hasData() && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-blue-800 mb-1">Total Llamadas</h4>
                <p className="text-2xl font-bold text-blue-600">{callMetrics?.totalCalls || 0}</p>
              </div>
              <Phone className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-xs text-blue-600 mt-2">Registros procesados</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-green-800 mb-1">Tasa de Éxito</h4>
                <p className="text-2xl font-bold text-green-600">{getSuccessRate ? getSuccessRate() : 0}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-green-600 mt-2">Llamadas exitosas</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-purple-800 mb-1">Operadores Activos</h4>
                <p className="text-2xl font-bold text-purple-600">{operatorCallMetrics?.length || 0}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-xs text-purple-600 mt-2">Con actividad registrada</p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-orange-800 mb-1">Duración Promedio</h4>
                <p className="text-2xl font-bold text-orange-600">
                  {formatDuration(callMetrics?.averageDuration || 0)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-xs text-orange-600 mt-2">Tiempo por llamada</p>
          </div>
        </div>
      )}

      {/* 🆕 SECCIÓN MEJORADA: Tarjetas de Teleoperadoras con Métricas Completas */}
      {operatorCallMetrics.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Métricas por Teleoperadora
          </h3>
          
          {/* Mostrar estado de datos */}
          <div className="mb-4">
            {!hasData || !hasData() ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <p className="text-blue-700 text-sm">
                    <span className="font-medium">Modo Asignaciones:</span> Mostrando teleoperadoras con sus asignaciones actuales. 
                    <span className="font-medium">Carga datos de llamadas</span> para ver métricas completas.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-green-700 text-sm">
                      <span className="font-medium">Datos Completos:</span> Mostrando métricas extraídas directamente de llamadas.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {operatorCallMetrics.map((metrics, index) => (
              <div 
                key={metrics.operatorName} 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-indigo-50"
              >
                {/* Header de la tarjeta */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-sm">
                      {metrics.operatorName}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {metrics.operatorInfo?.email || `${metrics.operatorName.toLowerCase().replace(/\s+/g, '.')}@mistatas.com`}
                    </p>
                  </div>
                  
                  {/* Botón de informe individual */}
                  {hasData && hasData() && metrics.totalCalls > 0 && (
                    <button
                      onClick={() => generatePDFReport(metrics, false)}
                      disabled={isGeneratingPDF}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
                      title="Generar informe individual"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* 📊 MÉTRICAS MEJORADAS SEGÚN ESPECIFICACIONES */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total llamadas:</span>
                    <span className="font-bold text-lg text-blue-600">
                      {metrics.totalCalls}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Beneficiarios asignados:</span>
                    <span className="font-medium text-gray-700">
                      {metrics.assignedBeneficiaries}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Beneficiarios contactados:</span>
                    <span className="font-medium text-green-600">
                      {metrics.contactedBeneficiaries}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Beneficiarios sin contactar:</span>
                    <span className="font-medium text-red-600">
                      {metrics.uncontactedBeneficiaries}
                    </span>
                  </div>
                  
                  {hasData && hasData() && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Llamadas exitosas:</span>
                        <span className="font-medium text-green-600">
                          {metrics.successfulCalls}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Llamadas fallidas:</span>
                        <span className="font-medium text-red-600">
                          {metrics.failedCalls}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Tasa de Éxito en llamadas:</span>
                        <span className={`font-bold ${
                          metrics.successRate >= 80 ? 'text-green-600' :
                          metrics.successRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {metrics.successRate}%
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Minutos totales efectivos:</span>
                        <span className="font-medium text-blue-600">
                          {metrics.totalEffectiveMinutes} min
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Promedio min/llamada:</span>
                        <span className="font-medium text-blue-600">
                          {metrics.averageMinutesPerCall} min
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Indicador de rendimiento */}
                <div className="mt-4 pt-3 border-t border-gray-200">
                  {hasData && hasData() ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Rendimiento:</span>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          metrics.totalCalls >= 20 
                            ? 'bg-green-100 text-green-800' 
                            : metrics.totalCalls >= 10 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {metrics.totalCalls >= 20 ? 'Alto' : 
                           metrics.totalCalls >= 10 ? 'Medio' : 'Bajo'}
                        </div>
                      </div>
                      
                      {/* Barra de progreso visual */}
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            metrics.totalCalls >= 20 ? 'bg-green-500' : 
                            metrics.totalCalls >= 10 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ 
                            width: `${Math.min((metrics.totalCalls / 30) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <span className="text-xs text-gray-400">
                        {metrics.assignedBeneficiaries > 0 
                          ? `✅ ${metrics.assignedBeneficiaries} beneficiarios asignados`
                          : '⚠️ Sin asignaciones'
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Resumen estadístico */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Resumen Estadístico</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Teleoperadoras:</span>
                <span className="font-bold text-blue-600 ml-2">
                  {operatorCallMetrics.length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Llamadas Totales:</span>
                <span className="font-bold text-blue-600 ml-2">
                  {operatorCallMetrics.reduce((sum, m) => sum + m.totalCalls, 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Beneficiarios Totales:</span>
                <span className="font-bold text-blue-600 ml-2">
                  {operatorCallMetrics.reduce((sum, m) => sum + m.assignedBeneficiaries, 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Promedio General:</span>
                <span className="font-bold text-blue-600 ml-2">
                  {operatorCallMetrics.length > 0 
                    ? Math.round(operatorCallMetrics.reduce((sum, m) => sum + m.totalCalls, 0) / operatorCallMetrics.length * 10) / 10
                    : 0
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay teleoperadoras creadas */}
      {operatorCallMetrics.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Métricas por Teleoperadora
          </h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-yellow-500" />
              <div>
                <h4 className="text-yellow-800 font-medium">No hay teleoperadoras disponibles</h4>
                <p className="text-yellow-700 text-sm mt-1">
                  Para ver las métricas por teleoperadora, necesitas:
                </p>
                <ul className="text-yellow-700 text-sm mt-2 list-disc list-inside">
                  <li>Crear teleoperadoras en el módulo "Asignaciones"</li>
                  <li>Asignar beneficiarios a las teleoperadoras</li>
                  <li>Opcionalmente, cargar datos de llamadas para métricas completas</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estado Sin Datos */}
      {(!hasData || !hasData()) && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No hay datos de auditoría disponibles
          </h3>
          <p className="text-gray-500 mb-4">
            Sube un archivo Excel en la sección "Registro de Llamadas" para comenzar
            el análisis de auditoría avanzada.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-800 text-sm">
              💡 <strong>Tip:</strong> Una vez que subas datos, verás métricas detalladas,
              análisis por operador y distribución temporal de llamadas.
            </p>
          </div>
        </div>
      )}

      {/* Controles de Datos */}
      {hasData && hasData() && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <p><strong>Fuente de datos:</strong> {dataSource || 'Desconocida'}</p>
              <p><strong>Última actualización:</strong> {formatDate(lastUpdated)}</p>
            </div>
            {clearData && (
              <button
                onClick={clearData}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                🗑️ Limpiar Datos
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditDemo;