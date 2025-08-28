package com.meonjeo.meonjeo.shipping;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

@Entity
@Table(name = "order_shipments",
        indexes = {
                @Index(name="idx_os_order_seller", columnList = "order_id,seller_id"),
                @Index(name="idx_os_tracking", columnList = "tracking_no")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrderShipment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="order_id", nullable=false)
    private Long orderId;

    @Column(name="seller_id", nullable=false)
    private Long sellerId;

    @Column(name="courier_code", length=64)
    private String courierCode;

    @Column(name="courier_name", length=64)
    private String courierName;

    @Column(name="tracking_no", length=64)
    private String trackingNo;

    @Column(name="created_at")
    private LocalDateTime createdAt;

    @Column(name="updated_at")
    private LocalDateTime updatedAt;

    @PrePersist void p1(){ createdAt = LocalDateTime.now(); updatedAt = createdAt; }
    @PreUpdate  void p2(){ updatedAt = LocalDateTime.now(); }
}
