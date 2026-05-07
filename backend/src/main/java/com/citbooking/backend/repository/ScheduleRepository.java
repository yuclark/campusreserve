package com.citbooking.backend.repository;

import com.citbooking.backend.model.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
    List<Schedule> findByClassroomId(Long classroomId);

    List<Schedule> findByDate(LocalDate date);
}
