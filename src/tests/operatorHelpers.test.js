/**
 * operatorHelpers.test.js
 * 
 * Tests unitarios para operatorHelpers
 * Verifican la corrección del bug crítico donde resultados de llamadas
 * aparecían como nombres de teleoperadoras
 */

import { describe, it, expect } from 'vitest';
import {
  isCallResult,
  getOperatorNameFromRecord,
  getDisplayOperatorName,
  normalizeOperatorFields
} from '../operatorHelpers';

describe('operatorHelpers - isCallResult', () => {
  it('debe detectar "Llamado exitoso" como resultado', () => {
    expect(isCallResult('Llamado exitoso')).toBe(true);
    expect(isCallResult('llamado exitoso')).toBe(true);
    expect(isCallResult('LLAMADO EXITOSO')).toBe(true);
  });
  
  it('debe detectar resultados fallidos', () => {
    expect(isCallResult('No contesta')).toBe(true);
    expect(isCallResult('ocupado')).toBe(true);
    expect(isCallResult('No responde')).toBe(true);
    expect(isCallResult('fallida')).toBe(true);
  });
  
  it('debe detectar "Contactado" como resultado', () => {
    expect(isCallResult('Contactado')).toBe(true);
    expect(isCallResult('contactada')).toBe(true);
  });
  
  it('NO debe detectar nombres válidos como resultados', () => {
    expect(isCallResult('Carolina González')).toBe(false);
    expect(isCallResult('Sara López')).toBe(false);
    expect(isCallResult('María Teresa')).toBe(false);
    expect(isCallResult('Javiera Riquelme')).toBe(false);
  });
});

describe('operatorHelpers - getOperatorNameFromRecord', () => {
  it('debe extraer operatorName válido', () => {
    const record = {
      operatorName: 'Carolina González',
      resultado: 'Llamado exitoso'
    };
    expect(getOperatorNameFromRecord(record)).toBe('Carolina González');
  });
  
  it('debe rechazar resultado de llamada en campo operatorName', () => {
    const record = {
      operatorName: 'Llamado exitoso',
      resultado: 'exitosa'
    };
    expect(getOperatorNameFromRecord(record)).toBe('No asignado');
  });
  
  it('debe rechazar "Contactado" como operatorName', () => {
    const record = {
      operatorName: 'Contactado',
      resultado: 'exitosa'
    };
    expect(getOperatorNameFromRecord(record)).toBe('No asignado');
  });
  
  it('debe buscar en campos alternativos (operador, teleoperadora)', () => {
    const record1 = { operador: 'Sara López' };
    expect(getOperatorNameFromRecord(record1)).toBe('Sara López');
    
    const record2 = { teleoperadora: 'María González' };
    expect(getOperatorNameFromRecord(record2)).toBe('María González');
  });
  
  it('debe retornar fallback si no hay nombre válido', () => {
    const record = {
      resultado: 'exitosa',
      beneficiario: 'Juan Pérez'
    };
    expect(getOperatorNameFromRecord(record)).toBe('No asignado');
  });
  
  it('debe usar fallback personalizado', () => {
    const record = {};
    expect(getOperatorNameFromRecord(record, { fallback: 'Sin asignar' })).toBe('Sin asignar');
  });
});

describe('operatorHelpers - getDisplayOperatorName', () => {
  it('Caso A: beneficiary con assignedOperatorName debe tener prioridad', () => {
    const beneficiary = { assignedOperatorName: 'Carolina González' };
    const record = { operatorName: 'Sara López' };
    const assignment = { operator: 'María Teresa' };
    
    expect(getDisplayOperatorName(beneficiary, record, assignment)).toBe('Carolina González');
  });
  
  it('Caso B: sin asignado pero record.operatorName presente debe mostrarse', () => {
    const beneficiary = {};
    const record = { operatorName: 'Sara López' };
    const assignment = null;
    
    expect(getDisplayOperatorName(beneficiary, record, assignment)).toBe('Sara López');
  });
  
  it('Caso B2: record.operatorName con resultado debe rechazarse', () => {
    const beneficiary = {};
    const record = { operatorName: 'Llamado exitoso' };
    const assignment = null;
    
    expect(getDisplayOperatorName(beneficiary, record, assignment)).toBe('No asignado');
  });
  
  it('Caso C: match por assignment debe mostrarse', () => {
    const beneficiary = {};
    const record = {};
    const assignment = { operator: 'María González' };
    
    expect(getDisplayOperatorName(beneficiary, record, assignment)).toBe('María González');
  });
  
  it('Caso D: ninguno debe mostrar "No asignado"', () => {
    const beneficiary = {};
    const record = {};
    const assignment = null;
    
    expect(getDisplayOperatorName(beneficiary, record, assignment)).toBe('No asignado');
  });
  
  it('debe rechazar resultado en assignment.operator', () => {
    const beneficiary = {};
    const record = {};
    const assignment = { operator: 'No contesta' };
    
    expect(getDisplayOperatorName(beneficiary, record, assignment)).toBe('No asignado');
  });
});

describe('operatorHelpers - normalizeOperatorFields', () => {
  it('debe normalizar campos correctamente', () => {
    const record = {
      operatorId: 'op123',
      operatorName: 'Carolina González'
    };
    
    const result = normalizeOperatorFields(record);
    expect(result.operatorId).toBe('op123');
    expect(result.operatorName).toBe('Carolina González');
  });
  
  it('debe rechazar resultado en operatorName', () => {
    const record = {
      operatorId: 'op123',
      operatorName: 'Llamado exitoso'
    };
    
    const result = normalizeOperatorFields(record);
    expect(result.operatorId).toBe('op123');
    expect(result.operatorName).toBe('Sin asignar');
  });
  
  it('debe manejar campos vacíos', () => {
    const record = {};
    
    const result = normalizeOperatorFields(record);
    expect(result.operatorId).toBe('');
    expect(result.operatorName).toBe('Sin asignar');
  });
  
  it('debe buscar en campos alternativos', () => {
    const record = {
      operadorId: 'op456',
      teleoperadora: 'Sara López'
    };
    
    const result = normalizeOperatorFields(record);
    expect(result.operatorId).toBe('op456');
    expect(result.operatorName).toBe('Sara López');
  });
});
