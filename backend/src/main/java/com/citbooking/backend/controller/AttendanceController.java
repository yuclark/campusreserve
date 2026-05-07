package com.citbooking.backend.controller;

import com.citbooking.backend.service.AttendanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
@CrossOrigin(origins = { "http://localhost:5173", "http://localhost:3000" })
public class AttendanceController {

    @Autowired
    private AttendanceService attendanceService;

    /**
     * Get aggregated attendance stats for a user.
     * GET /api/attendance/user/{userId}/stats
     */
    @GetMapping("/user/{userId}/stats")
    public ResponseEntity<Map<String, Long>> getUserStats(@PathVariable Long userId) {
        Map<String, Long> stats = attendanceService.getUserAttendanceStats(userId);
        return ResponseEntity.ok(stats);
    }
}
