package com.citbooking.backend.controller;

import com.citbooking.backend.model.Classroom;
import com.citbooking.backend.model.Reservation;
import com.citbooking.backend.repository.ClassroomRepository;
import com.citbooking.backend.repository.ReservationRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.citbooking.backend.repository.ReservationRepository;
import com.citbooking.backend.model.Reservation;
import com.citbooking.backend.repository.ReservationRepository;
import com.citbooking.backend.model.Reservation;
import java.util.List;

import java.util.List;

import java.util.List;

@RestController
@RequestMapping("/api/classrooms")
@CrossOrigin(origins = { "http://localhost:5173", "http://localhost:3000" })
public class ClassroomController {

    @Autowired
    private ClassroomRepository classroomRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @GetMapping
    public ResponseEntity<List<Classroom>> getAllClassrooms() {
        return ResponseEntity.ok(classroomRepository.findAll());
    }

    @GetMapping("/available")
    public ResponseEntity<List<Classroom>> getAvailableClassrooms() {
        return ResponseEntity.ok(classroomRepository.findByStatus("available"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Classroom> getClassroom(@PathVariable Long id) {
        return classroomRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Classroom> createClassroom(@RequestBody Classroom classroom) {
        return ResponseEntity.ok(classroomRepository.save(classroom));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Classroom> updateClassroom(@PathVariable Long id, @RequestBody Classroom classroom) {
        if (!classroomRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        classroom.setClassroomId(id);
        return ResponseEntity.ok(classroomRepository.save(classroom));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteClassroom(@PathVariable Long id) {
        try {
            if (!classroomRepository.existsById(id)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body("Classroom not found");
            }

            // Step 1: Delete all reservations for this classroom
            List<Reservation> reservations = reservationRepository.findByClassroomId(id);
            if (!reservations.isEmpty()) {
                reservationRepository.deleteAll(reservations);
                System.out.println("Deleted " + reservations.size() + " reservations");
            }

            // Step 2: Delete all schedules for this classroom (if you have schedule table)
            // If you have ScheduleRepository, uncomment this:
            // List<Schedule> schedules = scheduleRepository.findByClassroomId(id);
            // scheduleRepository.deleteAll(schedules);

            // Step 3: Now delete the classroom
            classroomRepository.deleteById(id);

            return ResponseEntity.ok("Classroom deleted successfully");

        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("Error deleting classroom: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Cannot delete classroom: " + e.getMessage());
        }
    }
}
