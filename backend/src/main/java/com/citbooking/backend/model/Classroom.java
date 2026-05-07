package com.citbooking.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "classroom")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Classroom {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long classroomId;

    @Column(nullable = false)
    private String buildingName;

    @Column(nullable = false)
    private Integer capacity;

    private String description;

    @Column(nullable = false)
    private String roomNumber;

    @Column(nullable = false)
    private String status = "available"; // available, occupied, maintenance
}
