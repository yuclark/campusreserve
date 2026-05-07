package com.citbooking.backend.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
@AllArgsConstructor
public class ReservationResponse {
    private Long reservationId;
    private Long userId;
    private String studentName;
    private String studentId;
    private Long classroomId;
    private String roomNumber;
    private String buildingName;
    private LocalDate reservationDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String purpose;
    private String status;
    private Integer seatsReserved;
}
