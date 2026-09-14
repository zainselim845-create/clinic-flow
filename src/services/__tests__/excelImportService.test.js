import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parsePatientsExcelFile } from '../excelImportService';

describe('excelImportService - Migration from Old Systems', () => {
  it('correctly parses Excel sheet with Arabic headers from old clinic software', async () => {
    const rawData = [
      { 'الاسم بالكامل': 'محمود عبد الرحيم', 'رقم المحمول': '01011223344', 'السن': 35, 'النوع': 'ذكر', 'فصيلة الدم': 'A+', 'التشخيص': 'فحص دوري', 'الملاحظات': 'القاهرة' },
      { 'الاسم بالكامل': 'منى إبراهيم سعد', 'رقم المحمول': '01233445566', 'السن': 29, 'النوع': 'أنثى', 'فصيلة الدم': 'B+', 'التشخيص': 'متابعة', 'الملاحظات': 'الجيزة' },
      { 'الاسم بالكامل': 'أحمد حسن', 'رقم المحمول': '01199887766', 'السن': 42, 'النوع': 'ذكر', 'فصيلة الدم': 'O+', 'التشخيص': 'علاج', 'الملاحظات': 'الإسكندرية' }
    ];

    const worksheet = XLSX.utils.json_to_sheet(rawData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const fileBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

    const result = await parsePatientsExcelFile(fileBuffer, 'test-clinic-1');

    expect(result.totalRead).toBe(3);
    expect(result.validCount).toBe(3);
    expect(result.duplicateCount).toBe(0);
    expect(result.patients[0].name).toBe('محمود عبد الرحيم');
    expect(result.patients[0].phone).toBe('01011223344');
    expect(result.patients[0].clinicId).toBe('test-clinic-1');
    expect(result.patients[1].name).toBe('منى إبراهيم سعد');
    expect(result.patients[1].gender).toBe('أنثى');
  });

  it('detects duplicates against existing clinic patients', async () => {
    const existing = [
      { id: 'p1', name: 'محمود عبد الرحيم', phone: '01011223344', clinicId: 'test-clinic-1' }
    ];

    const rawData = [
      { 'اسم المريض': 'محمود عبد الرحيم (مكرر)', 'الهاتف': '01011223344' },
      { 'اسم المريض': 'خالد كمال', 'الهاتف': '01555667788' }
    ];

    const worksheet = XLSX.utils.json_to_sheet(rawData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const fileBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

    const result = await parsePatientsExcelFile(fileBuffer, 'test-clinic-1', existing);

    expect(result.validCount).toBe(1);
    expect(result.duplicateCount).toBe(1);
    expect(result.patients[0].name).toBe('خالد كمال');
    expect(result.duplicates[0].patient.phone).toBe('01011223344');
  });

  it('throws helpful error on empty sheet or missing essential columns', async () => {
    const emptyWorkbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet([{ 'رقم تسلسلي': 1, 'رمز': 'abc' }]);
    XLSX.utils.book_append_sheet(emptyWorkbook, worksheet, 'Sheet1');
    const fileBuffer = XLSX.write(emptyWorkbook, { type: 'array', bookType: 'xlsx' });

    await expect(parsePatientsExcelFile(fileBuffer, 'test-clinic-1'))
      .rejects
      .toThrow('لم نتمكن من التعرف على أعمدة (الاسم) أو (رقم الهاتف)');
  });
});
