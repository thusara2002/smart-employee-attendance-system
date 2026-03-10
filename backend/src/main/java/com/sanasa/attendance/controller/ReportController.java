package com.sanasa.attendance.controller;

import com.sanasa.attendance.dto.AttendanceDTO;
import com.sanasa.attendance.model.Attendance;
import com.sanasa.attendance.model.Employee;
import com.sanasa.attendance.repository.AttendanceRepository;
import com.sanasa.attendance.repository.EmployeeRepository;
import com.sanasa.attendance.service.AttendanceService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final AttendanceService attendanceService;
    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;

    public ReportController(AttendanceService attendanceService,
            AttendanceRepository attendanceRepository,
            EmployeeRepository employeeRepository) {
        this.attendanceService = attendanceService;
        this.attendanceRepository = attendanceRepository;
        this.employeeRepository = employeeRepository;
    }

    @GetMapping("/daily")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getDailyReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate targetDate = date != null ? date : LocalDate.now();

        Map<String, Object> report = new HashMap<>();
        report.put("date", targetDate);
        report.put("summary", attendanceService.getAttendanceSummary(targetDate));
        report.put("records", attendanceService.getAttendanceByDate(targetDate));

        return ResponseEntity.ok(report);
    }

    @GetMapping("/weekly")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getWeeklyReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate) {
        LocalDate start = startDate != null ? startDate
                : LocalDate.now().with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        LocalDate end = start.plusDays(6);

        Map<String, Object> report = new HashMap<>();
        report.put("startDate", start);
        report.put("endDate", end);

        // Daily summaries for the week
        List<AttendanceDTO.AttendanceSummary> dailySummaries = new ArrayList<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            dailySummaries.add(attendanceService.getAttendanceSummary(d));
        }
        report.put("dailySummaries", dailySummaries);
        report.put("records", attendanceService.getAttendanceByDateRange(start, end));

        return ResponseEntity.ok(report);
    }

    @GetMapping("/monthly")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getMonthlyReport(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        LocalDate now = LocalDate.now();
        int targetYear = year != null ? year : now.getYear();
        int targetMonth = month != null ? month : now.getMonthValue();

        LocalDate start = LocalDate.of(targetYear, targetMonth, 1);
        LocalDate end = start.with(TemporalAdjusters.lastDayOfMonth());

        Map<String, Object> report = new HashMap<>();
        report.put("year", targetYear);
        report.put("month", targetMonth);
        report.put("startDate", start);
        report.put("endDate", end);

        // Employee attendance summary
        List<Employee> employees = employeeRepository.findByActiveTrue();
        List<Map<String, Object>> employeeSummaries = new ArrayList<>();

        for (Employee emp : employees) {
            List<Attendance> records = attendanceRepository
                    .findByEmployeeIdAndDateBetween(emp.getEmployeeId(), start, end);

            Map<String, Object> empSummary = new HashMap<>();
            empSummary.put("employeeId", emp.getEmployeeId());
            empSummary.put("employeeName", emp.getFirstName() + " " + emp.getLastName());
            empSummary.put("department", emp.getDepartment());
            empSummary.put("totalDays", end.getDayOfMonth());
            empSummary.put("present", records.stream().filter(r -> r.getStatus() == Attendance.Status.PRESENT).count());
            empSummary.put("late", records.stream().filter(r -> r.getStatus() == Attendance.Status.LATE).count());
            empSummary.put("absent", end.getDayOfMonth() - records.size());
            empSummary.put("totalHours", records.stream().mapToDouble(Attendance::getWorkingHours).sum());

            employeeSummaries.add(empSummary);
        }

        report.put("employeeSummaries", employeeSummaries);

        return ResponseEntity.ok(report);
    }

    @GetMapping("/download")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<byte[]> downloadReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "csv") String format) {

        List<AttendanceDTO.AttendanceResponse> records = attendanceService.getAttendanceByDateRange(startDate, endDate);

        StringBuilder csv = new StringBuilder();
        csv.append("Date,Employee ID,Employee Name,Department,Check In,Check Out,Status,Working Hours\n");

        for (AttendanceDTO.AttendanceResponse record : records) {
            csv.append(String.format("%s,%s,%s,%s,%s,%s,%s,%.2f\n",
                    record.getDate(),
                    record.getEmployeeId(),
                    record.getEmployeeName(),
                    record.getDepartment(),
                    record.getCheckIn() != null ? record.getCheckIn().toLocalTime() : "",
                    record.getCheckOut() != null ? record.getCheckOut().toLocalTime() : "",
                    record.getStatus(),
                    record.getWorkingHours()));
        }

        byte[] content = csv.toString().getBytes();
        String filename = String.format("attendance_report_%s_to_%s.csv", startDate, endDate);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(content);
    }

    @GetMapping("/download-excel")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<byte[]> downloadExcelReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        List<AttendanceDTO.AttendanceResponse> records = attendanceService.getAttendanceByDateRange(startDate, endDate);

        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.xssf.usermodel.XSSFSheet sheet = workbook.createSheet("Attendance Report");

            // Create header style
            org.apache.poi.xssf.usermodel.XSSFCellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.xssf.usermodel.XSSFFont headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.LIGHT_BLUE.getIndex());
            headerStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            // Create header row
            String[] headers = { "Date", "Employee ID", "Employee Name", "Department", "Check In", "Check Out",
                    "Status", "Working Hours" };
            org.apache.poi.xssf.usermodel.XSSFRow headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.xssf.usermodel.XSSFCell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Create data rows
            int rowNum = 1;
            for (AttendanceDTO.AttendanceResponse record : records) {
                org.apache.poi.xssf.usermodel.XSSFRow row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(record.getDate() != null ? record.getDate().toString() : "");
                row.createCell(1).setCellValue(record.getEmployeeId() != null ? record.getEmployeeId() : "");
                row.createCell(2).setCellValue(record.getEmployeeName() != null ? record.getEmployeeName() : "");
                row.createCell(3).setCellValue(record.getDepartment() != null ? record.getDepartment() : "");
                row.createCell(4)
                        .setCellValue(record.getCheckIn() != null ? record.getCheckIn().toLocalTime().toString() : "");
                row.createCell(5).setCellValue(
                        record.getCheckOut() != null ? record.getCheckOut().toLocalTime().toString() : "");
                row.createCell(6).setCellValue(record.getStatus() != null ? record.getStatus().toString() : "");
                row.createCell(7).setCellValue(record.getWorkingHours());
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            // Write to byte array
            java.io.ByteArrayOutputStream outputStream = new java.io.ByteArrayOutputStream();
            workbook.write(outputStream);
            byte[] content = outputStream.toByteArray();

            String filename = String.format("attendance_report_%s_to_%s.xlsx", startDate, endDate);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                    .contentType(MediaType
                            .parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(content);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate Excel report: " + e.getMessage());
        }
    }

    @GetMapping("/download-excel/employee/{employeeId}")
    public ResponseEntity<byte[]> downloadEmployeeExcelReport(
            @PathVariable String employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        List<AttendanceDTO.AttendanceResponse> records = attendanceService.getEmployeeAttendanceByDateRange(employeeId,
                startDate, endDate);

        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.xssf.usermodel.XSSFSheet sheet = workbook.createSheet("My Attendance Report");

            // Create header style
            org.apache.poi.xssf.usermodel.XSSFCellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.xssf.usermodel.XSSFFont headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.LIGHT_BLUE.getIndex());
            headerStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            // Create header row
            String[] headers = { "Date", "Check In", "Check Out", "Status", "Working Hours" };
            org.apache.poi.xssf.usermodel.XSSFRow headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.xssf.usermodel.XSSFCell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Create data rows
            int rowNum = 1;
            for (AttendanceDTO.AttendanceResponse record : records) {
                org.apache.poi.xssf.usermodel.XSSFRow row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(record.getDate() != null ? record.getDate().toString() : "");
                row.createCell(1)
                        .setCellValue(record.getCheckIn() != null ? record.getCheckIn().toLocalTime().toString() : "");
                row.createCell(2).setCellValue(
                        record.getCheckOut() != null ? record.getCheckOut().toLocalTime().toString() : "");
                row.createCell(3).setCellValue(record.getStatus() != null ? record.getStatus().toString() : "");
                row.createCell(4).setCellValue(record.getWorkingHours());
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            // Write to byte array
            java.io.ByteArrayOutputStream outputStream = new java.io.ByteArrayOutputStream();
            workbook.write(outputStream);
            byte[] content = outputStream.toByteArray();

            String filename = String.format("my_attendance_%s_to_%s.xlsx", startDate, endDate);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                    .contentType(MediaType
                            .parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(content);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate Excel report: " + e.getMessage());
        }
    }

    @GetMapping("/department/{department}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getDepartmentReport(
            @PathVariable String department,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        List<Employee> deptEmployees = employeeRepository.findByDepartment(department);
        List<AttendanceDTO.AttendanceResponse> allRecords = attendanceService.getAttendanceByDateRange(startDate,
                endDate);

        List<AttendanceDTO.AttendanceResponse> deptRecords = allRecords.stream()
                .filter(r -> department.equals(r.getDepartment()))
                .collect(Collectors.toList());

        Map<String, Object> report = new HashMap<>();
        report.put("department", department);
        report.put("startDate", startDate);
        report.put("endDate", endDate);
        report.put("totalEmployees", deptEmployees.size());
        report.put("records", deptRecords);

        return ResponseEntity.ok(report);
    }
}
