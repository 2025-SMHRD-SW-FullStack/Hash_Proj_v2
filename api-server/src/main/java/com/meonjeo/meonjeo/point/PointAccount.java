package com.meonjeo.meonjeo.point;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name="point_accounts", uniqueConstraints=@UniqueConstraint(name="uk_point_user", columnNames={"user_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PointAccount {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @Column(name="user_id", nullable=false) private Long userId;
    @Column(name="balance", nullable=false) @Builder.Default private Long balance = 0L;

    @UpdateTimestamp private LocalDateTime updatedAt;
}
