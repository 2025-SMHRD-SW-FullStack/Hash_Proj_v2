package com.ressol.ressol.point;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "point_account")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class PointAccount {

    @Id
    @Column(name = "user_id")
    private Long userId;          // = User.id (1:1)

    @Column(nullable = false)
    private long balance;         // 현재 잔액

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
