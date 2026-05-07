package com.citbooking.backend.repository;

import com.citbooking.backend.model.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByUserId(Long userId);

    List<Reservation> findByStatus(String status);

    List<Reservation> findByClassroomId(Long classroomId);

    List<Reservation> findByReservationDateAndStatus(LocalDate reservationDate, String status);

    long countByUserIdAndStatus(Long userId, String status);

    @Query("SELECT r FROM Reservation r WHERE r.classroomId = :classroomId " +
            "AND r.reservationDate = :date " +
            "AND r.status != 'cancelled' " +
            "AND r.startTime < :endTime " +
            "AND r.endTime > :startTime")
    List<Reservation> findOverlappingReservations(
            @Param("classroomId") Long classroomId,
            @Param("date") LocalDate date,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime);
}