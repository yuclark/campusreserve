package com.citbooking.backend.repository;

import com.citbooking.backend.model.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    long countByUserIdAndPresentTrue(Long userId);

    long countByUserIdAndPresentFalse(Long userId);

    List<Attendance> findByUserId(Long userId);
}
