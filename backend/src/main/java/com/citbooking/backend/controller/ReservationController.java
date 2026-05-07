package com.citbooking.backend.controller;

import com.citbooking.backend.dto.ReservationRequest;
import com.citbooking.backend.dto.ReservationResponse;
import com.citbooking.backend.dto.UserDTO;
import com.citbooking.backend.model.Classroom;
import com.citbooking.backend.model.Reservation;
import com.citbooking.backend.model.User;
import com.citbooking.backend.repository.ClassroomRepository;
import com.citbooking.backend.repository.ReservationRepository;
import com.citbooking.backend.repository.UserRepository;
import com.citbooking.backend.service.AttendanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reservations")
@CrossOrigin(origins = { "http://localhost:5173", "http://localhost:3000" })
public class ReservationController {

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ClassroomRepository classroomRepository;

    @Autowired
    private AttendanceService attendanceService;

    @GetMapping
    public ResponseEntity<?> getAllReservations() {
        try {
            List<Reservation> reservations = reservationRepository.findAll();
            List<ReservationResponse> responses = mapToResponse(reservations);
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            System.err.println("Error fetching reservations: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error fetching reservations: " + e.getMessage());
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserReservations(@PathVariable Long userId) {
        try {
            List<Reservation> reservations = reservationRepository.findByUserId(userId);
            List<ReservationResponse> responses = mapToResponse(reservations);
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            System.err.println("Error fetching user reservations: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error fetching reservations: " + e.getMessage());
        }
    }

    @GetMapping("/pending")
    public ResponseEntity<?> getPendingReservations() {
        try {
            List<Reservation> reservations = reservationRepository.findByStatus("pending");
            List<ReservationResponse> responses = mapToResponse(reservations);
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            System.err.println("Error fetching pending reservations: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error fetching reservations: " + e.getMessage());
        }
    }

    @GetMapping("/today")
    public ResponseEntity<List<ReservationResponse>> getTodayReservations() {
        try {
            LocalDate today = LocalDate.now();
            List<Reservation> todayReservations = reservationRepository
                    .findByReservationDateAndStatus(today, "approved");
            List<ReservationResponse> responses = mapToResponse(todayReservations);
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            System.err.println("Error fetching today's reservations: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/suggest-room")
    public ResponseEntity<?> suggestRoom(@RequestBody Map<String, Object> request) {
        try {
            System.out.println("AI Suggestion request received: " + request);

            List<Classroom> classrooms = classroomRepository.findByStatus("available");

            if (classrooms.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("success", false, "message", "No available classrooms found"));
            }

            LocalDate suggestedDate = LocalDate.now().plusDays(1);
            while (suggestedDate.getDayOfWeek() == DayOfWeek.SUNDAY) {
                suggestedDate = suggestedDate.plusDays(1);
            }

            Map<String, Object> aiRequest = new HashMap<>();
            aiRequest.put("numPeople", request.get("numPeople"));
            aiRequest.put("preferredTime", request.get("preferredTime"));
            aiRequest.put("date", suggestedDate.toString());

            List<Map<String, Object>> roomData = classrooms.stream()
                    .map(room -> {
                        Map<String, Object> r = new HashMap<>();
                        r.put("classroomId", room.getClassroomId());
                        r.put("buildingName", room.getBuildingName());
                        r.put("roomNumber", room.getRoomNumber());
                        r.put("capacity", room.getCapacity());
                        return r;
                    })
                    .collect(Collectors.toList());

            aiRequest.put("availableRooms", roomData);

            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(aiRequest, headers);

            ResponseEntity<Map> aiResponse = restTemplate.postForEntity(
                    "http://localhost:5000/api/suggest-room",
                    entity,
                    Map.class);

            System.out.println("AI Response: " + aiResponse.getBody());

            Map<String, Object> responseBody = aiResponse.getBody();
            if (responseBody != null && responseBody.get("success") == Boolean.TRUE) {
                Map<String, Object> suggestion = (Map<String, Object>) responseBody.get("suggestion");
                if (suggestion != null && !suggestion.containsKey("date")) {
                    suggestion.put("date", suggestedDate.toString());
                }
            }

            return ResponseEntity.ok(responseBody);

        } catch (Exception e) {
            System.err.println("AI suggestion failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "AI suggestion failed: " + e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createReservation(@RequestBody ReservationRequest request) {
        try {
            System.out.println("Creating reservation: " + request);

            // 1. Validate user exists
            if (!userRepository.existsById(request.getUserId())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("User not found");
            }

            // 2. Validate classroom exists
            Classroom classroom = classroomRepository.findById(request.getClassroomId())
                    .orElseThrow(() -> new RuntimeException("Classroom not found"));

            LocalDate reservationDate = request.getReservationDate();
            LocalTime startTime = request.getStartTime();
            LocalTime endTime = request.getEndTime();

            // 3. Sunday check
            if (reservationDate.getDayOfWeek() == DayOfWeek.SUNDAY) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("Reservations are only allowed from Monday to Saturday.");
            }

            // 4. Operational hours check
            LocalTime schoolStart = LocalTime.of(7, 0);
            LocalTime schoolEnd = LocalTime.of(21, 0);
            if (startTime.isBefore(schoolStart) || endTime.isAfter(schoolEnd)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("Reservations are only allowed between 07:00 AM and 09:00 PM.");
            }

            // 5. End must be after start
            if (!endTime.isAfter(startTime)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("End time must be after start time.");
            }

            // 6. Seats range check (1-2 only)
            if (request.getSeatsReserved() < 1 || request.getSeatsReserved() > 2) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("You can only reserve between 1 and 2 seats per booking.");
            }

            // 7. FIX #1 — Max 2 PENDING reservations per student
            long pendingCount = reservationRepository.findByUserId(request.getUserId())
                    .stream()
                    .filter(r -> r.getStatus().equalsIgnoreCase("pending"))
                    .count();
            if (pendingCount >= 2) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("You already have 2 pending reservations. Please wait for them to be resolved before making a new one.");
            }

            // 8. FIX #2 — Overlap detection (same room, same date, overlapping time)
            List<Reservation> overlappingReservations = reservationRepository
                    .findByClassroomId(request.getClassroomId())
                    .stream()
                    .filter(r -> r.getReservationDate().equals(reservationDate))
                    .filter(r -> r.getStatus().equalsIgnoreCase("approved")
                            || r.getStatus().equalsIgnoreCase("pending"))
                    .filter(r -> {
                        LocalTime rStart = r.getStartTime();
                        LocalTime rEnd = r.getEndTime();
                        return startTime.isBefore(rEnd) && endTime.isAfter(rStart);
                    })
                    .collect(Collectors.toList());

            if (!overlappingReservations.isEmpty()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body("This time slot overlaps with an existing reservation in the same room. Please choose a different time.");
            }

            // 9. Room capacity check
            int reservedSeats = overlappingReservations.stream()
                    .mapToInt(Reservation::getSeatsReserved)
                    .sum();
            int availableSeats = classroom.getCapacity() - reservedSeats;
            if (request.getSeatsReserved() > availableSeats) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("Not enough seats available. Only " + availableSeats + " seats remaining.");
            }

            // All validations passed — save
            Reservation reservation = new Reservation();
            reservation.setUserId(request.getUserId());
            reservation.setClassroomId(request.getClassroomId());
            reservation.setScheduleId(request.getScheduleId());
            reservation.setReservationDate(reservationDate);
            reservation.setStartTime(startTime);
            reservation.setEndTime(endTime);
            reservation.setPurpose(request.getPurpose());
            reservation.setSeatsReserved(request.getSeatsReserved());
            reservation.setStatus("pending");

            Reservation saved = reservationRepository.save(reservation);
            System.out.println("Reservation created successfully: " + saved.getReservationId());
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            System.err.println("Error creating reservation: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to create reservation: " + e.getMessage());
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateReservationStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            String status = body.get("status");

            return reservationRepository.findById(id)
                    .map(reservation -> {
                        reservation.setStatus(status);
                        reservationRepository.save(reservation);
                        System.out.println("Reservation " + id + " status updated to: " + status);
                        return ResponseEntity.ok(reservation);
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            System.err.println("Error updating reservation status: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to update reservation: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteReservation(@PathVariable Long id) {
        try {
            if (!reservationRepository.existsById(id)) {
                return ResponseEntity.notFound().build();
            }
            reservationRepository.deleteById(id);
            System.out.println("Reservation deleted: " + id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            System.err.println("Error deleting reservation: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to delete reservation: " + e.getMessage());
        }
    }

    @GetMapping("/{reservationId}/attendees")
    public ResponseEntity<List<UserDTO>> getReservationAttendees(@PathVariable Long reservationId) {
        try {
            Reservation reservation = reservationRepository.findById(reservationId)
                    .orElseThrow(() -> new RuntimeException("Reservation not found"));

            User user = userRepository.findById(reservation.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            List<UserDTO> userDTOs = List.of(new UserDTO(
                    user.getId(),
                    user.getFullName(),
                    user.getStudentId()));

            return ResponseEntity.ok(userDTOs);
        } catch (Exception e) {
            System.err.println("Error fetching reservation attendees: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/attendance/{reservationId}")
    public ResponseEntity<String> recordAttendance(
            @PathVariable Long reservationId,
            @RequestBody Map<String, Boolean> attendanceData) {
        try {
            attendanceService.recordAttendance(reservationId, attendanceData);
            return ResponseEntity.ok("Attendance recorded successfully");
        } catch (Exception e) {
            System.err.println("Error recording attendance: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to record attendance: " + e.getMessage());
        }
    }

    @GetMapping("/available-seats/{classroomId}")
    public ResponseEntity<?> getAvailableSeats(
            @PathVariable Long classroomId,
            @RequestParam String date,
            @RequestParam String startTime,
            @RequestParam String endTime) {
        try {
            Classroom classroom = classroomRepository.findById(classroomId)
                    .orElseThrow(() -> new RuntimeException("Classroom not found"));

            int totalCapacity = classroom.getCapacity();

            LocalDate reservationDate = LocalDate.parse(date);
            LocalTime start = LocalTime.parse(startTime);
            LocalTime end = LocalTime.parse(endTime);

            List<Reservation> existingReservations = reservationRepository.findByClassroomId(classroomId)
                    .stream()
                    .filter(r -> r.getReservationDate().equals(reservationDate))
                    .filter(r -> r.getStatus().equalsIgnoreCase("approved")
                            || r.getStatus().equalsIgnoreCase("pending"))
                    .filter(r -> {
                        LocalTime rStart = r.getStartTime();
                        LocalTime rEnd = r.getEndTime();
                        return start.isBefore(rEnd) && end.isAfter(rStart);
                    })
                    .collect(Collectors.toList());

            int reservedSeats = existingReservations.stream()
                    .mapToInt(Reservation::getSeatsReserved)
                    .sum();

            int availableSeats = totalCapacity - reservedSeats;

            Map<String, Object> response = new HashMap<>();
            response.put("totalCapacity", totalCapacity);
            response.put("reservedSeats", reservedSeats);
            response.put("availableSeats", Math.max(0, availableSeats));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Error calculating available seats: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error calculating available seats: " + e.getMessage());
        }
    }

    @GetMapping("/week")
    public ResponseEntity<List<Map<String, Object>>> getWeekReservations() {
        try {
            LocalDate today = LocalDate.now();
            LocalDate weekStart = today.with(DayOfWeek.MONDAY);
            LocalDate weekEnd = weekStart.plusDays(6);

            List<Reservation> reservations = reservationRepository.findAll().stream()
                    .filter(r -> r.getStatus().equalsIgnoreCase("approved"))
                    .filter(r -> {
                        LocalDate rDate = r.getReservationDate();
                        return !rDate.isBefore(weekStart) && !rDate.isAfter(weekEnd);
                    })
                    .collect(Collectors.toList());

            List<Map<String, Object>> response = new ArrayList<>();
            for (Reservation reservation : reservations) {
                Map<String, Object> item = new HashMap<>();

                User user = userRepository.findById(reservation.getUserId()).orElse(null);
                Classroom classroom = classroomRepository.findById(reservation.getClassroomId()).orElse(null);

                item.put("reservationId", reservation.getReservationId());
                item.put("reservationDate", reservation.getReservationDate());
                item.put("startTime", reservation.getStartTime());
                item.put("endTime", reservation.getEndTime());
                item.put("purpose", reservation.getPurpose());
                item.put("seatsReserved", reservation.getSeatsReserved());
                item.put("status", reservation.getStatus());

                if (user != null) {
                    item.put("userId", user.getId());
                    item.put("studentName", user.getFullName());
                    item.put("studentId", user.getStudentId());
                }

                if (classroom != null) {
                    item.put("classroomId", classroom.getClassroomId());
                    item.put("buildingName", classroom.getBuildingName());
                    item.put("roomNumber", classroom.getRoomNumber());
                }

                response.add(item);
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/classroom/{classroomId}/week-attendees")
    public ResponseEntity<List<Map<String, Object>>> getClassroomWeekAttendees(@PathVariable Long classroomId) {
        try {
            LocalDate today = LocalDate.now();
            LocalDate weekStart = today.with(DayOfWeek.MONDAY);
            LocalDate weekEnd = weekStart.plusDays(6);

            List<Reservation> reservations = reservationRepository.findByClassroomId(classroomId).stream()
                    .filter(r -> r.getStatus().equalsIgnoreCase("approved"))
                    .filter(r -> {
                        LocalDate rDate = r.getReservationDate();
                        return !rDate.isBefore(weekStart) && !rDate.isAfter(weekEnd);
                    })
                    .collect(Collectors.toList());

            List<Map<String, Object>> response = new ArrayList<>();

            for (Reservation reservation : reservations) {
                User user = userRepository.findById(reservation.getUserId()).orElse(null);
                if (user != null) {
                    Map<String, Object> attendee = new HashMap<>();
                    attendee.put("reservationId", reservation.getReservationId());
                    attendee.put("userId", user.getId());
                    attendee.put("fullName", user.getFullName());
                    attendee.put("studentId", user.getStudentId());
                    attendee.put("reservationDate", reservation.getReservationDate());
                    attendee.put("startTime", reservation.getStartTime());
                    attendee.put("endTime", reservation.getEndTime());
                    attendee.put("purpose", reservation.getPurpose());
                    response.add(attendee);
                }
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private List<ReservationResponse> mapToResponse(List<Reservation> reservations) {
        List<ReservationResponse> responses = new ArrayList<>();

        for (Reservation res : reservations) {
            try {
                User user = userRepository.findById(res.getUserId()).orElse(null);
                Classroom classroom = classroomRepository.findById(res.getClassroomId()).orElse(null);

                responses.add(new ReservationResponse(
                        res.getReservationId(),
                        res.getUserId(),
                        user != null ? user.getFullName() : "Unknown",
                        user != null ? user.getStudentId() : "N/A",
                        res.getClassroomId(),
                        classroom != null ? classroom.getRoomNumber() : "Unknown",
                        classroom != null ? classroom.getBuildingName() : "Unknown",
                        res.getReservationDate(),
                        res.getStartTime(),
                        res.getEndTime(),
                        res.getPurpose(),
                        res.getStatus(),
                        res.getSeatsReserved()));
            } catch (Exception e) {
                System.err.println("Error mapping reservation " + res.getReservationId() + ": " + e.getMessage());
            }
        }

        return responses;
    }
}