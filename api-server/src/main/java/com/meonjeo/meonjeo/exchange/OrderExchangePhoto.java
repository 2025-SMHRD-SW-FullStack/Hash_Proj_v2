package com.meonjeo.meonjeo.exchange;

import jakarta.persistence.*;
import lombok.*;

@Getter @Setter
@Entity
@Table(name="order_exchange_photos")
public class OrderExchangePhoto {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name="exchange_id", nullable=false)
    private OrderExchange exchange;

    @Column(nullable=false, length=500)
    private String imageUrl; // S3/presigned 업로드 결과
}
