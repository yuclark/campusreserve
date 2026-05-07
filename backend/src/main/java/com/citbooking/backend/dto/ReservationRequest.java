package com.citbooking.backend.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class ReservationRequest {
    private Long userId;
    private Long classroomId;
    private Long scheduleId;
    private LocalDate reservationDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String purpose;
    private Integer seatsReserved;
}
