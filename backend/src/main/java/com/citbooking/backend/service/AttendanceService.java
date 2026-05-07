package com.citbooking.backend.service;

import com.citbooking.backend.model.Attendance;
import com.citbooking.backend.model.Reservation;
import com.citbooking.backend.model.User;
import com.citbooking.backend.repository.AttendanceRepository;
import com.citbooking.backend.repository.ReservationRepository;
import com.citbooking.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class AttendanceService {

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Record attendance for a reservation.
     * attendanceData: key = userId (String), value = present (Boolean).
     */
    public void recordAttendance(Long reservationId, Map<String, Boolean> attendanceData) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));

        for (Map.Entry<String, Boolean> entry : attendanceData.entrySet()) {
            Long userId = Long.parseLong(entry.getKey());
            Boolean present = entry.getValue();

            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found: " + userId));

            Attendance attendance = new Attendance();
            attendance.setReservation(reservation);
            attendance.setUser(user);
            attendance.setPresent(present != null && present);
            attendance.setRecordedAt(LocalDateTime.now());

            attendanceRepository.save(attendance);
        }
    }

    /**
     * Return total presents/absents for a user across all reservations.
     */
    public Map<String, Long> getUserAttendanceStats(Long userId) {
        long presentCount = attendanceRepository.countByUserIdAndPresentTrue(userId);
        long absentCount = attendanceRepository.countByUserIdAndPresentFalse(userId);

        Map<String, Long> stats = new HashMap<>();
        stats.put("presentCount", presentCount);
        stats.put("absentCount", absentCount);
        return stats;
    }
}
